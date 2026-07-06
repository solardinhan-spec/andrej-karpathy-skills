import { useState } from 'react'
import { won, savMeta } from '../lib/constants.js'
import Keypad from './Keypad.jsx'

const overlay = { position: 'absolute', inset: 0, zIndex: 56, background: 'rgba(20,30,50,.4)', animation: 'fadeIn .2s' }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 57, background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(28px + env(safe-area-inset-bottom))', animation: 'sheetUp .32s cubic-bezier(.2,.85,.25,1)' }
const labelStyle = { fontSize: 13, fontWeight: 600, color: '#8B95A1', marginBottom: 7 }

// 카테고리의 '시작 잔액(현재 보유액)'을 설정. 누적 = 시작 잔액 + 월별 저축.
export default function BaseAssetModal({ card, onClose, onSave }) {
  const [amt, setAmt] = useState(String(card.base || ''))
  const m = savMeta(card.key)
  const digits = (amt + '').replace(/[^\d]/g, '')
  const key = (k) => setAmt(() => { let a = digits; if (k === '⌫') a = a.slice(0, -1); else if (a.length < 12) a = (a === '0' ? '' : a) + k; return a })

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={sheet}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: '#E1E5E9', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: m.bg }}>{m.emoji}</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#191F28' }}>{card.key} 시작 잔액</span>
        </div>
        <div style={{ fontSize: 12, color: '#B0B8C1', margin: '0 2px 16px' }}>앱 시작 전부터 가지고 있던 현재 보유액을 입력하세요. 이후 월별 저축이 이 위에 누적돼요.</div>

        <div style={labelStyle}>시작 잔액(현재 보유액)</div>
        <div style={{ background: '#F2F4F6', borderRadius: 13, padding: '14px 16px', marginBottom: 12, textAlign: 'right' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: digits ? '#191F28' : '#C5CCD3' }}>{digits ? won(parseInt(digits)) : '0'}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginLeft: 3 }}>원</span>
        </div>
        <Keypad onKey={key} />

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <div className="press" onClick={onClose} style={{ flex: 1, textAlign: 'center', padding: 15, borderRadius: 14, background: '#F2F4F6', fontSize: 15, fontWeight: 700, color: '#4E5968' }}>취소</div>
          <div className="press" onClick={() => onSave(card.key, parseInt(digits) || 0)} style={{ flex: 2, textAlign: 'center', padding: 15, borderRadius: 14, background: '#3182F6', fontSize: 15, fontWeight: 700, color: '#fff' }}>저장</div>
        </div>
      </div>
    </>
  )
}
