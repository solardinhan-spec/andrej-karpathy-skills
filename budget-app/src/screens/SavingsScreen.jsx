import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { totals, formatKRW, formatNum, MONTHS } from '../store';

export default function SavingsScreen({ ledger, month }) {
  const cards = month.savingsCards || [];
  const totalAsset = cards.reduce((s, c) => s + c.curr, 0);
  const totalDelta = cards.reduce((s, c) => s + (c.curr - c.prev), 0);

  const lineData = MONTHS.map(m => ({
    name: `${Number(m.split('-')[1])}월`,
    잔여금: totals(ledger[m]).remain,
  }));

  return (
    <div style={{ padding: '4px 16px 16px' }}>
      {/* 누적 자산 */}
      <div style={{ background: '#191F28', borderRadius: 20, padding: '24px 22px', marginBottom: 12, color: '#fff' }}>
        <p style={{ fontSize: 14, color: '#8B95A1', margin: 0 }}>누적 자산</p>
        <p style={{ fontSize: 32, fontWeight: 800, margin: '6px 0 0' }}>{formatKRW(totalAsset)}</p>
        {totalDelta !== 0 && (
          <span style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 700, color: '#4ADE80', background: 'rgba(74,222,128,.15)', padding: '4px 10px', borderRadius: 10 }}>
            이번 달 +{formatNum(totalDelta)}
          </span>
        )}
      </div>

      {/* 항목별 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {cards.map(c => {
          const d = c.curr - c.prev;
          return (
            <div key={c.key} className="card" style={{ padding: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--sub)', margin: 0, fontWeight: 600 }}>{c.key}</p>
              <p style={{ fontSize: 18, fontWeight: 800, margin: '8px 0 4px' }}>{formatNum(c.curr)}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ color: 'var(--faint)' }}>{formatNum(c.prev)} →</span>
                <span style={{ fontWeight: 700, color: d > 0 ? '#3182F6' : d < 0 ? '#F04452' : 'var(--faint)' }}>
                  {d > 0 ? '+' : ''}{formatNum(d)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 월 잔여금 이월 */}
      <div className="card" style={{ padding: '20px 10px 14px' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', paddingLeft: 12 }}>월 잔여금 추이</h2>
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={lineData} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8B95A1' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#B0B8C1' }} tickLine={false} axisLine={false}
              tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : v} />
            <Tooltip formatter={v => formatKRW(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E5E8EB', fontSize: 13 }} />
            <Line type="monotone" dataKey="잔여금" stroke="#3182F6" strokeWidth={3} dot={{ r: 5, fill: '#3182F6' }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
