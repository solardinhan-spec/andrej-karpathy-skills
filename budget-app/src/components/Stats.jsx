import { OWN, OWNERS, MONTH_KEYS, MONTH_SHORT } from '../lib/constants.js'
import { compute } from '../lib/compute.js'
import { Donut, Legend, Ring, CompareBars } from './Charts.jsx'

const card = { borderRadius: 22, padding: '20px 22px', background: '#fff', boxShadow: '0 4px 16px rgba(30,50,90,.05)' }

export default function Stats({ data, m, monthIdx, monthLabel }) {
  const rate = m.income ? (m.savings / m.income) * 100 : 0
  const segOwner = OWNERS.map((o) => ({ label: o, value: m.byOwner[o] || 0, color: OWN[o].c }))
  const values = MONTH_KEYS.map((k) => compute(data[k]).expense)
  const labels = MONTH_KEYS.map((k) => MONTH_SHORT[k])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 58px 10px 20px' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#191F28' }}>통계</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#8B95A1' }}>{monthLabel}</span>
      </div>

      <div style={{ margin: '4px 16px 0', ...card, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ flexShrink: 0 }}><Ring pct={rate} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#8B95A1' }}>이번 달 저축률</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3182F6', marginTop: 2 }}>{Math.round(rate * 10) / 10}%</div>
          <div style={{ fontSize: 13, color: '#4E5968', marginTop: 4 }}>수입의 일부를 저축·투자로 보냈어요</div>
        </div>
      </div>

      <div style={{ margin: '14px 16px 0', ...card }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 8 }}>구성원별 지출 비중</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ flexShrink: 0 }}><Donut segs={segOwner} size={128} stroke={24} /></div>
          <div style={{ flex: 1 }}><Legend items={segOwner} /></div>
        </div>
      </div>

      <div style={{ margin: '14px 16px 0', ...card }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 16 }}>월간 지출 비교</div>
        <CompareBars values={values} labels={labels} activeIdx={monthIdx} />
      </div>
      <div style={{ height: 8 }} />
    </div>
  )
}
