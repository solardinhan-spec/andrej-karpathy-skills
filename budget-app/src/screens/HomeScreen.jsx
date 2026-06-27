import { Donut } from '../ui';
import { totals, ownerExpense, formatKRW, formatNum, OWNERS } from '../store';

export default function HomeScreen({ month }) {
  const t = totals(month);
  const ihyeon = ownerExpense(month, '이현');
  const hyewon = ownerExpense(month, '혜원');
  const maxOwner = Math.max(ihyeon, hyewon, 1);

  const donut = [
    { name: '고정지출', value: t.fixed, color: '#F04452' },
    { name: '변동지출', value: t.vary, color: '#FF8A3D' },
    { name: '저축', value: t.savings, color: '#845EF7' },
    { name: '남은금액', value: Math.max(t.remain, 0), color: '#3182F6' },
  ].filter(d => d.value > 0);

  return (
    <div style={{ padding: '4px 16px 16px' }}>
      {/* 남은 금액 */}
      <div className="card" style={{ padding: '24px 22px', marginBottom: 12 }}>
        <p style={{ fontSize: 14, color: 'var(--sub)', margin: 0 }}>이번 달 남은 금액</p>
        <p style={{ fontSize: 34, fontWeight: 800, margin: '6px 0 0', color: t.remain < 0 ? '#F04452' : 'var(--ink)' }}>
          {formatKRW(t.remain)}
        </p>
        <div style={{ display: 'flex', marginTop: 20, gap: 8 }}>
          {[
            { label: '총수입', value: t.income, color: '#3182F6' },
            { label: '총지출', value: t.expense, color: '#F04452' },
            { label: '저축', value: t.savings, color: '#845EF7' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: '#F8F9FA', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: 'var(--sub)', margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 14, fontWeight: 700, margin: '5px 0 0', color: s.color }}>{formatNum(s.value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 수입 배분 도넛 */}
      <div className="card" style={{ padding: 22, marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px' }}>수입 배분</h2>
        {donut.length > 0 ? (
          <>
            <Donut data={donut} size={170} thickness={24}
              center={<>
                <span style={{ fontSize: 12, color: 'var(--sub)' }}>총수입</span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{formatNum(t.income)}</span>
              </>} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', marginTop: 18 }}>
              {donut.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />
                  <span style={{ color: 'var(--sub)' }}>{d.name}</span>
                  <span style={{ fontWeight: 700 }}>{formatNum(d.value)}</span>
                </div>
              ))}
            </div>
          </>
        ) : <p style={{ color: 'var(--faint)', textAlign: 'center', fontSize: 14 }}>아직 데이터가 없어요</p>}
      </div>

      {/* 구성원별 지출 */}
      <div className="card" style={{ padding: 22 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px' }}>구성원별 지출</h2>
        {[['이현', ihyeon], ['혜원', hyewon]].map(([name, val]) => (
          <div key={name} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: OWNERS[name].text }}>{name}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{formatKRW(val)}</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: '#F2F4F6', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${val / maxOwner * 100}%`, background: OWNERS[name].text, borderRadius: 5 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
