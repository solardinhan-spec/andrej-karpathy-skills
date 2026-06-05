// ──────────────────────────────────────────
// 기본 카테고리 & 색상
// ──────────────────────────────────────────
export const CATEGORIES = [
  { id: '식비',   label: '🍚 식비',   color: '#C0622A' },
  { id: '카페',   label: '☕ 카페',   color: '#E8A060' },
  { id: '쇼핑',   label: '🛍️ 쇼핑',   color: '#8B6FBE' },
  { id: '교통',   label: '🚗 교통',   color: '#3A6FA8' },
  { id: '의료',   label: '💊 의료',   color: '#D94040' },
  { id: '여가',   label: '🎮 여가',   color: '#5F8A6E' },
  { id: '경조사', label: '🎁 경조사', color: '#C8960A' },
  { id: '기타',   label: '📦 기타',   color: '#9A9A9A' },
];

// ──────────────────────────────────────────
// 기본 예산 설정값
// ──────────────────────────────────────────
export const DEFAULT_BUDGET_SETTINGS = {
  income: {
    ihyeon: 3388000,
    hyewon: 217139,
  },
  fixed: [
    { id: 'f1',  name: '차량 할부',      amount: 350000, person: '이현' },
    { id: 'f2',  name: 'KB손보(차량)',    amount: 159000, person: '이현' },
    { id: 'f3',  name: '생명보험(이현)',  amount: 120000, person: '이현' },
    { id: 'f4',  name: '통신비(이현)',    amount: 55000,  person: '이현' },
    { id: 'f5',  name: '주차비',          amount: 100000, person: '이현' },
    { id: 'f6',  name: '유류비',          amount: 200000, person: '이현' },
    { id: 'f7',  name: '넷플릭스',        amount: 17000,  person: '이현' },
    { id: 'f8',  name: '유튜브프리미엄',  amount: 14000,  person: '이현' },
    { id: 'f9',  name: '기타 고정(이현)', amount: 541250, person: '이현' },
    { id: 'f10', name: '공과금',          amount: 150000, person: '혜원' },
    { id: 'f11', name: '생명보험(혜원)',  amount: 80000,  person: '혜원' },
    { id: 'f12', name: '통신비(혜원)',    amount: 55000,  person: '혜원' },
    { id: 'f13', name: '기타 고정(혜원)', amount: 253559, person: '혜원' },
  ],
  savings: 500000,
  investment: 300000,
  allowance: { ihyeon: 200000, hyewon: 200000 },
  reserve: 100000,
  // 기타지출 항목 (수정 가능한 배열)
  catBudget: [
    { id: 'cb1', categoryId: '식비',   name: '식비',   amount: 80000,  person: '공통' },
    { id: 'cb2', categoryId: '카페',   name: '카페',   amount: 30000,  person: '공통' },
    { id: 'cb3', categoryId: '쇼핑',   name: '쇼핑',   amount: 40000,  person: '공통' },
    { id: 'cb4', categoryId: '교통',   name: '교통',   amount: 20000,  person: '이현' },
    { id: 'cb5', categoryId: '의료',   name: '의료',   amount: 15000,  person: '공통' },
    { id: 'cb6', categoryId: '여가',   name: '여가',   amount: 15000,  person: '공통' },
    { id: 'cb7', categoryId: '경조사', name: '경조사', amount: 0,      person: '공통' },
    { id: 'cb8', categoryId: '기타',   name: '기타',   amount: 10330,  person: '공통' },
  ],
};

// ──────────────────────────────────────────
// 계산 함수
// ──────────────────────────────────────────
export function calcTotal(settings) {
  return settings.income.ihyeon + settings.income.hyewon;
}

export function calcFixedTotal(settings) {
  return settings.fixed.reduce((s, f) => s + f.amount, 0);
}

// 월별 고정지출 합계 (override 적용)
export function calcFixedTotalForMonth(settings, monthlyFixed, month) {
  const overrides = monthlyFixed?.[month] || {};
  return settings.fixed.reduce((s, f) => {
    const amt = overrides[f.id] !== undefined ? overrides[f.id] : f.amount;
    return s + amt;
  }, 0);
}

export function calcCatBudgetTotal(settings) {
  if (!Array.isArray(settings.catBudget)) return 0;
  return settings.catBudget.reduce((s, b) => s + b.amount, 0);
}

export function calcVariable(settings, monthlyFixed, month) {
  const fixedTotal = (monthlyFixed && month)
    ? calcFixedTotalForMonth(settings, monthlyFixed, month)
    : calcFixedTotal(settings);
  return calcTotal(settings)
    - fixedTotal
    - settings.savings
    - settings.investment
    - settings.allowance.ihyeon
    - settings.allowance.hyewon
    - settings.reserve;
}

// 카테고리 예산 조회
export function getCatBudgetAmount(catBudget, categoryId) {
  if (Array.isArray(catBudget)) {
    return catBudget.find(b => b.categoryId === categoryId)?.amount || 0;
  }
  // 이전 형식 호환
  return catBudget?.[categoryId] || 0;
}

// 복리 누적액 계산 (연 4% 기준)
export function calcCompoundSavings(monthlyAmount, monthsElapsed, annualRate = 0.04) {
  if (monthsElapsed <= 0 || monthlyAmount <= 0) return 0;
  const r = annualRate / 12;
  return Math.round(monthlyAmount * ((Math.pow(1 + r, monthsElapsed) - 1) / r));
}

// 두 월 사이 개월 수 (endMonth - startMonth)
export function monthsBetween(startMonth, endMonth) {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm) + 1; // 시작 월 포함
}

// ──────────────────────────────────────────
// 5월 실데이터
// ──────────────────────────────────────────
const MAY_EXPENSES = [
  { id: 'e01', date: '2026-05-02', amount: 15000, category: '식비',   merchant: '홈플러스',     person: '혜원', memo: '장보기' },
  { id: 'e02', date: '2026-05-03', amount: 4500,  category: '카페',   merchant: '이디야',       person: '이현', memo: '' },
  { id: 'e03', date: '2026-05-05', amount: 28000, category: '식비',   merchant: '고기집',       person: '이현', memo: '어린이날 외식' },
  { id: 'e04', date: '2026-05-07', amount: 12000, category: '교통',   merchant: 'GS칼텍스',     person: '이현', memo: '주유' },
  { id: 'e05', date: '2026-05-08', amount: 5900,  category: '카페',   merchant: '스타벅스',     person: '혜원', memo: '아메리카노 2잔' },
  { id: 'e06', date: '2026-05-10', amount: 32400, category: '쇼핑',   merchant: '쿠팡',         person: '이현', memo: '주방용품' },
  { id: 'e07', date: '2026-05-12', amount: 8000,  category: '식비',   merchant: '편의점',       person: '혜원', memo: '' },
  { id: 'e08', date: '2026-05-14', amount: 22000, category: '식비',   merchant: '이마트',       person: '혜원', memo: '장보기' },
  { id: 'e09', date: '2026-05-16', amount: 4200,  category: '카페',   merchant: 'GS25',         person: '혜원', memo: '' },
  { id: 'e10', date: '2026-05-18', amount: 15000, category: '여가',   merchant: '영화관',       person: '이현', memo: '둘이서 영화' },
  { id: 'e11', date: '2026-05-20', amount: 8500,  category: '교통',   merchant: '주유소',       person: '이현', memo: '' },
  { id: 'e12', date: '2026-05-22', amount: 12000, category: '식비',   merchant: '김밥천국',     person: '이현', memo: '' },
  { id: 'e13', date: '2026-05-24', amount: 18000, category: '쇼핑',   merchant: 'H&M',          person: '혜원', memo: '' },
  { id: 'e14', date: '2026-05-25', amount: 9000,  category: '여가',   merchant: '넷플릭스',     person: '이현', memo: '구독' },
  { id: 'e15', date: '2026-05-26', amount: 15000, category: '의료',   merchant: '약국',         person: '혜원', memo: '감기약' },
  { id: 'e16', date: '2026-05-27', amount: 7000,  category: '카페',   merchant: '투썸플레이스', person: '이현', memo: '' },
  { id: 'e17', date: '2026-05-28', amount: 6000,  category: '식비',   merchant: '떡볶이',       person: '혜원', memo: '' },
  { id: 'e18', date: '2026-05-29', amount: 4200,  category: '카페',   merchant: '메가커피',     person: '이현', memo: '' },
  { id: 'e19', date: '2026-05-30', amount: 25000, category: '식비',   merchant: '마트',         person: '혜원', memo: '이번주 장보기' },
];

export const GOAL_JARS = [
  { id: 'travel',    label: '✈️ 여행',  target: 2000000, current: 650000  },
  { id: 'appliance', label: '🏠 가전',  target: 1500000, current: 300000  },
  { id: 'wedding',   label: '💍 결혼',  target: 5000000, current: 1200000 },
];

// ──────────────────────────────────────────
// LocalStorage
// ──────────────────────────────────────────
const STORAGE_KEY = 'woori-gaebu-v3';

function migrateCatBudget(catBudget) {
  if (Array.isArray(catBudget)) return catBudget;
  // 이전 객체 형식 → 배열로 마이그레이션
  return DEFAULT_BUDGET_SETTINGS.catBudget.map(item => ({
    ...item,
    amount: catBudget[item.categoryId] ?? item.amount,
  }));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // catBudget 마이그레이션
      if (s.budgetSettings) {
        s.budgetSettings.catBudget = migrateCatBudget(s.budgetSettings.catBudget);
      }
      return s;
    }
  } catch {}
  return null;
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function getInitialState() {
  const saved = loadState();
  if (saved) return saved;
  return {
    currentMonth: '2026-05',
    appStartMonth: '2026-05',
    expenses: MAY_EXPENSES,
    budgetSettings: DEFAULT_BUDGET_SETTINGS,
    monthlyFixed: {},
    savingsLog: [
      { month: '2026-03', hit: true },
      { month: '2026-04', hit: true },
      { month: '2026-05', hit: false },
    ],
    streak: 2,
    coupleMessages: [],
    jars: GOAL_JARS,
  };
}

// ──────────────────────────────────────────
// 유틸 함수
// ──────────────────────────────────────────
export function getMonthExpenses(expenses, month) {
  return expenses.filter(e => e.date.startsWith(month));
}

export function getCategoryTotals(expenses) {
  const totals = {};
  CATEGORIES.forEach(c => { totals[c.id] = 0; });
  expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
  return totals;
}

export function getTotalSpent(expenses) {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getCatColor(catId) {
  return CATEGORIES.find(c => c.id === catId)?.color || '#9A9A9A';
}

export function getCatLabel(catId) {
  return CATEGORIES.find(c => c.id === catId)?.label || catId;
}

export function formatKRW(n) {
  if (n === undefined || n === null) return '0원';
  return Math.abs(n).toLocaleString('ko-KR') + '원';
}

export function getBarColor(pct) {
  if (pct >= 1) return '#D94040';
  if (pct >= 0.8) return '#E8A060';
  return '#5F8A6E';
}

export function getEggState(streak) {
  if (streak >= 6) return { emoji: '🐉', label: '전설의 용!',    color: '#C8960A' };
  if (streak >= 4) return { emoji: '🐓', label: '닭이 됐어요!',  color: '#5F8A6E' };
  if (streak >= 2) return { emoji: '🐣', label: '부화 중!',      color: '#E8A060' };
  if (streak >= 1) return { emoji: '🥚', label: '알이 흔들려요!', color: '#C0622A' };
  return             { emoji: '🪨', label: '아직 돌이에요',    color: '#9A9A9A' };
}

export function prevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function nextMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(month) {
  const [y, m] = month.split('-');
  return `${y}년 ${Number(m)}월`;
}
