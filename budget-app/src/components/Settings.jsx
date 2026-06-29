import { useState } from 'react'
import { exportExcel } from '../lib/exportExcel.js'

const overlay = { position: 'absolute', inset: 0, zIndex: 54, background: 'rgba(20,30,50,.4)', animation: 'fadeIn .2s' }
const sheet = { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 55, maxHeight: '90%', overflowY: 'auto', background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(28px + env(safe-area-inset-bottom))', animation: 'sheetUp .32s cubic-bezier(.2,.85,.25,1)' }
const labelStyle = { fontSize: 13, fontWeight: 600, color: '#8B95A1', marginBottom: 7 }
const input = { width: '100%', border: 'none', background: '#F2F4F6', borderRadius: 12, padding: '12px 14px', fontSize: 15, fontWeight: 600, color: '#191F28', outline: 'none' }

export default function Settings({ mode, household, names, data, onUpdateNames, onReset, onClose }) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [m1, setM1] = useState(names?.이현 || '이현')
  const [m2, setM2] = useState(names?.혜원 || '혜원')
  const [savedName, setSavedName] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const code = household?.invite_code || ''

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch (_) {}
  }
  const onExport = async () => {
    setExporting(true)
    try { await exportExcel(data, names) } catch (e) { alert('내보내기에 실패했어요: ' + (e?.message || e)) } finally { setExporting(false) }
  }
  const saveNames = async () => {
    setSavingName(true)
    try { await onUpdateNames(m1, m2); setSavedName(true); setTimeout(() => setSavedName(false), 1500) } catch (e) { alert('이름 변경 실패: ' + (e?.message || e)) } finally { setSavingName(false) }
  }
  const forceUpdate = async () => {
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) || []
      await Promise.all(regs.map((r) => r.update()))
      if (window.caches) { const ks = await caches.keys(); await Promise.all(ks.map((k) => caches.delete(k))) }
    } catch (_) {}
    location.reload()
  }

  const doReset = async () => {
    setResetting(true)
    try { await onReset(); setConfirmReset(false); onClose() } catch (e) { alert('초기화 실패: ' + (e?.message || e)) } finally { setResetting(false) }
  }

  return (
    <>
      <div style={overlay} onClick={onClose} />
      <div className="noscroll" style={sheet}>
        <div style={{ width: 38, height: 4, borderRadius: 3, background: '#E1E5E9', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: '#191F28', marginBottom: 18 }}>설정</div>

        {/* 구성원 이름 */}
        <div style={labelStyle}>구성원 이름</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={m1} onChange={(e) => setM1(e.target.value)} placeholder="구성원 1" maxLength={6} style={input} />
          <input value={m2} onChange={(e) => setM2(e.target.value)} placeholder="구성원 2" maxLength={6} style={input} />
        </div>
        <div className="press" onClick={saveNames} style={{ textAlign: 'center', padding: 12, borderRadius: 12, background: '#E8F3FF', fontSize: 14, fontWeight: 700, color: '#3182F6' }}>{savingName ? '저장 중…' : savedName ? '저장됨 ✓' : '이름 저장'}</div>

        {/* 초대 코드 / 복구 */}
        {mode === 'cloud' && (
          <>
            <div style={{ height: 1, background: '#F2F4F6', margin: '20px 0' }} />
            <div style={labelStyle}>배우자 초대 · 복구 코드</div>
            <div style={{ background: '#F2F4F6', borderRadius: 14, padding: '18px 16px', textAlign: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, color: '#191F28' }}>{code}</span>
            </div>
            <div className="press" onClick={copy} style={{ textAlign: 'center', padding: 14, borderRadius: 13, background: '#E8F3FF', fontSize: 15, fontWeight: 700, color: '#3182F6' }}>{copied ? '복사됨 ✓' : '코드 복사하기'}</div>
            <div style={{ fontSize: 12, color: '#F08C00', marginTop: 12, lineHeight: 1.6, background: '#FFF8E1', borderRadius: 10, padding: '10px 12px' }}>
              ⚠️ 이 코드를 꼭 안전한 곳에 저장하세요. 배우자 참여뿐 아니라, <b>기기 변경·앱 삭제 후 다시 접속</b>할 때도 이 코드로 같은 가계부에 들어올 수 있어요.
            </div>
          </>
        )}
        {mode !== 'cloud' && (
          <div style={{ marginTop: 16, background: '#FFF8E1', borderRadius: 14, padding: 16, fontSize: 13, color: '#8A6D3B', lineHeight: 1.6 }}>
            현재 <b>이 기기에만 저장</b>되는 모드예요. 부부가 함께 실시간으로 쓰려면 Supabase를 연결하세요. (README 참고)
          </div>
        )}

        {/* 내보내기 / 최신화 */}
        <div style={{ height: 1, background: '#F2F4F6', margin: '20px 0' }} />
        <div className="press" onClick={onExport} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 15, borderRadius: 14, background: '#EAF7EE', fontSize: 15, fontWeight: 700, color: '#1B9E54' }}>
          <span>📊</span>{exporting ? '내보내는 중…' : '엑셀로 내보내기'}
        </div>
        <div className="press" onClick={forceUpdate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, padding: 15, borderRadius: 14, background: '#EEF3FF', fontSize: 15, fontWeight: 700, color: '#3182F6' }}>
          <span>🔄</span>앱 최신화(최신 버전 받기)
        </div>
        <div style={{ fontSize: 12, color: '#B0B8C1', marginTop: 6, textAlign: 'center' }}>화면이 예전 버전 같으면 눌러 최신화하세요</div>

        {/* 초기화 */}
        {!confirmReset ? (
          <div className="press" onClick={() => setConfirmReset(true)} style={{ marginTop: 10, textAlign: 'center', padding: 15, borderRadius: 14, background: '#FFF1F2', fontSize: 14, fontWeight: 700, color: '#F04452' }}>전체 데이터 초기화</div>
        ) : (
          <div style={{ marginTop: 10, background: '#FFF1F2', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#F04452', marginBottom: 6 }}>정말 초기화할까요?</div>
            <div style={{ fontSize: 13, color: '#B0452F', lineHeight: 1.6, marginBottom: 12 }}>모든 수입·지출·저축 기록이 <b>영구 삭제</b>되며 되돌릴 수 없어요. 먼저 백업을 권장해요.</div>
            <div className="press" onClick={onExport} style={{ textAlign: 'center', padding: 12, borderRadius: 11, background: '#fff', fontSize: 14, fontWeight: 700, color: '#1B9E54', marginBottom: 8 }}>📊 엑셀로 백업하기</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="press" onClick={() => setConfirmReset(false)} style={{ flex: 1, textAlign: 'center', padding: 13, borderRadius: 11, background: '#fff', fontSize: 14, fontWeight: 700, color: '#4E5968' }}>취소</div>
              <div className="press" onClick={doReset} style={{ flex: 1, textAlign: 'center', padding: 13, borderRadius: 11, background: '#F04452', fontSize: 14, fontWeight: 700, color: '#fff' }}>{resetting ? '초기화 중…' : '초기화'}</div>
            </div>
          </div>
        )}

        <div className="press" onClick={onClose} style={{ marginTop: 14, textAlign: 'center', padding: 15, borderRadius: 14, background: '#F2F4F6', fontSize: 15, fontWeight: 700, color: '#4E5968' }}>닫기</div>
      </div>
    </>
  )
}
