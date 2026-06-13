import { useState } from 'react';
import { CATEGORIES, calcVariable, formatMonth } from '../store';

export default function Input({ onAdd, currentMonth, budgetSettings }) {
  const defaultDate = currentMonth + '-01';
  const [form, setForm] = useState({
    date: defaultDate,
    amount: '',
    category: '식비',
    merchant: '',
    person: '이현',
    memo: '',
  });
  const [saved, setSaved] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState('');

  function handleAmountChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmountDisplay(raw ? Number(raw).toLocaleString('ko-KR') : '');
    setForm(f => ({ ...f, amount: raw ? Number(raw) : '' }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || !form.merchant) return;
    onAdd({ ...form, id: Date.now().toString(), amount: Number(form.amount) });
    setForm({ date: defaultDate, amount: '', category: '식비', merchant: '', person: '이현', memo: '' });
    setAmountDisplay('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const variable = calcVariable(budgetSettings);
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, display: 'block' };
  const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #E5E7EB', fontSize: 15, background: 'white', outline: 'none', fontFamily: 'inherit', color: '#111111' };

  return (
    <div className="screen" style={{ padding: '0 16px 80px' }}>
      <div style={{ padding: '24px 0 20px' }}>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>{formatMonth(currentMonth)}</p>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>✏️ 지출 입력</h1>
      </div>

      {saved && (
        <div className="slide-up" style={{ background: '#16A34A', color: 'white', padding: '12px 16px', borderRadius: 12, marginBottom: 16, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
          🎉 저장됐어요!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>💰 금액</label>
            <div style={{ position: 'relative' }}>
              <input type="text" inputMode="numeric" placeholder="0" value={amountDisplay} onChange={handleAmountChange} required
                style={{ ...inputStyle, fontSize: 24, fontWeight: 700, paddingRight: 40, color: form.amount ? '#C0622A' : '#9CA3AF' }} />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9CA3AF' }}>원</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>🏷️ 카테고리</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button type="button" key={cat.id} onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                  style={{ padding: '7px 14px', borderRadius: 99, border: `2px solid ${form.category === cat.id ? cat.color : '#E5E7EB'}`, background: form.category === cat.id ? `${cat.color}18` : 'white', color: form.category === cat.id ? cat.color : '#6B7280', fontSize: 13, fontWeight: form.category === cat.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>🏪 가맹점명</label>
            <input type="text" placeholder="예: 스타벅스, 이마트" value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} required style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>📅 날짜</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>👤 누가</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['이현', '혜원'].map(p => (
                  <button type="button" key={p} onClick={() => setForm(f => ({ ...f, person: p }))}
                    style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: `2px solid ${form.person === p ? '#C0622A' : '#E5E7EB'}`, background: form.person === p ? '#C0622A' : 'white', color: form.person === p ? 'white' : '#6B7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>📝 메모 (선택)</label>
            <input type="text" placeholder="간단한 메모를 남겨요" value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} style={inputStyle} />
          </div>

          <button type="submit" disabled={!form.amount || !form.merchant}
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: form.amount && form.merchant ? 'linear-gradient(135deg, #C0622A, #E8803A)' : '#E5E7EB', color: form.amount && form.merchant ? 'white' : '#9CA3AF', fontSize: 16, fontWeight: 700, cursor: form.amount && form.merchant ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: form.amount && form.merchant ? '0 4px 16px rgba(192,98,42,0.35)' : 'none' }}>
            저장하기 💾
          </button>
        </div>
      </form>

      <div style={{ margin: '16px 0', padding: '14px 16px', background: 'rgba(95,138,110,0.1)', borderRadius: 12, borderLeft: '3px solid #16A34A' }}>
        <p style={{ fontSize: 12, color: '#16A34A', fontWeight: 600, marginBottom: 4 }}>💡 절약 팁</p>
        <p style={{ fontSize: 12, color: '#6B7280' }}>
          {formatMonth(currentMonth)} 기타지출 예산은 <strong style={{ color: '#111111' }}>{variable.toLocaleString('ko-KR')}원</strong>이에요.<br />
          함께 아끼면 더 빨리 모을 수 있어요! 💪
        </p>
      </div>
    </div>
  );
}
