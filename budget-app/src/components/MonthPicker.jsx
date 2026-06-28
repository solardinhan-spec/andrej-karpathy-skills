import { useEffect, useRef } from 'react'
import { ALL_MONTHS, monthLabel } from '../lib/constants.js'

const overlay = { position: 'absolute', inset: 0, zIndex: 56, background: 'rgba(20,30,50,.4)', animation: 'fadeIn .2s' }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 57, maxHeight: '70%', overflowY: 'auto', background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', animation: 'sheetUp .32s cubic-bezier(.2,.85,.25,1)' }

export default function MonthPicker({ current, onSelect, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current && ref.current.querySelector('[data-cur="1"]')
    if (el) el.scrollIntoView({ block: 'center' })
  }, [])

  const years = {}
  ALL_MONTHS.forEach((mk) => { const y = mk.split('-')[0]; (years[y] = years[y] || []).push(mk) })

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div ref={ref} className="noscroll" style={sheet}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: '#E1E5E9', margin: '0 auto 14px', position: 'sticky', top: 0 }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#191F28', padding: '0 4px 12px' }}>월 선택</div>
        {Object.entries(years).map(([y, ms]) => (
          <div key={y}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#B0B8C1', padding: '8px 8px 4px' }}>{y}년</div>
            {ms.map((mk) => {
              const cur = mk === current
              return (
                <div key={mk} data-cur={cur ? '1' : '0'} className="press" onClick={() => onSelect(mk)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px', borderRadius: 12, marginBottom: 2, background: cur ? '#3182F6' : 'transparent' }}>
                  <span style={{ fontSize: 16, fontWeight: cur ? 800 : 600, color: cur ? '#fff' : '#191F28' }}>{monthLabel(mk)}</span>
                  {cur && (
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}
