import { useState } from 'react'

const overlay = { position: 'absolute', inset: 0, zIndex: 54, background: 'rgba(20,30,50,.4)', animation: 'fadeIn .2s' }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 55, background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(28px + env(safe-area-inset-bottom))', animation: 'sheetUp .32s cubic-bezier(.2,.85,.25,1)' }

export default function Settings({ mode, household, onClose }) {
  const [copied, setCopied] = useState(false)
  const code = household?.invite_code || ''

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch (_) {}
  }

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div style={sheet}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: '#E1E5E9', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#191F28', marginBottom: 18 }}>설정</div>

        {mode === 'cloud' ? (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8B95A1', marginBottom: 8 }}>배우자 초대 코드</div>
            <div style={{ background: '#F2F4F6', borderRadius: 14, padding: '18px 16px', textAlign: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, color: '#191F28' }}>{code}</span>
            </div>
            <div className="press" onClick={copy} style={{ textAlign: 'center', padding: 14, borderRadius: 13, background: '#E8F3FF', fontSize: 15, fontWeight: 700, color: '#3182F6' }}>{copied ? '복사됨 ✓' : '코드 복사하기'}</div>
            <div style={{ fontSize: 12, color: '#B0B8C1', marginTop: 12, lineHeight: 1.6, textAlign: 'center' }}>
              배우자가 앱에서 "초대 코드로 참여하기"에<br />이 코드를 입력하면 같은 가계부를 함께 써요.
            </div>
          </>
        ) : (
          <div style={{ background: '#FFF8E1', borderRadius: 14, padding: 16, fontSize: 13, color: '#8A6D3B', lineHeight: 1.6 }}>
            현재 <b>이 기기에만 저장</b>되는 모드예요. 부부가 함께 실시간으로 쓰려면 Supabase를 연결하세요. (README의 배포 가이드 참고)
          </div>
        )}

        <div className="press" onClick={onClose} style={{ marginTop: 20, textAlign: 'center', padding: 15, borderRadius: 14, background: '#F2F4F6', fontSize: 15, fontWeight: 700, color: '#4E5968' }}>닫기</div>
      </div>
    </>
  )
}
