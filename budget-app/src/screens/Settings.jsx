import { useState, useEffect, useRef } from 'react';
import { calcTotal, calcFixedTotal, calcVariable, calcCatBudgetTotal, formatKRW, CATEGORIES } from '../store';

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: '1.5px solid #E0D5C8', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', background: 'white', color: '#1A1410',
};

function AccordionSection({ title, total, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1A1410' }}>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#C0622A' }}>{total.toLocaleString('ko-KR')}원</span>
          <span style={{ fontSize: 12, color: '#9A8A7A', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid #F0EBE3' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function EditRow({ name, amount, person, onChangeName, onChangeAmount, onChangePerson, onDelete }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 54px', gap: 6, marginBottom: 8, alignItems: 'center' }}>
      <input value={name} onChange={e => onChangeName(e.target.value)} style={{ ...inputStyle, fontSize: 13 }} placeholder="항목명" />
      <input type="number" value={amount} onChange={e => onChangeAmount(Number(e.target.value) || 0)} style={{ ...inputStyle, fontSize: 13, textAlign: 'right' }} placeholder="금액" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <select value={person} onChange={e => onChangePerson(e.target.value)}
          style={{ ...inputStyle, fontSize: 10, padding: '4px 4px' }}>
          <option>이현</option>
          <option>혜원</option>
          <option>공통</option>
        </select>
        <button onClick={onDelete} style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 6, cursor: 'pointer', fontSize: 10, color: '#D94040', padding: '2px 4px', fontFamily: 'inherit' }}>삭제</button>
      </div>
    </div>
  );
}

export default function Settings({ budgetSettings, onUpdate }) {
  const [settings, setSettings] = useState(budgetSettings);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onUpdate(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 500);
    return () => clearTimeout(timerRef.current);
  }, [settings]);

  function set(updater) {
    setSettings(prev => typeof updater === 'function' ? updater(prev) : { ...prev, ...updater });
  }

  function updateFixed(id, field, val) {
    set(s => ({ ...s, fixed: s.fixed.map(f => f.id === id ? { ...f, [field]: field === 'amount' ? (Number(val) || 0) : val } : f) }));
  }
  function addFixed(person) {
    set(s => ({ ...s, fixed: [...s.fixed, { id: `f${Date.now()}`, name: '새 항목', amount: 0, person }] }));
  }
  function removeFixed(id) { set(s => ({ ...s, fixed: s.fixed.filter(f => f.id !== id) })); }

  const catBudget = Array.isArray(settings.catBudget) ? settings.catBudget : [];
  function updateCat(id, field, val) {
    set(s => ({ ...s, catBudget: s.catBudget.map(b => b.id === id ? { ...b, [field]: field === 'amount' ? (Number(val) || 0) : val } : b) }));
  }
  function addCat() {
    set(s => ({ ...s, catBudget: [...s.catBudget, { id: `cb${Date.now()}`, categoryId: '기타', name: '새 항목', amount: 0, person: '공통' }] }));
  }
  function removeCat(id) { set(s => ({ ...s, catBudget: s.catBudget.filter(b => b.id !== id) })); }

  const total = calcTotal(settings);
  const fixed = calcFixedTotal(settings);
  const variable = calcVariable(settings);
  const catTotal = calcCatBudgetTotal(settings);
  const ihyeonFixed = settings.fixed.filter(f => f.person === '이현').reduce((s, f) => s + f.amount, 0);
  const hyewonFixed = settings.fixed.filter(f => f.person === '혜원').reduce((s, f) => s + f.amount, 0);

  return (
    <div className="screen" style={{ padding: '0 14px 80px' }}>
      <div style={{ padding: '24px 0 16px' }}>
        <p style={{ fontSize: 12, color: '#9A8A7A', marginBottom: 4 }}>우리 가계부</p>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>⚙️ 설정</h1>
        {saved && <p style={{ fontSize: 12, color: '#5F8A6E', marginTop: 6, fontWeight: 600 }}>✅ 자동 저장됨</p>}
      </div>

      {/* 예산 요약 */}
      <div style={{ background: 'linear-gradient(135deg, #1A1410, #2E1E10)', borderRadius: 16, padding: '14px 16px', marginBottom: 14, color: 'white' }}>
        <p style={{ fontSize: 11, color: '#A09080', marginBottom: 8 }}>현재 예산 구조</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: '총수입', value: total, color: '#7FD4A0' },
            { label: '고정지출', value: fixed, color: '#E8A060' },
            { label: '저축+투자', value: settings.savings + settings.investment, color: '#8DB4E8' },
            { label: '기타예산', value: Math.max(variable, 0), color: variable < 0 ? '#FF8080' : '#F5D080' },
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
      <AccordionSection title="💰 수입" total={total}>
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A', display: 'block', marginBottom: 5 }}>이현 월급</label>
            <input type="number" value={settings.income.ihyeon} onChange={e => set(s => ({ ...s, income: { ...s.income, ihyeon: Number(e.target.value) || 0 } }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A', display: 'block', marginBottom: 5 }}>혜원 수입</label>
            <input type="number" value={settings.income.hyewon} onChange={e => set(s => ({ ...s, income: { ...s.income, hyewon: Number(e.target.value) || 0 } }))} style={inputStyle} />
          </div>
        </div>
      </AccordionSection>

      {/* 고정지출 - 이현 */}
      <AccordionSection title="📋 고정지출 - 이현" total={ihyeonFixed}>
        <div style={{ marginTop: 14 }}>
          {settings.fixed.filter(f => f.person === '이현').map(f => (
            <EditRow key={f.id}
              name={f.name} amount={f.amount} person={f.person}
              onChangeName={v => updateFixed(f.id, 'name', v)}
              onChangeAmount={v => updateFixed(f.id, 'amount', v)}
              onChangePerson={v => updateFixed(f.id, 'person', v)}
              onDelete={() => removeFixed(f.id)}
            />
          ))}
          <button onClick={() => addFixed('이현')} style={{ width: '100%', padding: 9, borderRadius: 10, border: '2px dashed #E0D5C8', background: 'white', color: '#9A8A7A', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            + 항목 추가
          </button>
        </div>
      </AccordionSection>

      {/* 고정지출 - 혜원 */}
      <AccordionSection title="📋 고정지출 - 혜원" total={hyewonFixed}>
        <div style={{ marginTop: 14 }}>
          {settings.fixed.filter(f => f.person === '혜원').map(f => (
            <EditRow key={f.id}
              name={f.name} amount={f.amount} person={f.person}
              onChangeName={v => updateFixed(f.id, 'name', v)}
              onChangeAmount={v => updateFixed(f.id, 'amount', v)}
              onChangePerson={v => updateFixed(f.id, 'person', v)}
              onDelete={() => removeFixed(f.id)}
            />
          ))}
          <button onClick={() => addFixed('혜원')} style={{ width: '100%', padding: 9, borderRadius: 10, border: '2px dashed #E0D5C8', background: 'white', color: '#9A8A7A', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            + 항목 추가
          </button>
        </div>
      </AccordionSection>

      {/* 저축·투자 */}
      <AccordionSection title="💚 저축·투자 목표" total={settings.savings + settings.investment}>
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A', display: 'block', marginBottom: 5 }}>저축 목표</label>
            <input type="number" value={settings.savings} onChange={e => set(s => ({ ...s, savings: Number(e.target.value) || 0 }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A', display: 'block', marginBottom: 5 }}>투자 목표</label>
            <input type="number" value={settings.investment} onChange={e => set(s => ({ ...s, investment: Number(e.target.value) || 0 }))} style={inputStyle} />
          </div>
        </div>
      </AccordionSection>

      {/* 용돈·예비금 */}
      <AccordionSection title="💵 용돈·비상예비금" total={settings.allowance.ihyeon + settings.allowance.hyewon + settings.reserve}>
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A', display: 'block', marginBottom: 5 }}>이현 용돈</label>
            <input type="number" value={settings.allowance.ihyeon} onChange={e => set(s => ({ ...s, allowance: { ...s.allowance, ihyeon: Number(e.target.value) || 0 } }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A', display: 'block', marginBottom: 5 }}>혜원 용돈</label>
            <input type="number" value={settings.allowance.hyewon} onChange={e => set(s => ({ ...s, allowance: { ...s.allowance, hyewon: Number(e.target.value) || 0 } }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A', display: 'block', marginBottom: 5 }}>비상예비금</label>
            <input type="number" value={settings.reserve} onChange={e => set(s => ({ ...s, reserve: Number(e.target.value) || 0 }))} style={inputStyle} />
          </div>
        </div>
      </AccordionSection>

      {/* 기타지출 항목 */}
      <AccordionSection title="🌡️ 기타지출 항목" total={catTotal}>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 54px', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#9A8A7A', fontWeight: 600 }}>항목명</span>
            <span style={{ fontSize: 11, color: '#9A8A7A', fontWeight: 600, textAlign: 'right' }}>예산(원)</span>
            <span style={{ fontSize: 11, color: '#9A8A7A', fontWeight: 600, textAlign: 'center' }}>담당</span>
          </div>
          {catBudget.map(b => (
            <EditRow key={b.id}
              name={b.name} amount={b.amount} person={b.person}
              onChangeName={v => updateCat(b.id, 'name', v)}
              onChangeAmount={v => updateCat(b.id, 'amount', v)}
              onChangePerson={v => updateCat(b.id, 'person', v)}
              onDelete={() => removeCat(b.id)}
            />
          ))}
          <button onClick={addCat} style={{ width: '100%', padding: 9, borderRadius: 10, border: '2px dashed #E0D5C8', background: 'white', color: '#9A8A7A', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            + 항목 추가
          </button>
        </div>
      </AccordionSection>
    </div>
  );
}
