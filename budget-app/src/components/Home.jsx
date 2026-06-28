import { won, OWN, OWNERS } from '../lib/constants.js'
import { Donut, Legend, OwnerBars } from './Charts.jsx'

const card = { borderRadius: 22, padding: '24px 22px', background: '#fff', boxShadow: '0 4px 16px rgba(30,50,90,.05)' }

export default function Home({ m, nav }) {
  const segHome = [
    { label: '고정지출', value: m.fixed, color: '#3182F6' },
    { label: '변동지출', value: m.variable, color: '#FF8A3D' },
    { label: '저축', value: m.savings, color: '#845EF7' },
    { label: '남은 금액', value: Math.max(0, m.remaining), color: '#DDE3EA' },
  ]
  const ownerRows = OWNERS.map((o) => { const w = OWN[o]; return { name: o, value: m.byOwner[o] || 0, c: w.c, bg: w.bg, initial: w.i } })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 20px 10px' }}>
        {nav}
      </div>

      <div style={{ margin: '6px 16px 0', ...card }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#8B95A1' }}>이번 달 남은 금액</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: '#191F28', letterSpacing: '-.5px' }}>{won(m.remaining)}</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#191F28' }}>원</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {[['총수입', won(m.income), '#3182F6'], ['총지출', won(m.expense), '#F04452'], ['저축', won(m.savings), '#845EF7']].map((s, i) => (
            <div key={i} style={{ flex: 1, background: '#F8FAFB', borderRadius: 14, padding: '13px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#8B95A1' }}>{s[0]}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: s[2], marginTop: 5 }}>{s[1]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: '14px 16px 0', ...card, padding: '20px 22px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 6 }}>수입 배분</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ flexShrink: 0 }}><Donut segs={segHome} size={128} stroke={24} /></div>
          <div style={{ flex: 1 }}><Legend items={segHome} /></div>
        </div>
      </div>

      <div style={{ margin: '14px 16px 0', ...card, padding: '20px 22px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#191F28', marginBottom: 16 }}>구성원별 지출</div>
        <OwnerBars rows={ownerRows} total={m.expense} />
      </div>
      <div style={{ height: 8 }} />
    </div>
  )
}
