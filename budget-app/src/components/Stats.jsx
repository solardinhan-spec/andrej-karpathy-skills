import { OWN, OWNERS, START_MONTH, monthShort } from '../lib/constants.js'
import { compute } from '../lib/compute.js'
import { Donut, Legend, Ring, CompareBars } from './Charts.jsx'

const card = { borderRadius: 22, padding: '20px 22px', background: '#fff', boxShadow: '0 4px 16px rgba(30,50,90,.05)' }

export default function Stats({ data, m, monthKey, nav, names }) {
  const label = (o) => (names && names[o]) || o
  const rate = m.income ? (m.savings / m.income) * 100 : 0
  const segFixed = OWNERS.map((o) => ({ label: label(o), value: m.byOwnerFixed[o] || 0, color: OWN[o].c }))
  const segVariable = OWNERS.map((o) => ({ label: label(o), value: m.byOwnerVariable[o] || 0, color: OWN[o].c }))

  // 월간 지출 비교: 데이터 있는 월 중 START~현재월에서 최근 3개월(현재 포함).
  const hasData = (d) => d && (d.income.length || d.expense.length || d.savings.length)
  let months = Object.keys(data).filter((k) => k >= START_MONTH && k <= monthKey && hasData(data[k]))
  if (!months.includes(monthKey)) months.push(monthKey)
  months = [...new Set(months)].sort().slice(-3)
  const values = months.map((k) => compute(data[k] || { income: [], expense: [], savings: [] }).expense)
  const labels = months.map(monthShort)
  const activeIdx = months.indexOf(monthKey)

  const ownerDonut = (title, segs) => (
    <div style={{ margin: '14px 16px 0', ...card }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ flexShrink: 0 }}><Donut segs={segs} size={120} stroke={22} /></div>
        <div style={{ flex: 1 }}><Legend items={segs} /></div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 58px 10px 20px' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#191F28' }}>통계</span>
        {nav}
      </div>

      <div style={{ margin: '4px 16px 0', ...card, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ flexShrink: 0 }}><Ring pct={rate} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#8B95A1' }}>이번 달 저축률</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3182F6', marginTop: 2 }}>{Math.round(rate * 10) / 10}%</div>
          <div style={{ fontSize: 13, color: '#4E5968', marginTop: 4 }}>수입의 일부를 저축·투자로 보냈어요</div>
        </div>
      </div>

      {ownerDonut('구성원별 고정지출 비중', segFixed)}
      {ownerDonut('구성원별 변동지출 비중', segVariable)}

      <div style={{ margin: '14px 16px 0', ...card }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 16 }}>월간 지출 비교</div>
        <CompareBars values={values} labels={labels} activeIdx={activeIdx} />
      </div>
      <div style={{ height: 8 }} />
    </div>
  )
}
