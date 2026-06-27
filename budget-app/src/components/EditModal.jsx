import { useState } from 'react'
import { won, OWN, FCAT, CATS } from '../lib/constants.js'

const overlay = { position: 'absolute', inset: 0, zIndex: 52, background: 'rgba(20,30,50,.4)', animation: 'fadeIn .2s' }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 53, maxHeight: '88%', overflowY: 'auto', background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(28px + env(safe-area-inset-bottom))', animation: 'sheetUp .32s cubic-bezier(.2,.85,.25,1)' }
const labelStyle = { fontSize: 13, fontWeight: 600, color: '#8B95A1', marginBottom: 7 }
const inputStyle = { width: '100%', border: 'none', background: '#F2F4F6', borderRadius: 13, padding: '14px 16px', fontSize: 16, fontWeight: 600, color: '#191F28', outline: 'none' }

export default function EditModal({ target, onClose, onSave }) {
  const [e, setE] = useState(target)
  const set = (p) => setE((s) => ({ ...s, ...p }))

  const hasOwner = e.list !== 'savings'
  const hasKind = e.list === 'expense'
  const hasCat = e.list === 'expense' && e.kind === '고정'
  const ownerList = e.list === 'expense' ? ['이현', '혜원'] : ['이현', '혜원', '기타']
  const title = { income: '수입 수정', expense: '지출 수정', savings: '저축 수정' }[e.list]
  const amountText = e.amount ? won(parseInt((e.amount + '').replace(/[^\d]/g, '')) || 0) : ''

  const ownerStyle = (o, sel) => { const w = OWN[o]; return { flex: 1, textAlign: 'center', padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 700, ...(sel ? { background: w.bg, color: w.c, border: `1.5px solid ${w.c}` } : { background: '#F8FAFB', color: '#8B95A1', border: '1.5px solid transparent' }) } }

  const save = () => {
    const amt = parseInt((e.amount || '').toString().replace(/[^\d]/g, '')) || 0
    const patch = { title: e.name, amount: amt, memo: e.memo, owner: e.owner }
    if (e.list === 'expense') { patch.kind = e.kind; patch.cat = e.kind === '고정' ? e.cat : '' }
    onSave(e.list, e.id, patch)
  }

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div className="noscroll" style={sheet}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: '#E1E5E9', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#191F28', marginBottom: 18 }}>{title}</div>

        <div style={labelStyle}>항목명</div>
        <input value={e.name} onChange={(ev) => set({ name: ev.target.value })} style={{ ...inputStyle, marginBottom: 16 }} />

        <div style={labelStyle}>금액</div>
        <input value={amountText} onChange={(ev) => set({ amount: ev.target.value })} inputMode="numeric" style={{ ...inputStyle, fontSize: 18, fontWeight: 800, marginBottom: 16 }} />

        {hasOwner && (
          <>
            <div style={labelStyle}>담당</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {ownerList.map((o) => (
                <div key={o} className="press" onClick={() => set({ owner: o })} style={ownerStyle(o, e.owner === o)}>{o}</div>
              ))}
            </div>
          </>
        )}

        {hasKind && (
          <>
            <div style={labelStyle}>유형</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['고정', '변동'].map((k) => (
                <div key={k} className="press" onClick={() => set({ kind: k })} style={{ flex: 1, textAlign: 'center', padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 700, ...(e.kind === k ? { background: '#191F28', color: '#fff' } : { background: '#F2F4F6', color: '#8B95A1' }) }}>{k}</div>
              ))}
            </div>
          </>
        )}

        {hasCat && (
          <>
            <div style={labelStyle}>구분</div>
            <div className="noscroll" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {CATS.map((c) => { const col = FCAT[c]; const sel = e.cat === c; return (
                <div key={c} className="press" onClick={() => set({ cat: c })} style={{ padding: '8px 13px', borderRadius: 11, fontSize: 13, fontWeight: 700, ...(sel ? { background: col, color: '#fff' } : { background: '#F2F4F6', color: '#4E5968' }) }}>{c}</div>
              )})}
            </div>
          </>
        )}

        <div style={labelStyle}>메모</div>
        <input value={e.memo} onChange={(ev) => set({ memo: ev.target.value })} placeholder="메모를 입력하세요 (선택)" style={{ ...inputStyle, fontSize: 15, fontWeight: 500 }} />

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <div className="press" onClick={onClose} style={{ flex: 1, textAlign: 'center', padding: 15, borderRadius: 14, background: '#F2F4F6', fontSize: 15, fontWeight: 700, color: '#4E5968' }}>취소</div>
          <div className="press" onClick={save} style={{ flex: 2, textAlign: 'center', padding: 15, borderRadius: 14, background: '#3182F6', fontSize: 15, fontWeight: 700, color: '#fff' }}>저장</div>
        </div>
      </div>
    </>
  )
}
