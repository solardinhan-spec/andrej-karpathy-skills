import { useCallback, useEffect, useRef, useState } from 'react'
import { isCloud, supabase, configError } from './supabase.js'
import { MONTH_KEYS } from './constants.js'
import { buildSeed } from './seed.js'

const LOCAL_KEY = 'budget:data:v1'

const emptyMonth = () => ({ income: [], expense: [], savings: [], savingsCards: [] })

function blankData() {
  const out = {}
  for (const k of MONTH_KEYS) out[k] = emptyMonth()
  return out
}

function mapEntry(r) {
  return { id: r.id, owner: r.owner, kind: r.kind, cat: r.cat, title: r.title, amount: Number(r.amount) || 0, memo: r.memo || '' }
}

function groupRows(entries, cards) {
  const out = blankData()
  for (const e of entries) {
    if (!out[e.month]) out[e.month] = emptyMonth()
    if (out[e.month][e.type]) out[e.month][e.type].push(mapEntry(e))
  }
  for (const c of cards) {
    if (!out[c.month]) out[c.month] = emptyMonth()
    out[c.month].savingsCards.push({ key: c.key, prev: Number(c.prev) || 0, curr: Number(c.curr) || 0 })
  }
  return out
}

/**
 * Unified budget store. Returns the same API regardless of backend:
 *  - cloud  : Supabase (anonymous auth + shared household + realtime sync)
 *  - local  : on-device localStorage (single device)
 */
export function useBudget() {
  const [mode] = useState(isCloud ? 'cloud' : 'local')
  const [status, setStatus] = useState('loading') // loading | onboarding | ready | error
  const [household, setHousehold] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const hidRef = useRef(null)
  const inited = useRef(false)

  // ---------- LOCAL persistence helpers ----------
  const persistLocal = useCallback((next) => {
    setData(next)
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch (_) {}
  }, [])

  // ---------- CLOUD reload ----------
  const reloadCloud = useCallback(async (hid) => {
    const [ents, cards] = await Promise.all([
      supabase.from('entries').select('*').eq('household_id', hid).order('created_at', { ascending: true }),
      supabase.from('savings_cards').select('*').eq('household_id', hid).order('created_at', { ascending: true }),
    ])
    if (ents.error) throw ents.error
    setData(groupRows(ents.data || [], cards.data || []))
  }, [])

  const seedCloud = useCallback(async (hid) => {
    const seed = buildSeed()
    const entryRows = []
    const cardRows = []
    for (const [month, m] of Object.entries(seed)) {
      for (const t of ['income', 'expense', 'savings']) {
        for (const it of m[t]) {
          entryRows.push({ household_id: hid, month, type: t, owner: it.owner || null, kind: it.kind || null, cat: it.cat || null, title: it.title, amount: it.amount, memo: it.memo || '' })
        }
      }
      for (const c of m.savingsCards) cardRows.push({ household_id: hid, month, key: c.key, prev: 0, curr: c.curr })
    }
    await supabase.from('entries').insert(entryRows)
    await supabase.from('savings_cards').insert(cardRows)
  }, [])

  const subscribeCloud = useCallback((hid) => {
    const ch = supabase
      .channel('budget-' + hid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `household_id=eq.${hid}` }, () => reloadCloud(hid))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_cards', filter: `household_id=eq.${hid}` }, () => reloadCloud(hid))
      .subscribe()
    return ch
  }, [reloadCloud])

  // ---------- INIT ----------
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    let channel = null

    async function initLocal() {
      let parsed = null
      try { parsed = JSON.parse(localStorage.getItem(LOCAL_KEY)) } catch (_) {}
      if (!parsed) { parsed = buildSeed(); localStorage.setItem(LOCAL_KEY, JSON.stringify(parsed)) }
      setData(parsed)
      setStatus('ready')
    }

    async function initCloud() {
      if (configError || !supabase) {
        setError(configError || 'Supabase 설정을 확인해주세요.')
        setStatus('error')
        return
      }
      try {
        let { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          const { error: e } = await supabase.auth.signInAnonymously()
          if (e) throw e
        }
        const { data: mem, error: mErr } = await supabase
          .from('household_members')
          .select('household_id, households(id,name,invite_code)')
          .limit(1)
          .maybeSingle()
        if (mErr) throw mErr
        if (mem && mem.households) {
          const h = mem.households
          hidRef.current = h.id
          setHousehold(h)
          await reloadCloud(h.id)
          channel = subscribeCloud(h.id)
          setStatus('ready')
        } else {
          setStatus('onboarding')
        }
      } catch (e) {
        setError(e?.message || String(e))
        setStatus('error')
      }
    }

    if (mode === 'cloud') initCloud(); else initLocal()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [mode, reloadCloud, subscribeCloud])

  // ---------- HOUSEHOLD actions (cloud only) ----------
  const createHousehold = useCallback(async (name) => {
    const { data: h, error: e } = await supabase.rpc('create_household', { p_name: name || '우리집 가계부' })
    if (e) throw e
    const hh = Array.isArray(h) ? h[0] : h
    hidRef.current = hh.id
    await seedCloud(hh.id)
    setHousehold(hh)
    await reloadCloud(hh.id)
    subscribeCloud(hh.id)
    setStatus('ready')
  }, [seedCloud, reloadCloud, subscribeCloud])

  const joinHousehold = useCallback(async (code) => {
    const clean = (code || '').trim().toUpperCase()
    const { data: h, error: e } = await supabase.rpc('join_household', { p_code: clean })
    if (e) throw e
    const hh = Array.isArray(h) ? h[0] : h
    if (!hh) throw new Error('초대 코드를 찾을 수 없어요.')
    hidRef.current = hh.id
    setHousehold(hh)
    await reloadCloud(hh.id)
    subscribeCloud(hh.id)
    setStatus('ready')
  }, [reloadCloud, subscribeCloud])

  // ---------- MUTATIONS (mode-agnostic) ----------
  const addEntry = useCallback(async (month, type, item) => {
    if (mode === 'cloud') {
      const row = { household_id: hidRef.current, month, type, owner: item.owner || null, kind: item.kind || null, cat: item.cat || null, title: item.title, amount: item.amount, memo: item.memo || '' }
      const { data: ins, error: e } = await supabase.from('entries').insert(row).select().single()
      if (e) throw e
      await reloadCloud(hidRef.current)
      return ins.id
    }
    const id = item.id || ('n' + Date.now())
    setData((prev) => {
      const next = { ...prev, [month]: { ...prev[month], [type]: [...prev[month][type], { ...item, id }] } }
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch (_) {}
      return next
    })
    return id
  }, [mode, reloadCloud])

  const updateEntry = useCallback(async (month, type, id, patch) => {
    if (mode === 'cloud') {
      const { error: e } = await supabase.from('entries').update(patch).eq('id', id)
      if (e) throw e
      await reloadCloud(hidRef.current)
      return
    }
    setData((prev) => {
      const next = { ...prev, [month]: { ...prev[month], [type]: prev[month][type].map((x) => (x.id === id ? { ...x, ...patch } : x)) } }
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch (_) {}
      return next
    })
  }, [mode, reloadCloud])

  const deleteEntry = useCallback(async (month, type, id) => {
    if (mode === 'cloud') {
      const { error: e } = await supabase.from('entries').delete().eq('id', id)
      if (e) throw e
      await reloadCloud(hidRef.current)
      return
    }
    setData((prev) => {
      const next = { ...prev, [month]: { ...prev[month], [type]: prev[month][type].filter((x) => x.id !== id) } }
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch (_) {}
      return next
    })
  }, [mode, reloadCloud])

  // Upsert a savings asset card (저축 탭) identified by month + key.
  const updateSavingsCard = useCallback(async (month, key, patch) => {
    if (mode === 'cloud') {
      const hid = hidRef.current
      const { data: existing } = await supabase
        .from('savings_cards').select('id').eq('household_id', hid).eq('month', month).eq('key', key).maybeSingle()
      if (existing) {
        const { error: e } = await supabase.from('savings_cards').update(patch).eq('id', existing.id)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('savings_cards').insert({ household_id: hid, month, key, prev: patch.prev || 0, curr: patch.curr || 0 })
        if (e) throw e
      }
      await reloadCloud(hid)
      return
    }
    setData((prev) => {
      const cards = prev[month].savingsCards
      const exists = cards.some((c) => c.key === key)
      const nextCards = exists
        ? cards.map((c) => (c.key === key ? { ...c, ...patch } : c))
        : [...cards, { key, prev: patch.prev || 0, curr: patch.curr || 0 }]
      const next = { ...prev, [month]: { ...prev[month], savingsCards: nextCards } }
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch (_) {}
      return next
    })
  }, [mode, reloadCloud])

  return { mode, status, error, household, data, createHousehold, joinHousehold, addEntry, updateEntry, deleteEntry, updateSavingsCard }
}
