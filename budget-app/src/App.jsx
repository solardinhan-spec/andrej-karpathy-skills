import { useState, useEffect, useCallback } from 'react';
import { loadLedger, saveLedger, MONTHS, DEFAULT_MONTH, formatMonth, newId } from './store';
import { QuickInputSheet, EditSheet } from './sheets';
import HomeScreen from './screens/HomeScreen';
import MonthScreen from './screens/MonthScreen';
import SavingsScreen from './screens/SavingsScreen';
import StatsScreen from './screens/StatsScreen';

const TABS = [
  { id: 'home', label: '홈', icon: '🏠' },
  { id: 'month', label: '월별', icon: '📅' },
  { id: 'savings', label: '저축', icon: '🐷' },
  { id: 'stats', label: '통계', icon: '📊' },
];

const blankItem = (bucket) => {
  if (bucket === 'income') return { id: newId('i'), owner: '이현', title: '', amount: 0, memo: '' };
  if (bucket === 'savings') return { id: newId('s'), owner: '공동', title: '', amount: 0, memo: '' };
  return { id: newId('e'), owner: '이현', kind: '고정', cat: '생활', title: '', amount: 0, memo: '' };
};

export default function App() {
  const [ledger, setLedger] = useState(loadLedger);
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [tab, setTab] = useState('home');
  const [quickOpen, setQuickOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // { item, bucket, isNew }

  useEffect(() => { saveLedger(ledger); }, [ledger]);

  const md = ledger[month];

  const mutate = useCallback((bucket, fn) => {
    setLedger(prev => ({
      ...prev,
      [month]: { ...prev[month], [bucket]: fn(prev[month][bucket]) },
    }));
  }, [month]);

  const addItem = (bucket, item) => mutate(bucket, list => [...list, item]);
  const updateItem = (bucket, item) => mutate(bucket, list => list.map(x => x.id === item.id ? item : x));
  const deleteItem = (bucket, id) => mutate(bucket, list => list.filter(x => x.id !== id));

  const monthIdx = MONTHS.indexOf(month);
  const goMonth = (dir) => {
    const next = MONTHS[monthIdx + dir];
    if (next) setMonth(next);
  };

  function handleSheetSave(next) {
    if (editTarget.isNew) addItem(editTarget.bucket, next);
    else updateItem(editTarget.bucket, next);
  }

  return (
    <div style={{ paddingBottom: 78 }}>
      {/* 월 헤더 */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)', padding: '16px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <button onClick={() => goMonth(-1)} disabled={monthIdx === 0}
            style={{ background: 'none', border: 'none', fontSize: 22, color: monthIdx === 0 ? '#D1D6DB' : 'var(--ink)', padding: 4 }}>‹</button>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{formatMonth(month)}</h1>
          <button onClick={() => goMonth(1)} disabled={monthIdx === MONTHS.length - 1}
            style={{ background: 'none', border: 'none', fontSize: 22, color: monthIdx === MONTHS.length - 1 ? '#D1D6DB' : 'var(--ink)', padding: 4 }}>›</button>
        </div>
      </header>

      <main className="pop" key={tab + month}>
        {tab === 'home' && <HomeScreen month={md} />}
        {tab === 'month' && (
          <MonthScreen month={md}
            onRowClick={(item, bucket) => setEditTarget({ item, bucket, isNew: false })}
            onDelete={(id, bucket) => deleteItem(bucket, id)}
            onAdd={(bucket) => setEditTarget({ item: blankItem(bucket), bucket, isNew: true })} />
        )}
        {tab === 'savings' && <SavingsScreen ledger={ledger} month={md} />}
        {tab === 'stats' && <StatsScreen ledger={ledger} month={md} />}
      </main>

      {/* FAB */}
      <button onClick={() => setQuickOpen(true)} style={{
        position: 'fixed', bottom: 88, right: 'calc(50% - 220px + 20px)', width: 56, height: 56,
        borderRadius: '50%', border: 'none', background: '#3182F6', color: '#fff', fontSize: 28,
        boxShadow: '0 6px 20px rgba(49,130,246,.4)', zIndex: 30, lineHeight: 1,
      }}>+</button>

      {/* 하단 탭바 */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 440,
        display: 'flex', background: '#fff', borderTop: '1px solid #F2F4F6', zIndex: 25,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '11px 0 13px', background: 'none', border: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <span style={{ fontSize: 20, filter: active ? 'none' : 'grayscale(1)', opacity: active ? 1 : .5 }}>{t.icon}</span>
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? '#3182F6' : 'var(--faint)' }}>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {quickOpen && (
        <QuickInputSheet onClose={() => setQuickOpen(false)}
          onSubmit={(bucket, item) => addItem(bucket, item)} />
      )}
      {editTarget && (
        <EditSheet item={editTarget.item} bucket={editTarget.bucket}
          onClose={() => setEditTarget(null)}
          onSave={handleSheetSave}
          onDelete={() => { if (!editTarget.isNew) deleteItem(editTarget.bucket, editTarget.item.id); }} />
      )}
    </div>
  );
}
