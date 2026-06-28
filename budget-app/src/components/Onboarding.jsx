import { useState } from 'react'

const btn = (primary) => ({ width: '100%', padding: 16, borderRadius: 15, fontSize: 16, fontWeight: 700, textAlign: 'center', ...(primary ? { background: '#3182F6', color: '#fff', boxShadow: '0 6px 16px rgba(49,130,246,.32)' } : { background: '#F2F4F6', color: '#4E5968' }) })
const input = { width: '100%', border: 'none', background: '#F2F4F6', borderRadius: 13, padding: '14px 16px', fontSize: 16, fontWeight: 600, color: '#191F28', outline: 'none' }

export default function Onboarding({ onCreate, onJoin }) {
  const [view, setView] = useState('home') // home | join
  const [name, setName] = useState('우리집 가계부')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const run = async (fn) => {
    setBusy(true); setErr('')
    try { await fn() } catch (e) { setErr(e?.message || String(e)) } finally { setBusy(false) }
  }

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px', gap: 14 }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💸</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#191F28' }}>우리집 가계부</div>
        <div style={{ fontSize: 14, color: '#8B95A1', marginTop: 6 }}>부부가 함께 쓰는 공유 가계부</div>
      </div>

      {view === 'home' ? (
        <>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="가계부 이름" style={input} />
          <div className="press" style={btn(true)} onClick={() => !busy && run(() => onCreate(name, true))}>{busy ? '만드는 중…' : '예시 데이터로 시작'}</div>
          <div className="press" style={btn(false)} onClick={() => !busy && run(() => onCreate(name, false))}>빈 가계부로 시작</div>
          <div style={{ height: 1, background: '#EDF0F2', margin: '4px 0' }} />
          <div className="press" style={{ ...btn(false), background: 'transparent', color: '#3182F6' }} onClick={() => setView('join')}>초대 코드로 참여하기</div>
        </>
      ) : (
        <>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="초대 코드 (예: ABC123)" maxLength={6}
            style={{ ...input, textAlign: 'center', letterSpacing: 4, fontSize: 22, fontWeight: 800 }} />
          <div className="press" style={btn(true)} onClick={() => !busy && code.trim() && run(() => onJoin(code))}>{busy ? '참여 중…' : '참여하기'}</div>
          <div className="press" style={btn(false)} onClick={() => { setView('home'); setErr('') }}>뒤로</div>
        </>
      )}

      {err && <div style={{ textAlign: 'center', fontSize: 13, color: '#F04452', marginTop: 4 }}>{err}</div>}
      <div style={{ textAlign: 'center', fontSize: 12, color: '#B0B8C1', marginTop: 8, lineHeight: 1.6 }}>
        가계부를 만든 뒤 설정에서 초대 코드를 확인해<br />배우자에게 알려주면 함께 쓸 수 있어요.
      </div>
    </div>
  )
}
