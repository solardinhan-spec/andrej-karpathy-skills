import { useCallback, useEffect, useRef, useState } from 'react'
import { isCloud, supabase, configError } from './supabase.js'
import { MONTH_KEYS } from './constants.js'
import { buildSeed } from './seed.js'

const LOCAL_KEY = 'budget:data:v1'
const NAMES_KEY = 'budget:names'
const BASE_KEY = 'budget:base'
const BASE_MONTH = 'base' // savings_cards 재활용: month='base' 행이 카테고리별 시작 잔액

export const emptyMonth = () => ({ income: [], expense: [], savings: [] })

function blankData() {
  const out = {}
  for (const k of MONTH_KEYS) out[k] = emptyMonth()
  return out
}

function mapEntry(r) {
  return { id: r.id, owner: r.owner, kind: r.kind, cat: r.cat, title: r.title, amount: Number(r.amount) || 0, memo: r.memo || '' }
}

function groupRows(entries) {
  const out = blankData()
  for (const e of entries) {
    if (!out[e.month]) out[e.month] = emptyMonth()
    if (out[e.month][e.type]) out[e.month][e.type].push(mapEntry(e))
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
  const [memberNames, setMemberNames] = useState({ m1: '이현', m2: '혜원' })
  const [base, setBase] = useState({}) // 카테고리별 시작 잔액(현재 보유액)
  const hidRef = useRef(null)
  const inited = useRef(false)

  // ---------- LOCAL persistence helpers ----------
  const persistLocal = useCallback((next) => {
    setData(next)
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch (_) {}
  }, [])

  // ---------- CLOUD reload ----------
  const reloadCloud = useCallback(async (hid) => {
    const ents = await supabase.from('entries').select('*').eq('household_id', hid).order('created_at', { ascending: true })
    if (ents.error) throw ents.error
    setData(groupRows(ents.data || []))
  }, [])

  // 이름 컬럼은 마이그레이션 전이면 없을 수 있음 → 실패해도 앱은 정상 동작(기본 이름 유지).
  const loadNames = useCallback(async (hid) => {
    try {
      const r = await supabase.from('households').select('m1_name,m2_name').eq('id', hid).maybeSingle()
      if (!r.error && r.data) setMemberNames({ m1: r.data.m1_name || '이현', m2: r.data.m2_name || '혜원' })
    } catch (_) {}
  }, [])

  // 시작 잔액(현재 보유액) 로드 — savings_cards의 month='base' 행 재활용.
  const loadBase = useCallback(async (hid) => {
    try {
      const r = await supabase.from('savings_cards').select('key,curr').eq('household_id', hid).eq('month', BASE_MONTH)
      if (!r.error && r.data) { const m = {}; r.data.forEach((x) => { m[x.key] = Number(x.curr) || 0 }); setBase(m) }
    } catch (_) {}
  }, [])

  const seedCloud = useCallback(async (hid) => {
    const seed = buildSeed()
    const entryRows = []
    for (const [month, m] of Object.entries(seed)) {
      for (const t of ['income', 'expense', 'savings']) {
        for (const it of m[t]) {
          entryRows.push({ household_id: hid, month, type: t, owner: it.owner || null, kind: it.kind || null, cat: it.cat || null, title: it.title, amount: it.amount, memo: it.memo || '' })
        }
      }
    }
    await supabase.from('entries').insert(entryRows)
  }, [])

  const subscribeCloud = useCallback((hid) => {
    const ch = supabase
      .channel('budget-' + hid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `household_id=eq.${hid}` }, () => reloadCloud(hid))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_cards', filter: `household_id=eq.${hid}` }, () => loadBase(hid))
      .subscribe()
    return ch
  }, [reloadCloud, loadBase])

  // ---------- INIT ----------
  useEffect(() => {
    if (inited.current) return
    inited.current = true
    let channel = null

    async function initLocal() {
      let parsed = null
      try { parsed = JSON.parse(localStorage.getItem(LOCAL_KEY)) } catch (_) {}
      if (!parsed) { parsed = buildSeed(); localStorage.setItem(LOCAL_KEY, JSON.stringify(parsed)) }
      try { const n = JSON.parse(localStorage.getItem(NAMES_KEY)); if (n) setMemberNames(n) } catch (_) {}
      try { const bs = JSON.parse(localStorage.getItem(BASE_KEY)); if (bs) setBase(bs) } catch (_) {}
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
          await loadNames(h.id)
          await loadBase(h.id)
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
  }, [mode, reloadCloud, subscribeCloud, loadNames, loadBase])

  // ---------- HOUSEHOLD actions (cloud only) ----------
  const createHousehold = useCallback(async (name, withSeed = true) => {
    const { data: h, error: e } = await supabase.rpc('create_household', { p_name: name || '우리집 가계부' })
    if (e) throw e
    const hh = Array.isArray(h) ? h[0] : h
    hidRef.current = hh.id
    if (withSeed) await seedCloud(hh.id)
    setHousehold(hh)
    setMemberNames({ m1: hh.m1_name || '이현', m2: hh.m2_name || '혜원' })
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
      const cur = prev[month] || emptyMonth()
      const next = { ...prev, [month]: { ...cur, [type]: [...cur[type], { ...item, id }] } }
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch (_) {}
      return next
    })
    return id
  }, [mode, reloadCloud])

  // Bulk insert (전월 고정지출 불러오기 등).
  const addEntries = useCallback(async (month, type, items) => {
    if (!items || !items.length) return 0
    if (mode === 'cloud') {
      const rows = items.map((item) => ({ household_id: hidRef.current, month, type, owner: item.owner || null, kind: item.kind || null, cat: item.cat || null, title: item.title, amount: item.amount, memo: item.memo || '' }))
      const { error: e } = await supabase.from('entries').insert(rows)
      if (e) throw e
      await reloadCloud(hidRef.current)
      return items.length
    }
    setData((prev) => {
      const cur = prev[month] || emptyMonth()
      const added = items.map((item, i) => ({ ...item, id: 'n' + Date.now() + '_' + i }))
      const next = { ...prev, [month]: { ...cur, [type]: [...cur[type], ...added] } }
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch (_) {}
      return next
    })
    return items.length
  }, [mode, reloadCloud])

  const updateEntry = useCallback(async (month, type, id, patch) => {
    if (mode === 'cloud') {
      const { error: e } = await supabase.from('entries').update(patch).eq('id', id)
      if (e) throw e
      await reloadCloud(hidRef.current)
      return
    }
    setData((prev) => {
      const cur = prev[month] || emptyMonth()
      const next = { ...prev, [month]: { ...cur, [type]: cur[type].map((x) => (x.id === id ? { ...x, ...patch } : x)) } }
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
      const cur = prev[month] || emptyMonth()
      const next = { ...prev, [month]: { ...cur, [type]: cur[type].filter((x) => x.id !== id) } }
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(next)) } catch (_) {}
      return next
    })
  }, [mode, reloadCloud])

  // 구성원 이름 변경 (이현/혜원 슬롯의 표시 이름).
  const updateNames = useCallback(async (m1, m2) => {
    const n1 = (m1 || '').trim() || '이현'
    const n2 = (m2 || '').trim() || '혜원'
    if (mode === 'cloud') {
      const { error: e } = await supabase.rpc('set_member_names', { p_m1: n1, p_m2: n2 })
      if (e) throw e
      setHousehold((h) => (h ? { ...h, m1_name: n1, m2_name: n2 } : h))
    } else {
      try { localStorage.setItem(NAMES_KEY, JSON.stringify({ m1: n1, m2: n2 })) } catch (_) {}
    }
    setMemberNames({ m1: n1, m2: n2 })
  }, [mode])

  // 시작 잔액(현재 보유액) 설정 — savings_cards month='base' 재활용.
  const updateBase = useCallback(async (cat, amount) => {
    const amt = Number(amount) || 0
    if (mode === 'cloud') {
      const hid = hidRef.current
      const { data: existing } = await supabase.from('savings_cards').select('id').eq('household_id', hid).eq('month', BASE_MONTH).eq('key', cat).maybeSingle()
      if (existing) {
        const { error: e } = await supabase.from('savings_cards').update({ curr: amt }).eq('id', existing.id)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('savings_cards').insert({ household_id: hid, month: BASE_MONTH, key: cat, prev: 0, curr: amt })
        if (e) throw e
      }
      await loadBase(hid)
    } else {
      setBase((b) => { const next = { ...b, [cat]: amt }; try { localStorage.setItem(BASE_KEY, JSON.stringify(next)) } catch (_) {} return next })
    }
  }, [mode, loadBase])

  // 전체 데이터 초기화 (수입·지출·저축 전부 삭제).
  const resetData = useCallback(async () => {
    if (mode === 'cloud') {
      const hid = hidRef.current
      await supabase.from('entries').delete().eq('household_id', hid)
      await reloadCloud(hid)
    } else {
      const blank = blankData()
      setData(blank)
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(blank)) } catch (_) {}
    }
  }, [mode, reloadCloud])

  const names = { 이현: memberNames.m1, 혜원: memberNames.m2, 기타: '기타', 공동: '공동' }

  return { mode, status, error, household, names, base, data, createHousehold, joinHousehold, addEntry, addEntries, updateEntry, deleteEntry, updateNames, updateBase, resetData }
}
