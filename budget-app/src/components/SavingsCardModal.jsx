import { useState } from 'react'
import { won, savMeta } from '../lib/constants.js'

const overlay = { position: 'absolute', inset: 0, zIndex: 56, background: 'rgba(20,30,50,.4)', animation: 'fadeIn .2s' }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 57, background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(28px + env(safe-area-inset-bottom))', animation: 'sheetUp .32s cubic-bezier(.2,.85,.25,1)' }
const labelStyle = { fontSize: 13, fontWeight: 600, color: '#8B95A1', marginBottom: 7 }
const inputStyle = { width: '100%', border: 'none', background: '#F2F4F6', borderRadius: 13, padding: '14px 16px', fontSize: 18, fontWeight: 800, color: '#191F28', outline: 'none' }

// Edit a savings asset card. Only '이번 달 금액'(curr) is editable;
// '저번 달' is shown read-only (auto-derived from the previous month).
export default function SavingsCardModal({ card, onClose, onSave }) {
  const [curr, setCurr] = useState(String(card.curr || ''))
  const m = savMeta(card.key)
  const num = (s) => parseInt((s || '').toString().replace(/[^\d]/g, '')) || 0

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={sheet}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: '#E1E5E9', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: m.bg }}>{m.emoji}</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#191F28' }}>{card.key} 수정</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFB', borderRadius: 13, padding: '13px 16px', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#8B95A1' }}>저번 달</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#8B95A1' }}>{won(card.prev || 0)}원</span>
        </div>
        <div style={{ fontSize: 12, color: '#B0B8C1', margin: '-6px 2px 16px' }}>저번 달 금액은 전월 '이번 달'에서 자동으로 이월돼요</div>

        <div style={labelStyle}>이번 달 금액</div>
        <input value={curr ? won(num(curr)) : ''} onChange={(e) => setCurr(e.target.value)} inputMode="numeric" placeholder="0" style={inputStyle} autoFocus />

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <div className="press" onClick={onClose} style={{ flex: 1, textAlign: 'center', padding: 15, borderRadius: 14, background: '#F2F4F6', fontSize: 15, fontWeight: 700, color: '#4E5968' }}>취소</div>
          <div className="press" onClick={() => onSave(card.key, { curr: num(curr) })} style={{ flex: 2, textAlign: 'center', padding: 15, borderRadius: 14, background: '#3182F6', fontSize: 15, fontWeight: 700, color: '#fff' }}>저장</div>
        </div>
      </div>
    </>
  )
}
