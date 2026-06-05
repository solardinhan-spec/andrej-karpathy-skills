import { useState, useCallback } from 'react';
import { getInitialState, saveState, prevMonth, nextMonth } from './store';
import Home from './screens/Home';
import Input from './screens/Input';
import Report from './screens/Report';
import Challenge from './screens/Challenge';
import Settings from './screens/Settings';

const TABS = [
  { id: 'home',      icon: '🏠', label: '홈' },
  { id: 'input',     icon: '✏️', label: '입력' },
  { id: 'report',    icon: '📊', label: '리포트' },
  { id: 'challenge', icon: '🏆', label: '챌린지' },
  { id: 'settings',  icon: '⚙️', label: '설정' },
];

export default function App() {
  const [tab, setTab] = useState('home');
  const [state, setState] = useState(getInitialState);

  const update = useCallback((updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveState(next);
      return next;
    });
  }, []);

  function handleAddExpense(expense) {
    update(prev => ({ ...prev, expenses: [...prev.expenses, expense] }));
    setTab('home');
  }

  function handleEditExpense(updated) {
    update(prev => ({
      ...prev,
      expenses: prev.expenses.map(e => e.id === updated.id ? updated : e),
    }));
  }

  function handleDeleteExpense(id) {
    update(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
  }

  function handleAddMessage(msg) {
    update(prev => ({ ...prev, coupleMessages: [...prev.coupleMessages, msg] }));
  }

  function handleBudgetUpdate(newSettings) {
    update(prev => ({ ...prev, budgetSettings: newSettings }));
  }

  function handleMonthlyFixedUpdate(month, overrides) {
    update(prev => ({
      ...prev,
      monthlyFixed: { ...prev.monthlyFixed, [month]: overrides },
    }));
  }

  function goMonth(dir) {
    update(prev => ({
      ...prev,
      currentMonth: dir === 'prev' ? prevMonth(prev.currentMonth) : nextMonth(prev.currentMonth),
    }));
  }

  return (
    <div id="app-shell">
      <div className="screen">
        {tab === 'home' && (
          <Home
            expenses={state.expenses}
            budgetSettings={state.budgetSettings}
            currentMonth={state.currentMonth}
            appStartMonth={state.appStartMonth || state.currentMonth}
            monthlyFixed={state.monthlyFixed || {}}
            onMonthChange={goMonth}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onBudgetUpdate={handleBudgetUpdate}
            onMonthlyFixedUpdate={handleMonthlyFixedUpdate}
          />
        )}
        {tab === 'input' && (
          <Input
            onAdd={handleAddExpense}
            currentMonth={state.currentMonth}
            budgetSettings={state.budgetSettings}
          />
        )}
        {tab === 'report' && (
          <Report
            expenses={state.expenses}
            budgetSettings={state.budgetSettings}
            currentMonth={state.currentMonth}
            monthlyFixed={state.monthlyFixed || {}}
            coupleMessages={state.coupleMessages}
            onAddMessage={handleAddMessage}
          />
        )}
        {tab === 'challenge' && (
          <Challenge
            streak={state.streak}
            savingsLog={state.savingsLog}
            jars={state.jars}
            budgetSettings={state.budgetSettings}
            appStartMonth={state.appStartMonth || state.currentMonth}
            currentMonth={state.currentMonth}
          />
        )}
        {tab === 'settings' && (
          <Settings
            budgetSettings={state.budgetSettings}
            onUpdate={handleBudgetUpdate}
          />
        )}
      </div>

      <nav className="bottom-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
