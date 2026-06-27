import { useState } from 'react'
import { won, LINE, SAV_CATS, savMeta } from '../lib/constants.js'
import { sum } from '../lib/compute.js'
import { LineChart } from './Charts.jsx'

const overlay = { position: 'absolute', inset: 0, zIndex: 52, background: 'rgba(20,30,50,.4)', animation: 'fadeIn .2s' }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 53, background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(28px + env(safe-area-inset-bottom))', animation: 'sheetUp .32s cubic-bezier(.2,.85,.25,1)' }
const inputStyle = { width: '100%', border: 'none', background: '#F2F4F6', borderRadius: 13, padding: '14px 16px', fontSize: 18, fontWeight: 800, color: '#191F28', outline: 'none' }
const labelStyle = { fontSize: 13, fontWeight: 600, color: '#8B95A1', marginBottom: 7 }

function CardEdit({ card, onClose, onSave }) {
  const [prev, setPrev] = useState(String(card.prev || ''))
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
        <div style={labelStyle}>저번 달 금액</div>
        <input value={prev ? won(num(prev)) : ''} onChange={(e) => setPrev(e.target.value)} inputMode="numeric" style={{ ...inputStyle, marginBottom: 16 }} />
        <div style={labelStyle}>이번 달 금액</div>
        <input value={curr ? won(num(curr)) : ''} onChange={(e) => setCurr(e.target.value)} inputMode="numeric" style={inputStyle} />
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <div className="press" onClick={onClose} style={{ flex: 1, textAlign: 'center', padding: 15, borderRadius: 14, background: '#F2F4F6', fontSize: 15, fontWeight: 700, color: '#4E5968' }}>취소</div>
          <div className="press" onClick={() => onSave(card.key, { prev: num(prev), curr: num(curr) })} style={{ flex: 2, textAlign: 'center', padding: 15, borderRadius: 14, background: '#3182F6', fontSize: 15, fontWeight: 700, color: '#fff' }}>저장</div>
        </div>
      </div>
    </>
  )
}

export default function Savings({ d, monthLabel, onSaveCard }) {
  const [editing, setEditing] = useState(null)

  // Always show the 5 fixed categories, merging any saved values by key.
  const existing = d.savingsCards || []
  const cards = SAV_CATS.map((key) => {
    const found = existing.find((c) => c.key === key)
    return { key, prev: found ? found.prev : 0, curr: found ? found.curr : 0 }
  })
  const totalAsset = sum(cards, (x) => x.curr)
  const assetGrowth = sum(cards, (x) => x.curr - x.prev)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 58px 10px 20px' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#191F28' }}>저축·투자</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#8B95A1' }}>{monthLabel}</span>
      </div>

      <div style={{ margin: '4px 16px 0', background: '#191F28', borderRadius: 22, padding: 22, boxShadow: '0 6px 20px rgba(25,31,40,.18)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>누적 자산 (저축+투자+예비)</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', marginTop: 6, letterSpacing: '-.5px' }}>{won(totalAsset)}<span style={{ fontSize: 18 }}>원</span></div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'rgba(73,148,255,.22)', padding: '4px 10px', borderRadius: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#74B0FF' }}>▲ {won(assetGrowth)} 이번 달</span>
        </div>
      </div>

      {cards.map((s) => {
        const delta = s.curr - s.prev
        const m = savMeta(s.key)
        return (
          <div key={s.key} className="press" onClick={() => setEditing(s)} style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 18, padding: '18px 20px', boxShadow: '0 4px 16px rgba(30,50,90,.05)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: m.bg }}>{m.emoji}</div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#191F28' }}>{s.key}</span>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, padding: '4px 9px', borderRadius: 8, ...(delta > 0 ? { background: '#E8F3FF', color: '#3182F6' } : delta < 0 ? { background: '#FFEAEC', color: '#F04452' } : { background: '#F2F4F6', color: '#8B95A1' }) }}>{(delta >= 0 ? '+' : '') + won(delta)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#8B95A1' }}>저번 달</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#8B95A1', marginTop: 3 }}>{won(s.prev)}</div>
              </div>
              <svg width="20" height="14" viewBox="0 0 20 14" style={{ margin: '0 4px' }}><path d="M2 7h14m0 0l-5-5m5 5l-5 5" stroke="#C5CCD3" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#3182F6', fontWeight: 600 }}>이번 달</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#191F28', marginTop: 3 }}>{won(s.curr)}</div>
              </div>
            </div>
          </div>
        )
      })}

      <div style={{ margin: '10px 16px 0', fontSize: 12, color: '#B0B8C1', textAlign: 'center' }}>카드를 탭하면 금액을 수정할 수 있어요</div>

      <div style={{ margin: '14px 16px 0', background: '#fff', borderRadius: 22, padding: '20px 18px', boxShadow: '0 4px 16px rgba(30,50,90,.05)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', padding: '0 4px 4px' }}>월 잔여금 이월 추이</div>
        <div style={{ fontSize: 12, color: '#8B95A1', padding: '0 4px 8px' }}>매월 남은 금액이 복리로 누적돼요</div>
        <LineChart data={LINE} />
      </div>
      <div style={{ height: 8 }} />

      {editing && <CardEdit card={editing} onClose={() => setEditing(null)} onSave={(key, patch) => { onSaveCard(key, patch); setEditing(null) }} />}
    </div>
  )
}
