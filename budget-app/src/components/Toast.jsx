// Bottom toast with an optional action (e.g. 삭제 되돌리기).
export default function Toast({ message, actionLabel, onAction }) {
  return (
    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(96px + env(safe-area-inset-bottom))', zIndex: 60, background: '#191F28', color: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 24px rgba(0,0,0,.25)', animation: 'fadeIn .2s' }}>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{message}</span>
      {actionLabel && <span className="press" onClick={onAction} style={{ fontSize: 14, fontWeight: 800, color: '#74B0FF' }}>{actionLabel}</span>}
    </div>
  )
}
