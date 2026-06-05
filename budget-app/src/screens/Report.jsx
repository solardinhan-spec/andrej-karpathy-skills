import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  CATEGORIES,
  getMonthExpenses, getCategoryTotals, getTotalSpent,
  getCatLabel, formatKRW, formatMonth,
  calcVariable,
} from '../store';

const CUSTOM_TOOLTIP = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'white', border: '1px solid #E0D5C8', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {p.value.toLocaleString('ko-KR')}원</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Report({ expenses, budgetSettings, currentMonth, coupleMessages, onAddMessage }) {
  const monthExp = getMonthExpenses(expenses, currentMonth);
  const totals = getCategoryTotals(monthExp);
  const spent = getTotalSpent(monthExp);
  const variable = calcVariable(budgetSettings);
  const [msg, setMsg] = useState({ text: '', person: '이현' });
  const [msgSaved, setMsgSaved] = useState(false);

  const barData = CATEGORIES
    .filter(c => (budgetSettings.catBudget[c.id] || 0) > 0 || totals[c.id] > 0)
    .map(c => ({
      name: c.id,
      예산: budgetSettings.catBudget[c.id] || 0,
      실지출: totals[c.id] || 0,
      color: c.color,
    }));

  const pieData = CATEGORIES
    .filter(c => totals[c.id] > 0)
    .map(c => ({ name: getCatLabel(c.id), value: totals[c.id], color: c.color }));

  const savings_rate = ((budgetSettings.savings + budgetSettings.investment) / (budgetSettings.income.ihyeon + budgetSettings.income.hyewon) * 100).toFixed(1);
  const variable_rate = variable > 0 ? (spent / variable * 100).toFixed(0) : 0;

  function handleMsgSubmit(e) {
    e.preventDefault();
    if (!msg.text.trim()) return;
    onAddMessage({ ...msg, month: currentMonth, id: Date.now().toString() });
    setMsg(m => ({ ...m, text: '' }));
    setMsgSaved(true);
    setTimeout(() => setMsgSaved(false), 2000);
  }

  return (
    <div className="screen" style={{ padding: '0 14px 80px' }}>
      <div style={{ padding: '24px 0 16px' }}>
        <p style={{ fontSize: 12, color: '#9A8A7A', marginBottom: 4 }}>{formatMonth(currentMonth)}</p>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>📊 월별 리포트</h1>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: '총 변동지출', value: formatKRW(spent), sub: `예산의 ${variable_rate}% 사용`, ok: spent <= variable },
          { label: '절약 금액', value: formatKRW(Math.max(variable - spent, 0)), sub: variable - spent >= 0 ? '잔액 있음 🎉' : '예산 초과 😅', ok: variable - spent >= 0 },
          { label: '저축+투자', value: formatKRW(budgetSettings.savings + budgetSettings.investment), sub: `수입의 ${savings_rate}%`, ok: true },
          { label: '지출 건수', value: `${monthExp.length}건`, sub: `이현 ${monthExp.filter(e => e.person === '이현').length} / 혜원 ${monthExp.filter(e => e.person === '혜원').length}`, ok: true },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 11, color: '#9A8A7A', marginBottom: 4 }}>{item.label}</p>
            <p style={{ fontSize: 17, fontWeight: 800, color: item.ok ? '#1A1410' : '#D94040', marginBottom: 3 }}>{item.value}</p>
            <p style={{ fontSize: 11, color: item.ok ? '#5F8A6E' : '#E8A060' }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* 바 차트 */}
      <div className="card" style={{ padding: '14px 6px', marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, paddingLeft: 10, marginBottom: 12 }}>예산 vs 실지출</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} barGap={3} margin={{ top: 0, right: 8, left: -22, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9A8A7A' }} tickLine={false} axisLine={false} interval={0} />
            <YAxis tick={{ fontSize: 8, fill: '#B0A090' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
            <Tooltip content={<CUSTOM_TOOLTIP />} />
            <Bar dataKey="예산" fill="#E0D5C8" radius={[3, 3, 0, 0]} maxBarSize={16} />
            <Bar dataKey="실지출" radius={[3, 3, 0, 0]} maxBarSize={16}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.실지출 > entry.예산 ? '#D94040' : entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 4 }}>
          {[['#E0D5C8', '예산'], ['#C0622A', '실지출']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9A8A7A' }}>
              <div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />{l}
            </div>
          ))}
        </div>
      </div>

      {/* 도넛 차트 */}
      {pieData.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>카테고리 비중</h2>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={v => `${v.toLocaleString('ko-KR')}원`} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 커플 한마디 */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>💬 커플 한마디</h2>
        <p style={{ fontSize: 12, color: '#9A8A7A', marginBottom: 12 }}>이번 달 서로에게 한 줄 남기기</p>
        {coupleMessages.filter(m => m.month === currentMonth).map(m => (
          <div key={m.id} style={{ background: '#FAF8F3', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: '#9A8A7A', marginBottom: 3 }}>{m.person}</p>
            <p style={{ fontSize: 14 }}>{m.text}</p>
          </div>
        ))}
        {msgSaved && <p className="slide-up" style={{ color: '#5F8A6E', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>💚 저장됐어요!</p>}
        <form onSubmit={handleMsgSubmit}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {['이현', '혜원'].map(p => (
              <button type="button" key={p} onClick={() => setMsg(m => ({ ...m, person: p }))}
                style={{ padding: '6px 14px', borderRadius: 99, border: `2px solid ${msg.person === p ? '#C0622A' : '#E0D5C8'}`, background: msg.person === p ? '#C0622A' : 'white', color: msg.person === p ? 'white' : '#7A6A5A', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="이번 달 한마디..." value={msg.text} onChange={e => setMsg(m => ({ ...m, text: e.target.value }))}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E0D5C8', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <button type="submit" style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#C0622A', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>전송</button>
          </div>
        </form>
      </div>
    </div>
  );
}
