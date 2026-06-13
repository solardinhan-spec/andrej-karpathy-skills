import { useState, useRef, useEffect } from 'react';
import {
  CATEGORIES,
  getMonthExpenses, getCategoryTotals, getTotalSpent,
  getCatColor, getCatLabel, formatKRW, getBarColor,
  calcTotal, calcFixedTotal, calcFixedTotalForMonth, calcVariable,
  getCatBudgetAmount, calcCompoundSavings, monthsBetween,
  formatMonth,
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
    <span style={{ color: neg ? '#EF4444' : undefined }}>
      {neg ? '-' : ''}{Math.abs(display).toLocaleString('ko-KR')}원
    </span>
  );
}

// ── 스와이프 삭제 행 ──────────────────────────────
function SwipeRow({ onDelete, onClick, children }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(null);
  const swiping = useRef(false);

  function onTouchStart(e) { startX.current = e.touches[0].clientX; swiping.current = false; }
  function onTouchMove(e) {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < -5) { swiping.current = true; setOffset(Math.max(dx, -80)); }
    else if (dx > 5 && offset < 0) { swiping.current = true; setOffset(0); }
  }
  function onTouchEnd() {
    if (offset < -50) setOffset(-80); else setOffset(0);
    startX.current = null;
  }
  function handleClick() {
    if (swiping.current) { swiping.current = false; return; }
    if (offset < 0) { setOffset(0); return; }
    onClick?.();
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={onDelete} style={{ color: 'white', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', padding: '4px 8px', textAlign: 'center' }}>
          🗑️<br />삭제
        </button>
      </div>
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        style={{ transform: `translateX(${offset}px)`, transition: startX.current ? 'none' : 'transform 0.2s ease', background: '#FFFFFF', position: 'relative', zIndex: 1, cursor: 'pointer' }}
      >
        {children}
      </div>
    </div>
  );
}

// ── 모달 래퍼 ──────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div className="slide-up" style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 430, margin: '0 auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#111111' }}>{title}</h2>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const iStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 16, fontFamily: 'inherit', outline: 'none', marginTop: 6, marginBottom: 14, background: '#FFFFFF', color: '#111111' };
const lStyle = { fontSize: 12, fontWeight: 600, color: '#6B7280' };

// ── 수입 수정 모달 ──────────────────────────────
function IncomeModal({ settings, onSave, onClose }) {
  const [ihyeon, setIhyeon] = useState(String(settings.income.ihyeon));
  const [hyewon, setHyewon] = useState(String(settings.income.hyewon));
  return (
    <Modal title="💰 수입 수정" onClose={onClose}>
      <label style={lStyle}>이현 월급</label>
      <input type="number" value={ihyeon} onChange={e => setIhyeon(e.target.value)} style={iStyle} />
      <label style={lStyle}>혜원 수입</label>
      <input type="number" value={hyewon} onChange={e => setHyewon(e.target.value)} style={iStyle} />
      <button onClick={() => { onSave({ ...settings, income: { ihyeon: Number(ihyeon), hyewon: Number(hyewon) } }); onClose(); }}
        style={{ width: '100%', padding: 14, borderRadius: 12, background: '#111111', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        저장
      </button>
    </Modal>
  );
}

// ── 저축/투자 수정 모달 ──────────────────────────
function SavingsModal({ settings, onSave, onClose }) {
  const [savings, setSavings] = useState(String(settings.savings));
  const [investment, setInvestment] = useState(String(settings.investment));
  return (
    <Modal title="💚 저축·투자 목표" onClose={onClose}>
      <label style={lStyle}>저축 목표</label>
      <input type="number" value={savings} onChange={e => setSavings(e.target.value)} style={iStyle} />
      <label style={lStyle}>투자 목표</label>
      <input type="number" value={investment} onChange={e => setInvestment(e.target.value)} style={iStyle} />
      <button onClick={() => { onSave({ ...settings, savings: Number(savings), investment: Number(investment) }); onClose(); }}
        style={{ width: '100%', padding: 14, borderRadius: 12, background: '#111111', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        저장
      </button>
    </Modal>
  );
}

// ── 고정지출 월별 금액 수정 모달 ──────────────────────────
function FixedModal({ settings, currentMonth, monthlyFixed, onSave, onClose }) {
  const overrides = monthlyFixed[currentMonth] || {};
  const [amounts, setAmounts] = useState(() => {
    const init = {};
    settings.fixed.forEach(f => { init[f.id] = String(overrides[f.id] !== undefined ? overrides[f.id] : f.amount); });
    return init;
  });

  function handleSave() {
    const result = {};
    settings.fixed.forEach(f => { result[f.id] = Number(amounts[f.id]) || 0; });
    onSave(currentMonth, result);
    onClose();
  }

  return (
    <Modal title="📋 고정지출 내역" onClose={onClose}>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>이번 달 금액을 직접 수정할 수 있어요</p>
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {['이현', '혜원'].map(person => {
          const items = settings.fixed.filter(f => f.person === person);
          const total = items.reduce((s, f) => s + (Number(amounts[f.id]) || 0), 0);
          return (
            <div key={person} style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#C0622A', marginBottom: 8 }}>
                고정지출 - {person} · {total.toLocaleString('ko-KR')}원
              </p>
              {items.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #F3F4F6', gap: 8 }}>
                  <span style={{ fontSize: 13, flex: 1, color: '#374151' }}>{f.name}</span>
                  <input type="number" value={amounts[f.id]} onChange={e => setAmounts(a => ({ ...a, [f.id]: e.target.value }))}
                    style={{ width: 90, padding: '4px 8px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 12, fontFamily: 'inherit', outline: 'none', textAlign: 'right', background: '#F9FAFB' }} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <button onClick={handleSave} style={{ width: '100%', padding: 14, borderRadius: 12, background: '#111111', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 12 }}>
        이번 달 금액 저장
      </button>
    </Modal>
  );
}

// ── 용돈/예비금 수정 모달 ──────────────────────────
function AllowanceModal({ settings, onSave, onClose }) {
  const [ihyeon, setIhyeon] = useState(String(settings.allowance.ihyeon));
  const [hyewon, setHyewon] = useState(String(settings.allowance.hyewon));
  const [reserve, setReserve] = useState(String(settings.reserve));
  return (
    <Modal title="💵 용돈·예비금" onClose={onClose}>
      <label style={lStyle}>이현 용돈</label>
      <input type="number" value={ihyeon} onChange={e => setIhyeon(e.target.value)} style={iStyle} />
      <label style={lStyle}>혜원 용돈</label>
      <input type="number" value={hyewon} onChange={e => setHyewon(e.target.value)} style={iStyle} />
      <label style={lStyle}>비상예비금</label>
      <input type="number" value={reserve} onChange={e => setReserve(e.target.value)} style={iStyle} />
      <button onClick={() => { onSave({ ...settings, allowance: { ihyeon: Number(ihyeon), hyewon: Number(hyewon) }, reserve: Number(reserve) }); onClose(); }}
        style={{ width: '100%', padding: 14, borderRadius: 12, background: '#111111', color: 'white', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        저장
      </button>
    </Modal>
  );
}

// ── 지출 수정 모달 ──────────────────────────────
function ExpenseEditModal({ expense, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...expense });
  const [amtDisplay, setAmtDisplay] = useState(Number(expense.amount).toLocaleString('ko-KR'));
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', outline: 'none', marginBottom: 10, background: '#FFFFFF', color: '#111111' };
  return (
    <Modal title="✏️ 지출 수정" onClose={onClose}>
      <input type="text" inputMode="numeric"
        value={amtDisplay}
        onChange={e => { const r = e.target.value.replace(/[^0-9]/g, ''); setAmtDisplay(r ? Number(r).toLocaleString('ko-KR') : ''); setForm(f => ({ ...f, amount: Number(r) })); }}
        style={{ ...inputStyle, fontSize: 22, fontWeight: 700 }} placeholder="금액" />
      <input type="text" value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} style={inputStyle} placeholder="가맹점명" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} type="button" onClick={() => setForm(f => ({ ...f, category: cat.id }))}
            style={{ padding: '5px 12px', borderRadius: 99, border: `1.5px solid ${form.category === cat.id ? cat.color : '#E5E7EB'}`, background: form.category === cat.id ? cat.color : '#FFFFFF', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', color: form.category === cat.id ? 'white' : '#374151', fontWeight: form.category === cat.id ? 700 : 400 }}>
            {cat.label}
          </button>
        ))}
      </div>
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['이현', '혜원'].map(p => (
          <button key={p} type="button" onClick={() => setForm(f => ({ ...f, person: p }))}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: `1.5px solid ${form.person === p ? '#111111' : '#E5E7EB'}`, background: form.person === p ? '#111111' : '#FFFFFF', color: form.person === p ? 'white' : '#374151', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {p}
          </button>
        ))}
      </div>
      <input type="text" value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} style={inputStyle} placeholder="메모 (선택)" />
      <button onClick={() => { onSave(form); onClose(); }}
        style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#C0622A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        저장
      </button>
    </Modal>
  );
}

// ── 메인 홈 화면 ──────────────────────────────
export default function Home({ expenses, budgetSettings, currentMonth, appStartMonth, monthlyFixed, onMonthChange, onEditExpense, onDeleteExpense, onBudgetUpdate, onMonthlyFixedUpdate }) {
  const [modal, setModal] = useState(null);

  const monthExp = getMonthExpenses(expenses, currentMonth);
  const totals = getCategoryTotals(monthExp);
  const spent = getTotalSpent(monthExp);
  const variable = calcVariable(budgetSettings, monthlyFixed, currentMonth);
  const remaining = variable - spent;
  const total = calcTotal(budgetSettings);
  const fixed = calcFixedTotalForMonth(budgetSettings, monthlyFixed, currentMonth);

  const monthsElapsed = monthsBetween(appStartMonth, currentMonth);
  const monthlyTarget = budgetSettings.savings + budgetSettings.investment;
  const accumulated = calcCompoundSavings(monthlyTarget, monthsElapsed);

  const recentFive = [...monthExp].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const summaryCards = [
    { label: '총수입', value: total, color: '#111111', onClick: () => setModal('income') },
    { label: '고정지출', value: fixed, color: '#C0622A', onClick: () => setModal('fixed') },
    { label: '저축+투자', value: monthlyTarget, color: '#16A34A', onClick: () => setModal('savings') },
    { label: '용돈+예비', value: budgetSettings.allowance.ihyeon + budgetSettings.allowance.hyewon + budgetSettings.reserve, color: '#6B7280', onClick: () => setModal('allowance') },
  ];

  return (
    <div className="screen" style={{ padding: '0 0 80px' }}>
      {/* ── 헤더 ── */}
      <div style={{ background: '#111111', padding: '28px 20px 20px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <button onClick={() => onMonthChange('prev')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9CA3AF', fontSize: 16, width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#D1D5DB' }}>{formatMonth(currentMonth)}</span>
              <button onClick={() => onMonthChange('next')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#9CA3AF', fontSize: 16, width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>
              이현 <span style={{ color: '#C0622A' }}>❤️</span> 혜원
            </h1>
          </div>
          <div style={{ background: remaining >= 0 ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${remaining >= 0 ? 'rgba(22,163,74,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius: 12, padding: '8px 12px', textAlign: 'center', minWidth: 100 }}>
            <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>이번달 남은 금액</p>
            <p style={{ fontSize: 17, fontWeight: 700, color: remaining >= 0 ? '#4ADE80' : '#F87171' }}>
              <AnimatedNumber value={remaining} />
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
          {summaryCards.map(item => (
            <button key={item.label} onClick={item.onClick}
              style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '7px 12px', flex: '1 1 auto', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', textAlign: 'left' }}>
              <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 3 }}>{item.label} ✏️</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value.toLocaleString('ko-KR')}</p>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {/* 저축·투자 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 5 }}>💚 저축</p>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#111111' }}>{budgetSettings.savings.toLocaleString('ko-KR')}<span style={{ fontSize: 10, color: '#9CA3AF' }}>원</span></p>
            <div className="budget-bar-track">
              <div className="budget-bar-fill" style={{ width: '100%', background: '#16A34A' }} />
            </div>
            <p style={{ fontSize: 10, color: '#16A34A', marginTop: 4 }}>✓ 목표 달성!</p>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 5 }}>📈 투자</p>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#111111' }}>{budgetSettings.investment.toLocaleString('ko-KR')}<span style={{ fontSize: 10, color: '#9CA3AF' }}>원</span></p>
            <div className="budget-bar-track">
              <div className="budget-bar-fill" style={{ width: '100%', background: '#2563EB' }} />
            </div>
            <p style={{ fontSize: 10, color: '#2563EB', marginTop: 4 }}>✓ 목표 달성!</p>
          </div>
        </div>

        {/* 누적 복리 배너 */}
        <div style={{ background: '#111111', borderRadius: 14, padding: '14px 16px', marginBottom: 12, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>💰 {monthsElapsed}개월 누적 (연 4% 복리)</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#4ADE80' }}>{accumulated.toLocaleString('ko-KR')}원</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: '#6B7280' }}>원금</p>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#D1D5DB' }}>{(monthlyTarget * monthsElapsed).toLocaleString('ko-KR')}원</p>
            <p style={{ fontSize: 10, color: '#4ADE80', marginTop: 2 }}>+이자 {(accumulated - monthlyTarget * monthsElapsed).toLocaleString('ko-KR')}원</p>
          </div>
        </div>

        {/* 기타지출 예산 온도계 */}
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111111' }}>🌡️ 기타지출 예산</h2>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{formatKRW(spent)} / {formatKRW(variable)}</span>
          </div>
          {(Array.isArray(budgetSettings.catBudget) ? budgetSettings.catBudget : []).map(item => {
            const actual = totals[item.categoryId] || 0;
            if (item.amount === 0 && actual === 0) return null;
            const pct = item.amount > 0 ? actual / item.amount : actual > 0 ? 1 : 0;
            const barColor = pct >= 1 ? '#EF4444' : pct >= 0.8 ? '#F59E0B' : '#16A34A';
            return (
              <div key={item.id} style={{ marginBottom: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{getCatLabel(item.categoryId)}</span>
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {actual > 0 ? actual.toLocaleString('ko-KR') : '–'}
                    {item.amount > 0 && ` / ${item.amount.toLocaleString('ko-KR')}`}
                  </span>
                </div>
                {item.amount > 0 && (
                  <div className="budget-bar-track">
                    <div className="budget-bar-fill" style={{ width: `${Math.min(pct * 100, 100)}%`, background: barColor }} />
                  </div>
                )}
                {pct >= 1 && <p style={{ fontSize: 10, color: '#EF4444', marginTop: 2 }}>⚠️ 예산 초과!</p>}
                {pct >= 0.8 && pct < 1 && <p style={{ fontSize: 10, color: '#F59E0B', marginTop: 2 }}>🔸 80% 이상 소진</p>}
              </div>
            );
          })}
        </div>

        {/* 최근 지출 */}
        <div className="card" style={{ padding: 16, marginBottom: 14, overflow: 'hidden' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#111111' }}>📅 최근 지출</h2>
          {recentFive.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>아직 지출 내역이 없어요 ✨</p>
          ) : recentFive.map(e => (
            <SwipeRow key={e.id} onDelete={() => onDeleteExpense(e.id)} onClick={() => setModal({ type: 'expense', expense: e })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${getCatColor(e.category)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {getCatLabel(e.category).split(' ')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 1, color: '#111111' }}>{e.merchant}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF' }}>{e.date.slice(5).replace('-', '/')} · {e.person}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#C0622A' }}>-{e.amount.toLocaleString('ko-KR')}</p>
                  <p style={{ fontSize: 10, color: '#D1D5DB' }}>← 밀어서 삭제</p>
                </div>
              </div>
            </SwipeRow>
          ))}
        </div>
      </div>

      {modal === 'income' && <IncomeModal settings={budgetSettings} onSave={onBudgetUpdate} onClose={() => setModal(null)} />}
      {modal === 'fixed' && <FixedModal settings={budgetSettings} currentMonth={currentMonth} monthlyFixed={monthlyFixed} onSave={onMonthlyFixedUpdate} onClose={() => setModal(null)} />}
      {modal === 'savings' && <SavingsModal settings={budgetSettings} onSave={onBudgetUpdate} onClose={() => setModal(null)} />}
      {modal === 'allowance' && <AllowanceModal settings={budgetSettings} onSave={onBudgetUpdate} onClose={() => setModal(null)} />}
      {modal?.type === 'expense' && <ExpenseEditModal expense={modal.expense} onSave={onEditExpense} onDelete={onDeleteExpense} onClose={() => setModal(null)} />}
    </div>
  );
}
