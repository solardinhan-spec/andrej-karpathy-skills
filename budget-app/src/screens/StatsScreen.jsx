import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RateRing, Donut } from '../ui';
import { totals, ownerExpense, formatKRW, formatNum, MONTHS, OWNERS } from '../store';

export default function StatsScreen({ ledger, month }) {
  const t = totals(month);
  const ihyeon = ownerExpense(month, '이현');
  const hyewon = ownerExpense(month, '혜원');

  const ownerDonut = [
    { name: '이현', value: ihyeon, color: OWNERS.이현.text },
    { name: '혜원', value: hyewon, color: OWNERS.혜원.text },
  ].filter(d => d.value > 0);

  const barData = MONTHS.map(m => ({
    name: `${Number(m.split('-')[1])}월`,
    지출: totals(ledger[m]).expense,
  }));
  const maxBar = Math.max(...barData.map(b => b.지출), 1);

  return (
    <div style={{ padding: '4px 16px 16px' }}>
      {/* 저축률 링 */}
      <div className="card" style={{ padding: 24, marginBottom: 12, textAlign: 'center' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px' }}>이번 달 저축률</h2>
        <RateRing pct={t.rate} label="수입 대비" />
        <p style={{ fontSize: 13, color: 'var(--sub)', margin: '16px 0 0' }}>
          저축 {formatKRW(t.savings)} / 수입 {formatKRW(t.income)}
        </p>
      </div>

      {/* 구성원별 지출 비중 */}
      <div className="card" style={{ padding: 22, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px' }}>구성원별 지출 비중</h2>
        {ownerDonut.length > 0 ? (
          <>
            <Donut data={ownerDonut} size={160} thickness={22}
              center={<>
                <span style={{ fontSize: 12, color: 'var(--sub)' }}>총지출</span>
                <span style={{ fontSize: 17, fontWeight: 800 }}>{formatNum(ihyeon + hyewon)}</span>
              </>} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 18 }}>
              {ownerDonut.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />
                  <span style={{ color: 'var(--sub)' }}>{d.name}</span>
                  <span style={{ fontWeight: 700 }}>{((d.value / (ihyeon + hyewon)) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </>
        ) : <p style={{ color: 'var(--faint)', textAlign: 'center', fontSize: 14 }}>지출 데이터가 없어요</p>}
      </div>

      {/* 월간 지출 비교 */}
      <div className="card" style={{ padding: '22px 10px 14px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', paddingLeft: 12 }}>월간 지출 비교</h2>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={barData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8B95A1' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#B0B8C1' }} tickLine={false} axisLine={false}
              tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : v} />
            <Tooltip formatter={v => formatKRW(v)} cursor={{ fill: '#F8F9FA' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #E5E8EB', fontSize: 13 }} />
            <Bar dataKey="지출" radius={[8, 8, 0, 0]} maxBarSize={44}>
              {barData.map((b, i) => (
                <Cell key={i} fill={b.지출 === maxBar ? '#3182F6' : '#C9D2DB'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
