import { won, SAV_CATS, savMeta, START_MONTH, addMonth, monthShort } from '../lib/constants.js'
import { sum, compute } from '../lib/compute.js'
import { LineChart } from './Charts.jsx'

export default function Savings({ d, data, monthKey, nav, onEditCard }) {
  const currOf = (cards, key) => (cards.find((c) => c.key === key)?.curr) || 0

  // '저번 달'은 직전 달(≥START)의 '이번 달'에서 자동 파생 (첫 달=0).
  const prevKey = addMonth(monthKey, -1)
  const usePrev = prevKey >= START_MONTH
  const prevCards = usePrev && data[prevKey] ? data[prevKey].savingsCards : []
  const cards = SAV_CATS.map((key) => ({
    key,
    curr: currOf(d.savingsCards, key),
    prev: usePrev ? currOf(prevCards, key) : 0,
  }))
  const totalAsset = sum(cards, (x) => x.curr)
  const assetGrowth = sum(cards, (x) => x.curr - x.prev)

  // 이월 추이: 데이터 있는 월(≥START)의 잔여금 누적합 (실데이터).
  const hasData = (mm) => mm && (mm.income.length || mm.expense.length || mm.savings.length)
  const lineMonths = Object.keys(data).filter((k) => k >= START_MONTH && hasData(data[k])).sort()
  let acc = 0
  const lineData = (lineMonths.length ? lineMonths : [monthKey]).map((k) => { acc += compute(data[k] || { income: [], expense: [], savings: [] }).remaining; return { m: monthShort(k), v: acc } })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 58px 10px 20px' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#191F28' }}>저축·투자</span>
        {nav}
      </div>

      <div style={{ margin: '4px 16px 0', background: '#191F28', borderRadius: 22, padding: 22, boxShadow: '0 6px 20px rgba(25,31,40,.18)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.6)' }}>누적 자산 (저축+투자+예비)</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', marginTop: 6, letterSpacing: '-.5px' }}>{won(totalAsset)}<span style={{ fontSize: 18 }}>원</span></div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, background: 'rgba(73,148,255,.22)', padding: '4px 10px', borderRadius: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#74B0FF' }}>{assetGrowth >= 0 ? '▲' : '▼'} {won(Math.abs(assetGrowth))} 이번 달</span>
        </div>
      </div>

      {cards.map((s) => {
        const delta = s.curr - s.prev
        const m = savMeta(s.key)
        return (
          <div key={s.key} className="press" onClick={() => onEditCard({ key: s.key, curr: s.curr, prev: s.prev })} style={{ margin: '12px 16px 0', background: '#fff', borderRadius: 18, padding: '18px 20px', boxShadow: '0 4px 16px rgba(30,50,90,.05)', cursor: 'pointer' }}>
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

      <div style={{ margin: '10px 16px 0', fontSize: 12, color: '#B0B8C1', textAlign: 'center' }}>카드를 탭하면 이번 달 금액을 수정할 수 있어요</div>

      <div style={{ margin: '14px 16px 0', background: '#fff', borderRadius: 22, padding: '20px 18px', boxShadow: '0 4px 16px rgba(30,50,90,.05)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', padding: '0 4px 4px' }}>월 잔여금 이월 추이</div>
        <div style={{ fontSize: 12, color: '#8B95A1', padding: '0 4px 8px' }}>매월 남은 금액이 누적된 추이예요</div>
        <LineChart data={lineData} />
      </div>
      <div style={{ height: 8 }} />
    </div>
  )
}
