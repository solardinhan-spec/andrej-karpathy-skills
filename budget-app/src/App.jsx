import { useRef, useState } from 'react'
import { useBudget, emptyMonth } from './lib/useBudget.js'
import { compute } from './lib/compute.js'
import { START_MONTH, END_MONTH, addMonth, monthLabel as fmtMonth, currentMonth, clampMonth } from './lib/constants.js'
import Home from './components/Home.jsx'
import MonthDetail from './components/MonthDetail.jsx'
import Savings from './components/Savings.jsx'
import Stats from './components/Stats.jsx'
import TabBar from './components/TabBar.jsx'
import MonthNav from './components/MonthNav.jsx'
import QuickModal from './components/QuickModal.jsx'
import EditModal from './components/EditModal.jsx'
import MonthPicker from './components/MonthPicker.jsx'
import Onboarding from './components/Onboarding.jsx'
import Settings from './components/Settings.jsx'
import Toast from './components/Toast.jsx'

function Center({ children }) {
  return <div className="app"><div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 28, color: '#8B95A1', fontSize: 15 }}>{children}</div></div>
}

export default function App() {
  const { mode, status, error, household, names, data, createHousehold, joinHousehold, addEntry, addEntries, updateEntry, deleteEntry, updateNames, resetData } = useBudget()

  const [tab, setTab] = useState('home')
  const [monthKey, setMonthKey] = useState(() => clampMonth(currentMonth()))
  const [big, setBig] = useState('income')
  const [expOwner, setExpOwner] = useState('전체')
  const [collapsed, setCollapsed] = useState({})
  const [quickOpen, setQuickOpen] = useState(false)
  const [edit, setEdit] = useState(null)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  if (status === 'loading') return <Center>불러오는 중…</Center>
  if (status === 'error') return <Center>문제가 발생했어요.<br />{error}</Center>
  if (status === 'onboarding') return <div className="app"><div className="scroll"><Onboarding onCreate={createHousehold} onJoin={joinHousehold} /></div></div>

  const mk = monthKey
  const d = data[mk] || emptyMonth()
  const m = compute(d)
  const monthLabel = fmtMonth(mk)

  const toggleCollapse = (b, owner) => {
    setCollapsed((c) => ({ ...c, [b + '|' + owner]: !c[b + '|' + owner] }))
  }

  const openEdit = (list, id) => {
    const item = d[list].find((x) => x.id === id)
    if (!item) return
    setEdit({ list, id, name: item.title, amount: String(item.amount), memo: item.memo || '', owner: item.owner, kind: item.kind || '변동', cat: item.cat || (list === 'savings' ? (item.title || '저축') : '생활') })
  }

  const showToast = (next) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const onDelete = (list, id) => {
    const item = d[list].find((x) => x.id === id)
    deleteEntry(mk, list, id)
    if (item) {
      const { id: _omit, ...fields } = item
      showToast({ message: '삭제됐어요', actionLabel: '되돌리기', onAction: () => { addEntry(mk, list, fields); setToast(null) } })
    }
  }


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
      await addEntry(mk, 'income', { owner: q.owner, title: q.title || ((names[q.owner] || q.owner) + ' 수입'), amount: q.amount, memo: q.memo || '' })
    } else {
      await addEntry(mk, 'savings', { owner: '공동', cat: q.cat || '저축', title: q.title || q.cat || '저축', amount: q.amount, memo: q.memo || '' })
    }
    setQuickOpen(false)
  }

  const saveEdit = async (list, id, patch) => { await updateEntry(mk, list, id, patch); setEdit(null) }

  // 전월 고정지출 불러오기 (기존 항목 보존, 중복 건너뜀)
  const onLoadFixed = async () => {
    const prevKey = addMonth(mk, -1)
    if (prevKey < START_MONTH) { showToast({ message: '이전 달이 없어요' }); return }
    const prev = data[prevKey] || emptyMonth()
    const prevFixed = prev.expense.filter((x) => x.kind === '고정')
    if (!prevFixed.length) { showToast({ message: '전월에 고정지출이 없어요' }); return }
    const here = new Set(d.expense.filter((x) => x.kind === '고정').map((x) => x.owner + '|' + x.title))
    const toAdd = prevFixed.filter((x) => !here.has(x.owner + '|' + x.title))
    if (!toAdd.length) { showToast({ message: '이미 모두 있어요' }); return }
    if (!window.confirm(`전월 고정지출 ${toAdd.length}건을 추가할까요? 기존 항목은 그대로 유지돼요.`)) return
    await addEntries(mk, 'expense', toAdd.map((x) => ({ owner: x.owner, kind: '고정', cat: x.cat || '', title: x.title, amount: x.amount, memo: x.memo || '' })))
    showToast({ message: `${toAdd.length}건을 추가했어요` })
  }

  const goPrev = () => setMonthKey((k) => clampMonth(addMonth(k, -1)))
  const goNext = () => setMonthKey((k) => clampMonth(addMonth(k, 1)))
  const canPrev = mk > START_MONTH
  const canNext = mk < END_MONTH
  const openPicker = () => setMonthPickerOpen(true)
  const navSm = <MonthNav label={monthLabel} onPrev={goPrev} onNext={goNext} canPrev={canPrev} canNext={canNext} onPick={openPicker} />
  const navLg = <MonthNav size="lg" label={monthLabel} onPrev={goPrev} onNext={goNext} canPrev={canPrev} canNext={canNext} onPick={openPicker} />

  const anyModalOpen = quickOpen || !!edit || showSettings || monthPickerOpen

  return (
    <div className="app">
      <div className="scroll">
        {tab === 'home' && <Home m={m} nav={navLg} names={names} />}
        {tab === 'month' && (
          <MonthDetail d={d} big={big} setBig={setBig} expOwner={expOwner} setExpOwner={setExpOwner}
            collapsed={collapsed} toggleCollapse={toggleCollapse}
            onEdit={openEdit} onDelete={onDelete} onAdd={onAddItem} nav={navSm} names={names} onLoadFixed={onLoadFixed} />
        )}
        {tab === 'savings' && <Savings d={d} data={data} monthKey={monthKey} nav={navSm} />}
        {tab === 'stats' && <Stats data={data} m={m} monthKey={monthKey} nav={navSm} names={names} />}
      </div>

      {/* settings button (모달 열릴 땐 숨김) */}
      {!anyModalOpen && (
        <div className="press" onClick={() => setShowSettings(true)}
          style={{ position: 'absolute', top: 'calc(10px + env(safe-area-inset-top))', right: 14, zIndex: 35, width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(30,50,90,.08)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="#4E5968" strokeWidth="1.8" /><path d="M19.4 13a1.7 1.7 0 00.4 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.4 1.7 1.7 0 00-1 1.5V19a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.4-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.4-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.4H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.4l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.4 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" stroke="#4E5968" strokeWidth="1.6" /></svg>
        </div>
      )}

      <TabBar tab={tab} setTab={setTab} />

      {/* FAB (모달 열릴 땐 숨김) */}
      {!anyModalOpen && (
        <div className="press" onClick={() => setQuickOpen(true)}
          style={{ position: 'absolute', right: 18, bottom: 'calc(88px + env(safe-area-inset-bottom))', zIndex: 31, width: 56, height: 56, borderRadius: '50%', background: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(49,130,246,.42)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></svg>
        </div>
      )}

      {toast && <Toast message={toast.message} actionLabel={toast.actionLabel} onAction={toast.onAction} />}

      {quickOpen && <QuickModal onClose={() => setQuickOpen(false)} onSave={saveQuick} names={names} />}
      {edit && <EditModal target={edit} onClose={() => setEdit(null)} onSave={saveEdit} names={names} />}
      {monthPickerOpen && <MonthPicker current={monthKey} onSelect={(k) => { setMonthKey(clampMonth(k)); setMonthPickerOpen(false) }} onClose={() => setMonthPickerOpen(false)} />}
      {showSettings && <Settings mode={mode} household={household} names={names} data={data} onUpdateNames={updateNames} onReset={resetData} onClose={() => setShowSettings(false)} />}
    </div>
  )
}
