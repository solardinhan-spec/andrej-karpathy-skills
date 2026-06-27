const PATHS = {
  home: (col, w) => `<path d="M3 11l9-7 9 7M5 10v9h5v-6h4v6h5v-9" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  month: (col, w) => `<rect x="3" y="4.5" width="18" height="16" rx="3" stroke="${col}" stroke-width="${w}" fill="none"/><path d="M3 9h18M8 2.5v4M16 2.5v4" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`,
  savings: (col, w) => `<path d="M4 11a7 6 0 1114 0v4a2 2 0 01-2 2h-1v2h-3v-2H9v2H6v-2a7 6 0 01-2-6z" stroke="${col}" stroke-width="${w}" fill="none" stroke-linejoin="round"/><circle cx="15" cy="10.5" r="1" fill="${col}"/>`,
  stats: (col, w) => `<path d="M5 19V10M12 19V5M19 19v-6" stroke="${col}" stroke-width="${w + 0.3}" fill="none" stroke-linecap="round"/>`,
}
const TABS = [['home', '홈'], ['month', '월별'], ['savings', '저축'], ['stats', '통계']]

export default function TabBar({ tab, setTab }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: '1px solid #EDF0F2', padding: '8px 8px calc(10px + env(safe-area-inset-bottom))' }}>
      <div style={{ display: 'flex' }}>
        {TABS.map((t) => {
          const a = tab === t[0]
          const col = a ? '#3182F6' : '#B0B8C1'
          return (
            <div key={t[0]} className="tabbtn" onClick={() => setTab(t[0])} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0' }}>
              <div style={{ height: 26, display: 'flex', alignItems: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: PATHS[t[0]](col, a ? 2.4 : 2) }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{t[1]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
