import { useState, useEffect } from 'react';
import {
  CATEGORIES,
  getMonthExpenses, getCategoryTotals, getTotalSpent,
  getCatColor, getCatLabel, formatKRW, getBarColor,
  calcTotal, calcFixedTotal, calcVariable, formatMonth,
} from '../store';

// ── 애니메이션 숫자 ──────────────────────────────
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = Date.now();
    const from = display;
    const to = value;
    const tick = () => {
      const t = Math.min((Date.now() - start) / 500, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * ease));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  const neg = display < 0;
  return (
    <span style={{ color: neg ? '#FF8080' : undefined }}>
      {neg ? '-' : ''}{Math.abs(display).toLocaleString('ko-KR')}원
    </span>
  );
}

// ── 모달 래퍼 ──────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div
        className="slide-up"
        style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 430, margin: '0 auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: '#9A8A7A' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── 수입 수정 모달 ──────────────────────────────
function IncomeModal({ settings, onSave, onClose }) {
  const [ihyeon, setIhyeon] = useState(String(settings.income.ihyeon));
  const [hyewon, setHyewon] = useState(String(settings.income.hyewon));
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E0D5C8', fontSize: 16, fontFamily: 'inherit', outline: 'none', marginTop: 6, marginBottom: 14 };
  return (
    <Modal title="💰 수입 수정" onClose={onClose}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A' }}>이현 월급</label>
      <input type="number" value={ihyeon} onChange={e => setIhyeon(e.target.value)} style={inputStyle} />
      <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A' }}>혜원 수입</label>
      <input type="number" value={hyewon} onChange={e => setHyewon(e.target.value)} style={inputStyle} />
      <button onClick={() => { onSave({ ...settings, income: { ihyeon: Number(ihyeon), hyewon: Number(hyewon) } }); onClose(); }}
        style={{ width: '100%', padding: 14, borderRadius: 12, background: '#C0622A', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        저장하기
      </button>
    </Modal>
  );
}

// ── 저축/투자 수정 모달 ──────────────────────────
function SavingsModal({ settings, onSave, onClose }) {
  const [savings, setSavings] = useState(String(settings.savings));
  const [investment, setInvestment] = useState(String(settings.investment));
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E0D5C8', fontSize: 16, fontFamily: 'inherit', outline: 'none', marginTop: 6, marginBottom: 14 };
  return (
    <Modal title="💚 저축·투자 목표" onClose={onClose}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A' }}>저축 목표</label>
      <input type="number" value={savings} onChange={e => setSavings(e.target.value)} style={inputStyle} />
      <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A' }}>투자 목표</label>
      <input type="number" value={investment} onChange={e => setInvestment(e.target.value)} style={inputStyle} />
      <button onClick={() => { onSave({ ...settings, savings: Number(savings), investment: Number(investment) }); onClose(); }}
        style={{ width: '100%', padding: 14, borderRadius: 12, background: '#5F8A6E', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        저장하기
      </button>
    </Modal>
  );
}

// ── 고정지출 상세 모달 ──────────────────────────
function FixedModal({ settings, onClose }) {
  return (
    <Modal title="📋 고정지출 내역" onClose={onClose}>
      <div style={{ maxHeight: 340, overflowY: 'auto' }}>
        {['이현', '혜원'].map(person => {
          const items = settings.fixed.filter(f => f.person === person);
          const total = items.reduce((s, f) => s + f.amount, 0);
          return (
            <div key={person} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#C0622A', marginBottom: 8 }}>
                👤 {person} — {total.toLocaleString('ko-KR')}원
              </p>
              {items.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F5F0E8' }}>
                  <span style={{ fontSize: 13 }}>{f.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f.amount.toLocaleString('ko-KR')}원</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: '#9A8A7A', textAlign: 'center', marginTop: 10 }}>
        수정은 ⚙️ 설정 탭에서 할 수 있어요
      </p>
    </Modal>
  );
}

// ── 용돈/예비금 수정 모달 ──────────────────────────
function AllowanceModal({ settings, onSave, onClose }) {
  const [ihyeon, setIhyeon] = useState(String(settings.allowance.ihyeon));
  const [hyewon, setHyewon] = useState(String(settings.allowance.hyewon));
  const [reserve, setReserve] = useState(String(settings.reserve));
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E0D5C8', fontSize: 16, fontFamily: 'inherit', outline: 'none', marginTop: 6, marginBottom: 14 };
  return (
    <Modal title="💵 용돈·예비금" onClose={onClose}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A' }}>이현 용돈</label>
      <input type="number" value={ihyeon} onChange={e => setIhyeon(e.target.value)} style={inputStyle} />
      <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A' }}>혜원 용돈</label>
      <input type="number" value={hyewon} onChange={e => setHyewon(e.target.value)} style={inputStyle} />
      <label style={{ fontSize: 12, fontWeight: 600, color: '#7A6A5A' }}>비상예비금</label>
      <input type="number" value={reserve} onChange={e => setReserve(e.target.value)} style={inputStyle} />
      <button onClick={() => { onSave({ ...settings, allowance: { ihyeon: Number(ihyeon), hyewon: Number(hyewon) }, reserve: Number(reserve) }); onClose(); }}
        style={{ width: '100%', padding: 14, borderRadius: 12, background: '#C8960A', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        저장하기
      </button>
    </Modal>
  );
}

// ── 지출 수정 모달 ──────────────────────────────
function ExpenseEditModal({ expense, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...expense });
  const [amtDisplay, setAmtDisplay] = useState(String(expense.amount));
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E0D5C8', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 10 };
  return (
    <Modal title="✏️ 지출 수정" onClose={onClose}>
      <div style={{ marginBottom: 10 }}>
        <input type="text" inputMode="numeric"
          value={amtDisplay}
          onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ''); setAmtDisplay(r ? Number(r).toLocaleString('ko-KR') : ''); setForm(f => ({ ...f, amount: Number(r) })); }}
          style={{ ...inputStyle, fontSize: 22, fontWeight: 700 }}
          placeholder="금액" />
      </div>
      <input type="text" value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} style={inputStyle} placeholder="가맹점명" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} type="button" onClick={() => setForm(f => ({ ...f, category: cat.id }))}
            style={{ padding: '5px 12px', borderRadius: 99, border: `2px solid ${form.category === cat.id ? cat.color : '#E0D5C8'}`, background: form.category === cat.id ? `${cat.color}18` : 'white', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', color: form.category === cat.id ? cat.color : '#7A6A5A', fontWeight: form.category === cat.id ? 700 : 400 }}>
            {cat.label}
          </button>
        ))}
      </div>
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['이현', '혜원'].map(p => (
          <button key={p} type="button" onClick={() => setForm(f => ({ ...f, person: p }))}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `2px solid ${form.person === p ? '#C0622A' : '#E0D5C8'}`, background: form.person === p ? '#C0622A' : 'white', color: form.person === p ? 'white' : '#7A6A5A', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {p}
          </button>
        ))}
      </div>
      <input type="text" value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} style={inputStyle} placeholder="메모 (선택)" />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { if (window.confirm('삭제할까요?')) { onDelete(expense.id); onClose(); } }}
          style={{ flex: 1, padding: 12, borderRadius: 12, border: '2px solid #D94040', background: 'white', color: '#D94040', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          🗑️ 삭제
        </button>
        <button onClick={() => { onSave(form); onClose(); }}
          style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: '#C0622A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          저장
        </button>
      </div>
    </Modal>
  );
}

// ── 메인 홈 화면 ──────────────────────────────
export default function Home({ expenses, budgetSettings, currentMonth, onMonthChange, onEditExpense, onDeleteExpense, onBudgetUpdate }) {
  const [modal, setModal] = useState(null); // 'income'|'fixed'|'savings'|'allowance'|{expense}

  const monthExp = getMonthExpenses(expenses, currentMonth);
  const totals = getCategoryTotals(monthExp);
  const spent = getTotalSpent(monthExp);
  const variable = calcVariable(budgetSettings);
  const remaining = variable - spent;
  const total = calcTotal(budgetSettings);
  const fixed = calcFixedTotal(budgetSettings);

  const recentFive = [...monthExp].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const summaryCards = [
    { label: '총수입', value: total, color: '#7FD4A0', onClick: () => setModal('income') },
    { label: '고정지출', value: fixed, color: '#E8A060', onClick: () => setModal('fixed') },
    { label: '저축+투자', value: budgetSettings.savings + budgetSettings.investment, color: '#8DB4E8', onClick: () => setModal('savings') },
    { label: '용돈+예비', value: budgetSettings.allowance.ihyeon + budgetSettings.allowance.hyewon + budgetSettings.reserve, color: '#D4B8E8', onClick: () => setModal('allowance') },
  ];

  return (
    <div className="screen" style={{ padding: '0 0 80px' }}>
      {/* ── 헤더 ── */}
      <div style={{ background: 'linear-gradient(135deg, #1A1410 0%, #2E1E10 100%)', padding: '24px 20px 20px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {/* 월 전환 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <button onClick={() => onMonthChange('prev')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#A09080', fontSize: 16, width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#D0B8A0' }}>{formatMonth(currentMonth)}</span>
              <button onClick={() => onMonthChange('next')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#A09080', fontSize: 16, width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>
              이현 <span style={{ color: '#C0622A' }}>❤️</span> 혜원
            </h1>
          </div>
          {/* 이번달 남은 금액 */}
          <div style={{ background: remaining >= 0 ? 'rgba(95,138,110,0.3)' : 'rgba(217,64,64,0.3)', border: `1px solid ${remaining >= 0 ? 'rgba(95,138,110,0.5)' : 'rgba(217,64,64,0.5)'}`, borderRadius: 12, padding: '8px 12px', textAlign: 'center', minWidth: 100 }}>
            <p style={{ fontSize: 10, color: '#A09080', marginBottom: 3 }}>이번달 남은 금액</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: remaining >= 0 ? '#7FD4A0' : '#FF8080' }}>
              <AnimatedNumber value={remaining} />
            </p>
          </div>
        </div>

        {/* 요약 칩 — 클릭 가능 */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
          {summaryCards.map(item => (
            <button key={item.label} onClick={item.onClick}
              style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '7px 12px', flex: '1 1 auto', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', textAlign: 'left' }}>
              <p style={{ fontSize: 10, color: '#806050', marginBottom: 2 }}>{item.label} ✏️</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value.toLocaleString('ko-KR')}</p>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {/* 저축·투자 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[
            { label: '💚 저축', target: budgetSettings.savings, actual: budgetSettings.savings },
            { label: '📈 투자', target: budgetSettings.investment, actual: budgetSettings.investment },
          ].map(item => (
            <div key={item.label} className="card" style={{ padding: 14 }}>
              <p style={{ fontSize: 12, color: '#9A8A7A', marginBottom: 5 }}>{item.label}</p>
              <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 7 }}>
                {item.actual.toLocaleString('ko-KR')}<span style={{ fontSize: 10, color: '#9A8A7A' }}>원</span>
              </p>
              <div className="budget-bar-track">
                <div className="budget-bar-fill" style={{ width: '100%', background: '#5F8A6E' }} />
              </div>
              <p style={{ fontSize: 10, color: '#5F8A6E', marginTop: 4, textAlign: 'right' }}>✓ 목표 달성!</p>
            </div>
          ))}
        </div>

        {/* 변동지출 예산 온도계 */}
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>🌡️ 변동지출 예산</h2>
            <span style={{ fontSize: 11, color: '#9A8A7A' }}>{formatKRW(spent)} / {formatKRW(variable)}</span>
          </div>
          {CATEGORIES.map(cat => {
            const budget = budgetSettings.catBudget[cat.id] || 0;
            const actual = totals[cat.id] || 0;
            if (budget === 0 && actual === 0) return null;
            const pct = budget > 0 ? actual / budget : actual > 0 ? 1 : 0;
            return (
              <div key={cat.id} style={{ marginBottom: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>{getCatLabel(cat.id)}</span>
                  <span style={{ fontSize: 11, color: '#9A8A7A' }}>
                    {actual > 0 ? actual.toLocaleString('ko-KR') : '–'}
                    {budget > 0 && ` / ${budget.toLocaleString('ko-KR')}`}
                  </span>
                </div>
                {budget > 0 && (
                  <div className="budget-bar-track">
                    <div className="budget-bar-fill" style={{ width: `${Math.min(pct * 100, 100)}%`, background: getBarColor(pct) }} />
                  </div>
                )}
                {pct >= 1 && <p style={{ fontSize: 10, color: '#D94040', marginTop: 2 }}>⚠️ 예산 초과!</p>}
                {pct >= 0.8 && pct < 1 && <p style={{ fontSize: 10, color: '#E8A060', marginTop: 2 }}>🔸 80% 이상 소진</p>}
              </div>
            );
          })}
        </div>

        {/* 최근 지출 */}
        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📅 최근 지출</h2>
          {recentFive.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9A8A7A', textAlign: 'center', padding: '12px 0' }}>아직 지출 내역이 없어요 ✨</p>
          ) : recentFive.map(e => (
            <div key={e.id} onClick={() => setModal({ type: 'expense', expense: e })}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F0EBE3', cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${getCatColor(e.category)}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {getCatLabel(e.category).split(' ')[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{e.merchant}</p>
                <p style={{ fontSize: 11, color: '#9A8A7A' }}>{e.date.slice(5).replace('-', '/')} · {e.person}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#D94040' }}>-{e.amount.toLocaleString('ko-KR')}</p>
                <p style={{ fontSize: 10, color: '#C0D0C0' }}>탭해서 수정</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 모달들 ── */}
      {modal === 'income' && <IncomeModal settings={budgetSettings} onSave={onBudgetUpdate} onClose={() => setModal(null)} />}
      {modal === 'fixed' && <FixedModal settings={budgetSettings} onClose={() => setModal(null)} />}
      {modal === 'savings' && <SavingsModal settings={budgetSettings} onSave={onBudgetUpdate} onClose={() => setModal(null)} />}
      {modal === 'allowance' && <AllowanceModal settings={budgetSettings} onSave={onBudgetUpdate} onClose={() => setModal(null)} />}
      {modal?.type === 'expense' && (
        <ExpenseEditModal
          expense={modal.expense}
          onSave={onEditExpense}
          onDelete={onDeleteExpense}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
