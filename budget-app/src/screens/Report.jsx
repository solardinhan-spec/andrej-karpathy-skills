import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  CATEGORIES,
  getMonthExpenses, getCategoryTotals, getTotalSpent,
  getCatLabel, formatKRW, formatMonth,
  calcVariable, calcFixedTotalForMonth,
} from '../store';

const CUSTOM_TOOLTIP = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>{p.name}: {p.value.toLocaleString('ko-KR')}원</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Report({ expenses, budgetSettings, currentMonth, monthlyFixed, coupleMessages, onAddMessage }) {
  const monthExp = getMonthExpenses(expenses, currentMonth);
  const totals = getCategoryTotals(monthExp);
  const variableSpent = getTotalSpent(monthExp);
  const variable = calcVariable(budgetSettings, monthlyFixed, currentMonth);
  const fixedTotal = calcFixedTotalForMonth(budgetSettings, monthlyFixed || {}, currentMonth);
  const totalSpent = variableSpent + fixedTotal;
  const totalIncome = budgetSettings.income.ihyeon + budgetSettings.income.hyewon;

  const [msg, setMsg] = useState({ text: '', person: '이현' });
  const [msgSaved, setMsgSaved] = useState(false);

  const savings_rate = ((budgetSettings.savings + budgetSettings.investment) / totalIncome * 100).toFixed(1);
  const variable_rate = variable > 0 ? (variableSpent / variable * 100).toFixed(0) : 0;

  const catBudget = Array.isArray(budgetSettings.catBudget) ? budgetSettings.catBudget : [];
  const barData = catBudget
    .filter(b => b.amount > 0 || (totals[b.categoryId] || 0) > 0)
    .map(b => {
      const cat = CATEGORIES.find(c => c.id === b.categoryId);
      return {
        name: b.name,
        예산: b.amount,
        실지출: totals[b.categoryId] || 0,
        color: cat?.color || '#9A9A9A',
      };
    });

  const ovr = monthlyFixed?.[currentMonth] || {};
  const fixedIhyeon = budgetSettings.fixed.filter(f => f.person === '이현').reduce((s, f) => s + (ovr[f.id] !== undefined ? ovr[f.id] : f.amount), 0);
  const fixedHyewon = budgetSettings.fixed.filter(f => f.person === '혜원').reduce((s, f) => s + (ovr[f.id] !== undefined ? ovr[f.id] : f.amount), 0);

  const pieData = [
    { name: '고정 - 이현', value: fixedIhyeon, color: '#C0622A' },
    { name: '고정 - 혜원', value: fixedHyewon, color: '#8B6FBE' },
    ...CATEGORIES.filter(c => (totals[c.id] || 0) > 0).map(c => ({ name: getCatLabel(c.id), value: totals[c.id], color: c.color })),
  ].filter(d => d.value > 0);

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
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>{formatMonth(currentMonth)}</p>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>📊 월별 리포트</h1>
      </div>

      {/* 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: '총 지출', value: formatKRW(totalSpent), sub: `수입의 ${totalIncome > 0 ? (totalSpent / totalIncome * 100).toFixed(0) : 0}%`, ok: totalSpent <= totalIncome },
          { label: '기타지출 사용', value: formatKRW(variableSpent), sub: `예산의 ${variable_rate}%`, ok: variableSpent <= variable },
          { label: '저축+투자', value: formatKRW(budgetSettings.savings + budgetSettings.investment), sub: `수입의 ${savings_rate}%`, ok: true },
          { label: '지출 건수', value: `${monthExp.length}건`, sub: `이현 ${monthExp.filter(e => e.person === '이현').length} / 혜원 ${monthExp.filter(e => e.person === '혜원').length}`, ok: true },
        ].map(item => (
          <div key={item.label} className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{item.label}</p>
            <p style={{ fontSize: 17, fontWeight: 800, color: item.ok ? '#111111' : '#EF4444', marginBottom: 3 }}>{item.value}</p>
            <p style={{ fontSize: 11, color: item.ok ? '#16A34A' : '#E8A060' }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* 고정지출 내역 */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>📋 고정지출 내역</h2>
        <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>이현 {formatKRW(fixedIhyeon)} + 혜원 {formatKRW(fixedHyewon)} = 합계 {formatKRW(fixedTotal)}</p>
        {['이현', '혜원'].map(person => {
          const items = budgetSettings.fixed.filter(f => f.person === person);
          return (
            <div key={person} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#C0622A', marginBottom: 6 }}>고정지출 - {person}</p>
              {items.map(f => {
                const amt = ovr[f.id] !== undefined ? ovr[f.id] : f.amount;
                return (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #F5F5F5', fontSize: 13 }}>
                    <span>{f.name}</span>
                    <span style={{ fontWeight: 600 }}>{amt.toLocaleString('ko-KR')}원</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 기타지출 바 차트 */}
      {barData.length > 0 && (
        <div className="card" style={{ padding: '14px 6px', marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, paddingLeft: 10, marginBottom: 12 }}>🌡️ 기타지출 vs 예산</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barGap={3} margin={{ top: 0, right: 8, left: -22, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={0} />
              <YAxis tick={{ fontSize: 8, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
              <Tooltip content={<CUSTOM_TOOLTIP />} />
              <Bar dataKey="예산" fill="#E5E7EB" radius={[3, 3, 0, 0]} maxBarSize={16} />
              <Bar dataKey="실지출" radius={[3, 3, 0, 0]} maxBarSize={16}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.실지출 > entry.예산 ? '#EF4444' : entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 4 }}>
            {[['#E5E7EB', '예산'], ['#C0622A', '실지출']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9CA3AF' }}>
                <div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />{l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 지출 파이 차트 */}
      {pieData.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>전체 지출 구조</h2>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>고정지출 + 기타지출 포함</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={v => `${v.toLocaleString('ko-KR')}원`} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 커플 한마디 */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>💬 커플 한마디</h2>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>이번 달 서로에게 한 줄 남기기</p>
        {coupleMessages.filter(m => m.month === currentMonth).map(m => (
          <div key={m.id} style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>{m.person}</p>
            <p style={{ fontSize: 14 }}>{m.text}</p>
          </div>
        ))}
        {msgSaved && <p className="slide-up" style={{ color: '#16A34A', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>💚 저장됐어요!</p>}
        <form onSubmit={handleMsgSubmit}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {['이현', '혜원'].map(p => (
              <button type="button" key={p} onClick={() => setMsg(m => ({ ...m, person: p }))}
                style={{ padding: '6px 14px', borderRadius: 99, border: `2px solid ${msg.person === p ? '#C0622A' : '#E5E7EB'}`, background: msg.person === p ? '#C0622A' : 'white', color: msg.person === p ? 'white' : '#6B7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="이번 달 한마디..." value={msg.text} onChange={e => setMsg(m => ({ ...m, text: e.target.value }))}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
            <button type="submit" style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#C0622A', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>전송</button>
          </div>
        </form>
      </div>
    </div>
  );
}
