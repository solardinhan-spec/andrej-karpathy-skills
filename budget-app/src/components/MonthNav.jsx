// Shared month switcher (◀ 라벨 ▶). size 'lg' = 홈 중앙용, 'sm' = 헤더 우측용.
export default function MonthNav({ label, onPrev, onNext, canPrev, canNext, onPick, size = 'sm' }) {
  const big = size === 'lg'
  const Arrow = ({ dir, on, can }) => (
    <div className="press" onClick={can ? on : undefined}
      style={{ width: big ? 30 : 26, height: big ? 30 : 26, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: can ? 1 : 0.25, cursor: can ? 'pointer' : 'default' }}>
      <svg width={big ? 9 : 8} height={big ? 16 : 14} viewBox="0 0 9 16">
        <path d={dir === 'prev' ? 'M8 1L1 8l7 7' : 'M1 1l7 7-7 7'} stroke="#8B95A1" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: big ? 14 : 2 }}>
      <Arrow dir="prev" on={onPrev} can={canPrev} />
      <span className="press" onClick={onPick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: big ? 17 : 14, fontWeight: big ? 700 : 600, color: big ? '#191F28' : '#8B95A1', minWidth: big ? 120 : 92, justifyContent: 'center', cursor: 'pointer' }}>
        {label}
        <svg width={big ? 11 : 9} height={big ? 11 : 9} viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" stroke={big ? '#191F28' : '#8B95A1'} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
      <Arrow dir="next" on={onNext} can={canNext} />
    </div>
  )
}
