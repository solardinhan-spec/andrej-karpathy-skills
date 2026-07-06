import { won, SAV_CATS, savMeta } from '../lib/constants.js'

const overlay = { position: 'absolute', inset: 0, zIndex: 54, background: 'rgba(20,30,50,.4)', animation: 'fadeIn .2s' }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 55, background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 16px calc(24px + env(safe-area-inset-bottom))', animation: 'sheetUp .32s cubic-bezier(.2,.85,.25,1)' }

// 카테고리별 '기존 자산(시작 잔액)' 목록 → 탭하면 해당 카테고리 입력.
export default function BaseListModal({ base = {}, onPick, onClose }) {
  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={sheet}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: '#E1E5E9', margin: '0 auto 14px' }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#191F28', padding: '0 4px 4px' }}>기존 자산 설정</div>
        <div style={{ fontSize: 12, color: '#8B95A1', padding: '0 4px 12px', lineHeight: 1.5 }}>앱 시작 전부터 보유한 자산을 카테고리별로 입력하세요. <b>'이번 달 남은 금액'에는 영향을 주지 않아요.</b></div>
        {SAV_CATS.map((key) => {
          const m = savMeta(key)
          return (
            <div key={key} className="press" onClick={() => onPick(key)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', borderRadius: 12, marginBottom: 2, background: '#F8FAFB' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: m.bg }}>{m.emoji}</div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#191F28' }}>{key}</span>
              <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color: (base[key] || 0) ? '#191F28' : '#B0B8C1' }}>{won(base[key] || 0)}원</span>
              <svg width="9" height="16" viewBox="0 0 9 16" style={{ marginLeft: 4 }}><path d="M1 1l7 7-7 7" stroke="#C5CCD3" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          )
        })}
        <div className="press" onClick={onClose} style={{ marginTop: 14, textAlign: 'center', padding: 15, borderRadius: 14, background: '#F2F4F6', fontSize: 15, fontWeight: 700, color: '#4E5968' }}>닫기</div>
      </div>
    </>
  )
}
