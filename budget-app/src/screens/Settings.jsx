import { useState } from 'react';
import { calcTotal, calcFixedTotal, calcVariable, formatKRW } from '../store';

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1.5px solid #E0D5C8', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', background: 'white', color: '#1A1410',
};
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#7A6A5A', marginBottom: 5, display: 'block' };
const sectionStyle = { marginBottom: 14 };

function SectionCard({ title, children }) {
  return (
    <div className="card" style={{ padding: 18, marginBottom: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid #F0EBE3', paddingBottom: 10 }}>{title}</h2>
      {children}
    </div>
  );
}

export default function Settings({ budgetSettings, onUpdate }) {
  const [settings, setSettings] = useState(budgetSettings);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onUpdate(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateIncome(key, val) {
    setSettings(s => ({ ...s, income: { ...s.income, [key]: Number(val) || 0 } }));
  }

  function updateFixed(id, key, val) {
    setSettings(s => ({ ...s, fixed: s.fixed.map(f => f.id === id ? { ...f, [key]: key === 'amount' ? (Number(val) || 0) : val } : f) }));
  }

  function addFixed() {
    const newItem = { id: `f${Date.now()}`, name: '새 항목', amount: 0, person: '이현', category: '기타' };
    setSettings(s => ({ ...s, fixed: [...s.fixed, newItem] }));
  }

  function removeFixed(id) {
    setSettings(s => ({ ...s, fixed: s.fixed.filter(f => f.id !== id) }));
  }

  function updateAllowance(key, val) {
    setSettings(s => ({ ...s, allowance: { ...s.allowance, [key]: Number(val) || 0 } }));
  }

  function updateCatBudget(cat, val) {
    setSettings(s => ({ ...s, catBudget: { ...s.catBudget, [cat]: Number(val) || 0 } }));
  }

  const total = calcTotal(settings);
  const fixed = calcFixedTotal(settings);
  const variable = calcVariable(settings);

  return (
    <div className="screen" style={{ padding: '0 14px 80px' }}>
      <div style={{ padding: '24px 0 16px' }}>
        <p style={{ fontSize: 12, color: '#9A8A7A', marginBottom: 4 }}>우리 가계부</p>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>⚙️ 설정</h1>
      </div>

      {saved && (
        <div className="slide-up" style={{ background: '#5F8A6E', color: 'white', padding: '12px 16px', borderRadius: 12, marginBottom: 14, fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
          ✅ 저장됐어요!
        </div>
      )}

      {/* 예산 요약 */}
      <div style={{ background: 'linear-gradient(135deg, #1A1410, #2E1E10)', borderRadius: 16, padding: '14px 16px', marginBottom: 14, color: 'white' }}>
        <p style={{ fontSize: 11, color: '#A09080', marginBottom: 8 }}>현재 예산 구조</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: '총수입', value: total, color: '#7FD4A0' },
            { label: '고정지출', value: fixed, color: '#E8A060' },
            { label: '저축+투자', value: settings.savings + settings.investment, color: '#8DB4E8' },
            { label: '변동예산', value: Math.max(variable, 0), color: variable < 0 ? '#FF8080' : '#F5D080' },
          ].map(item => (
            <div key={item.label}>
              <p style={{ fontSize: 10, color: '#806050' }}>{item.label}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{item.value.toLocaleString('ko-KR')}</p>
            </div>
          ))}
        </div>
        {variable < 0 && <p style={{ fontSize: 11, color: '#FF8080', marginTop: 8 }}>⚠️ 지출 합계가 수입을 초과해요!</p>}
      </div>

      {/* 수입 */}
      <SectionCard title="💰 수입">
        <div style={sectionStyle}>
          <label style={labelStyle}>이현 월급</label>
          <input type="number" value={settings.income.ihyeon} onChange={e => updateIncome('ihyeon', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>혜원 수입</label>
          <input type="number" value={settings.income.hyewon} onChange={e => updateIncome('hyewon', e.target.value)} style={inputStyle} />
        </div>
      </SectionCard>

      {/* 고정지출 */}
      <SectionCard title="📋 고정지출">
        {settings.fixed.map(f => (
          <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <input value={f.name} onChange={e => updateFixed(f.id, 'name', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} placeholder="항목명" />
            <input type="number" value={f.amount} onChange={e => updateFixed(f.id, 'amount', e.target.value)} style={{ ...inputStyle, width: 90, fontSize: 13 }} placeholder="금액" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <select value={f.person} onChange={e => updateFixed(f.id, 'person', e.target.value)}
                style={{ ...inputStyle, width: 60, fontSize: 11, padding: '5px 6px' }}>
                <option>이현</option>
                <option>혜원</option>
              </select>
              <button onClick={() => removeFixed(f.id)} style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 6, cursor: 'pointer', fontSize: 11, color: '#D94040', padding: '3px 6px' }}>삭제</button>
            </div>
          </div>
        ))}
        <button onClick={addFixed} style={{ width: '100%', padding: 10, borderRadius: 10, border: '2px dashed #E0D5C8', background: 'white', color: '#9A8A7A', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
          + 항목 추가
        </button>
        <p style={{ fontSize: 12, color: '#9A8A7A', marginTop: 10, textAlign: 'right' }}>
          합계: <strong style={{ color: '#1A1410' }}>{formatKRW(calcFixedTotal(settings))}</strong>
        </p>
      </SectionCard>

      {/* 저축·투자 */}
      <SectionCard title="💚 저축·투자 목표">
        <div style={sectionStyle}>
          <label style={labelStyle}>저축 목표</label>
          <input type="number" value={settings.savings} onChange={e => setSettings(s => ({ ...s, savings: Number(e.target.value) || 0 }))} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>투자 목표</label>
          <input type="number" value={settings.investment} onChange={e => setSettings(s => ({ ...s, investment: Number(e.target.value) || 0 }))} style={inputStyle} />
        </div>
      </SectionCard>

      {/* 용돈·예비금 */}
      <SectionCard title="💵 용돈·비상예비금">
        <div style={sectionStyle}>
          <label style={labelStyle}>이현 용돈</label>
          <input type="number" value={settings.allowance.ihyeon} onChange={e => updateAllowance('ihyeon', e.target.value)} style={inputStyle} />
        </div>
        <div style={sectionStyle}>
          <label style={labelStyle}>혜원 용돈</label>
          <input type="number" value={settings.allowance.hyewon} onChange={e => updateAllowance('hyewon', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>비상예비금</label>
          <input type="number" value={settings.reserve} onChange={e => setSettings(s => ({ ...s, reserve: Number(e.target.value) || 0 }))} style={inputStyle} />
        </div>
      </SectionCard>

      {/* 변동지출 카테고리 예산 */}
      <SectionCard title="🌡️ 변동지출 카테고리 예산">
        {Object.entries(settings.catBudget).map(([cat, budget]) => (
          <div key={cat} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13 }}>{cat}</span>
            <input type="number" value={budget} onChange={e => updateCatBudget(cat, e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
          </div>
        ))}
        <p style={{ fontSize: 12, color: '#9A8A7A', marginTop: 8, textAlign: 'right' }}>
          변동예산 합계: <strong style={{ color: '#1A1410' }}>{formatKRW(Object.values(settings.catBudget).reduce((s, v) => s + v, 0))}</strong>
        </p>
      </SectionCard>

      {/* 저장 버튼 */}
      <button onClick={handleSave} style={{ width: '100%', padding: 16, borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #C0622A, #E8803A)', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(192,98,42,0.35)', marginBottom: 8 }}>
        전체 저장하기 💾
      </button>
    </div>
  );
}
