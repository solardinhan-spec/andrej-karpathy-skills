import { useState } from 'react'
import { won, OWN, FCAT, CATS, SAV_CATS, savMeta } from '../lib/constants.js'

const overlay = { position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(20,30,50,.4)', animation: 'fadeIn .2s' }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 51, background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(28px + env(safe-area-inset-bottom))', animation: 'sheetUp .32s cubic-bezier(.2,.85,.25,1)' }

export default function QuickModal({ onClose, onSave }) {
  const [q, setQ] = useState({ type: 'expense', amount: '', owner: '이현', title: '', kind: '변동', cat: '생활', memo: '' })
  const patch = (p) => setQ((s) => ({ ...s, ...p }))
  const key = (k) => setQ((s) => {
    let a = s.amount
    if (k === '⌫') a = a.slice(0, -1)
    else if (a.length < 9) a = (a === '0' ? '' : a) + k
    return { ...s, amount: a }
  })

  const ownerList = q.type === 'expense' ? ['이현', '혜원'] : q.type === 'income' ? ['이현', '혜원', '기타'] : []
  const isFixed = q.type === 'expense' && q.kind === '고정'
  const amtText = q.amount ? won(parseInt(q.amount)) : '0'
  const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫']

  const tabStyle = (t, col) => ({ flex: 1, textAlign: 'center', padding: 11, borderRadius: 9, fontSize: 15, fontWeight: 700, ...(q.type === t ? { background: '#fff', color: col, boxShadow: '0 1px 4px rgba(0,0,0,.08)' } : { color: '#8B95A1' }) })
  const ownerStyle = (o, sel) => { const w = OWN[o]; return { flex: 1, textAlign: 'center', padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 700, ...(sel ? { background: w.bg, color: w.c, border: `1.5px solid ${w.c}` } : { background: '#F8FAFB', color: '#8B95A1', border: '1.5px solid transparent' }) } }

  const save = () => {
    const amt = parseInt(q.amount || '0') || 0
    if (!amt) { onClose(); return }
    onSave({ ...q, amount: amt })
  }

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={sheet}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: '#E1E5E9', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', background: '#F2F4F6', borderRadius: 12, padding: 4, marginBottom: 16 }}>
          <div className="press" onClick={() => patch({ type: 'expense', cat: '생활' })} style={tabStyle('expense', '#F04452')}>지출</div>
          <div className="press" onClick={() => patch({ type: 'income' })} style={tabStyle('income', '#3182F6')}>수입</div>
          <div className="press" onClick={() => patch({ type: 'savings', cat: '저축' })} style={tabStyle('savings', '#845EF7')}>저축</div>
        </div>

        <div style={{ textAlign: 'center', padding: '2px 0 14px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1px', color: q.amount ? '#191F28' : '#C5CCD3' }}>{amtText}</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#191F28' }}>원</span>
          </div>
        </div>

        <input value={q.title} onChange={(e) => patch({ title: e.target.value })} placeholder="내용 (예: 마트 장보기)"
          style={{ width: '100%', border: 'none', background: '#F2F4F6', borderRadius: 12, padding: '13px 15px', fontSize: 15, fontWeight: 600, color: '#191F28', outline: 'none', marginBottom: 10 }} />

        {q.type === 'savings' && (
          <div className="noscroll" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
            {SAV_CATS.map((c) => { const sel = q.cat === c; const m = savMeta(c); return (
              <div key={c} className="press" onClick={() => patch({ cat: c })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 11, fontSize: 13, fontWeight: 700, ...(sel ? { background: '#191F28', color: '#fff' } : { background: '#F2F4F6', color: '#4E5968' }) }}>
                <span>{m.emoji}</span>{c}
              </div>
            )})}
          </div>
        )}

        {q.type === 'expense' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {['고정', '변동'].map((k) => (
              <div key={k} className="press" onClick={() => patch({ kind: k })} style={{ flex: 1, textAlign: 'center', padding: 10, borderRadius: 11, fontSize: 14, fontWeight: 700, ...(q.kind === k ? { background: '#191F28', color: '#fff' } : { background: '#F2F4F6', color: '#8B95A1' }) }}>{k}</div>
            ))}
          </div>
        )}

        {isFixed && (
          <div className="noscroll" style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
            {CATS.map((c) => { const col = FCAT[c]; const sel = q.cat === c; return (
              <div key={c} className="press" onClick={() => patch({ cat: c })} style={{ padding: '8px 13px', borderRadius: 11, fontSize: 13, fontWeight: 700, ...(sel ? { background: col, color: '#fff' } : { background: '#F2F4F6', color: '#4E5968' }) }}>{c}</div>
            )})}
          </div>
        )}

        {ownerList.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {ownerList.map((o) => (
              <div key={o} className="press" onClick={() => patch({ owner: o })} style={ownerStyle(o, q.owner === o)}>{o}</div>
            ))}
          </div>
        )}

        <input value={q.memo} onChange={(e) => patch({ memo: e.target.value })} placeholder="메모 (선택)"
          style={{ width: '100%', border: 'none', background: '#F2F4F6', borderRadius: 12, padding: '12px 15px', fontSize: 14, fontWeight: 500, color: '#191F28', outline: 'none', marginBottom: 14 }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {keypad.map((k) => (
            <div key={k} className="press" onClick={() => key(k)} style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#191F28', borderRadius: 14, background: '#F8FAFB' }}>{k}</div>
          ))}
        </div>

        <div className="press" onClick={save} style={{ marginTop: 16, textAlign: 'center', padding: 16, borderRadius: 15, fontSize: 16, fontWeight: 700, color: '#fff', background: '#3182F6', boxShadow: '0 6px 16px rgba(49,130,246,.32)' }}>저장하기</div>
      </div>
    </>
  )
}
