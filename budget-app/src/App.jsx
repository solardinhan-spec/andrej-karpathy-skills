import { useState } from 'react'
import { useBudget } from './lib/useBudget.js'
import { compute } from './lib/compute.js'
import { MONTH_KEYS, MONTH_LABELS } from './lib/constants.js'
import Home from './components/Home.jsx'
import MonthDetail from './components/MonthDetail.jsx'
import Savings from './components/Savings.jsx'
import Stats from './components/Stats.jsx'
import TabBar from './components/TabBar.jsx'
import QuickModal from './components/QuickModal.jsx'
import EditModal from './components/EditModal.jsx'
import Onboarding from './components/Onboarding.jsx'
import Settings from './components/Settings.jsx'

function Center({ children }) {
  return <div className="app"><div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 28, color: '#8B95A1', fontSize: 15 }}>{children}</div></div>
}

export default function App() {
  const { mode, status, error, household, data, createHousehold, joinHousehold, addEntry, updateEntry, deleteEntry, updateSavingsCard } = useBudget()

  const [tab, setTab] = useState('home')
  const [monthIdx, setMonthIdx] = useState(0)
  const [big, setBig] = useState('income')
  const [expOwner, setExpOwner] = useState('전체')
  const [collapsed, setCollapsed] = useState({})
  const [swipeOpenId, setSwipeOpenId] = useState(null)
  const [quickOpen, setQuickOpen] = useState(false)
  const [edit, setEdit] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  if (status === 'loading') return <Center>불러오는 중…</Center>
  if (status === 'error') return <Center>문제가 발생했어요.<br />{error}</Center>
  if (status === 'onboarding') return <div className="app"><div className="scroll"><Onboarding onCreate={createHousehold} onJoin={joinHousehold} /></div></div>

  const mk = MONTH_KEYS[monthIdx]
  const d = data[mk]
  const m = compute(d)
  const monthLabel = MONTH_LABELS[mk]

  const toggleCollapse = (b, owner) => {
    setCollapsed((c) => ({ ...c, [b + '|' + owner]: !c[b + '|' + owner] }))
    setSwipeOpenId(null)
  }

  const openEdit = (list, id) => {
    const item = data[mk][list].find((x) => x.id === id)
    if (!item) return
    setSwipeOpenId(null)
    setEdit({ list, id, name: item.title, amount: String(item.amount), memo: item.memo || '', owner: item.owner, kind: item.kind || '변동', cat: item.cat || (list === 'savings' ? (item.title || '저축') : '생활') })
  }

  const onDelete = (list, id) => { deleteEntry(mk, list, id); setSwipeOpenId(null) }

  const onAddItem = async () => {
    let item
    if (big === 'income') item = { owner: '이현', title: '새 수입', amount: 0, memo: '' }
    else if (big === 'savings') item = { owner: '공동', cat: '저축', title: '저축', amount: 0, memo: '' }
    else item = { owner: '이현', kind: '변동', cat: '', title: '새 지출', amount: 0, memo: '' }
    const id = await addEntry(mk, big, item)
    setEdit({ list: big, id, name: item.title, amount: String(item.amount), memo: '', owner: item.owner, kind: item.kind || '변동', cat: item.cat || (big === 'savings' ? '저축' : '생활') })
  }

  const saveQuick = async (q) => {
    if (q.type === 'expense') {
      await addEntry(mk, 'expense', { owner: q.owner, kind: q.kind, cat: q.kind === '고정' ? q.cat : '', title: q.title || (q.kind === '고정' ? q.cat : '지출'), amount: q.amount, memo: q.memo || '' })
    } else if (q.type === 'income') {
      await addEntry(mk, 'income', { owner: q.owner, title: q.title || (q.owner + ' 수입'), amount: q.amount, memo: q.memo || '' })
    } else {
      await addEntry(mk, 'savings', { owner: '공동', cat: q.cat || '저축', title: q.title || q.cat || '저축', amount: q.amount, memo: q.memo || '' })
    }
    setQuickOpen(false)
  }

  const saveEdit = async (list, id, patch) => { await updateEntry(mk, list, id, patch); setEdit(null) }

  return (
    <div className="app">
      <div className="scroll">
        {tab === 'home' && (
          <Home m={m} monthLabel={monthLabel}
            onPrev={() => { setMonthIdx(Math.max(0, monthIdx - 1)); setSwipeOpenId(null) }}
            onNext={() => { setMonthIdx(Math.min(MONTH_KEYS.length - 1, monthIdx + 1)); setSwipeOpenId(null) }}
            canPrev={monthIdx > 0} canNext={monthIdx < MONTH_KEYS.length - 1} />
        )}
        {tab === 'month' && (
          <MonthDetail d={d} big={big} setBig={setBig} expOwner={expOwner} setExpOwner={setExpOwner}
            collapsed={collapsed} toggleCollapse={toggleCollapse} swipeOpenId={swipeOpenId} setSwipeOpenId={setSwipeOpenId}
            onEdit={openEdit} onDelete={onDelete} onAdd={onAddItem} monthLabel={monthLabel} />
        )}
        {tab === 'savings' && <Savings d={d} monthLabel={monthLabel} onSaveCard={(key, patch) => updateSavingsCard(mk, key, patch)} />}
        {tab === 'stats' && <Stats data={data} m={m} monthIdx={monthIdx} monthLabel={monthLabel} />}
      </div>

      {/* settings button */}
      <div className="press" onClick={() => setShowSettings(true)}
        style={{ position: 'absolute', top: 'calc(10px + env(safe-area-inset-top))', right: 14, zIndex: 35, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(30,50,90,.08)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#4E5968" strokeWidth="1.8" /><path d="M19.4 13a1.7 1.7 0 00.4 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.4 1.7 1.7 0 00-1 1.5V19a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.4-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.4-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.4H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.4l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.4 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" stroke="#4E5968" strokeWidth="1.6" /></svg>
      </div>

      <TabBar tab={tab} setTab={(t) => { setTab(t); setSwipeOpenId(null) }} />

      {/* FAB */}
      <div className="press" onClick={() => setQuickOpen(true)}
        style={{ position: 'absolute', right: 18, bottom: 'calc(88px + env(safe-area-inset-bottom))', zIndex: 31, width: 56, height: 56, borderRadius: '50%', background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(49,130,246,.42)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></svg>
      </div>

      {quickOpen && <QuickModal onClose={() => setQuickOpen(false)} onSave={saveQuick} />}
      {edit && <EditModal target={edit} onClose={() => setEdit(null)} onSave={saveEdit} />}
      {showSettings && <Settings mode={mode} household={household} data={data} onClose={() => setShowSettings(false)} />}
    </div>
  )
}
