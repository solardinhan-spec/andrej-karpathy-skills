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
// 기본 예산 설정값 (수정 가능)
// ──────────────────────────────────────────
export const DEFAULT_BUDGET_SETTINGS = {
  income: {
    ihyeon: 3388000,
    hyewon: 217139,
  },
  fixed: [
    { id: 'f1',  name: '차량 할부',    amount: 350000, person: '이현', category: '교통' },
    { id: 'f2',  name: 'KB손보(차량)', amount: 159000, person: '이현', category: '보험' },
    { id: 'f3',  name: '생명보험(이현)', amount: 120000, person: '이현', category: '보험' },
    { id: 'f4',  name: '통신비(이현)',  amount: 55000,  person: '이현', category: '통신' },
    { id: 'f5',  name: '주차비',        amount: 100000, person: '이현', category: '교통' },
    { id: 'f6',  name: '유류비',        amount: 200000, person: '이현', category: '교통' },
    { id: 'f7',  name: '넷플릭스',      amount: 17000,  person: '이현', category: '구독' },
    { id: 'f8',  name: '유튜브프리미엄', amount: 14000,  person: '이현', category: '구독' },
    { id: 'f9',  name: '기타 고정(이현)', amount: 541250, person: '이현', category: '기타' },
    { id: 'f10', name: '공과금',        amount: 150000, person: '혜원', category: '공과금' },
    { id: 'f11', name: '생명보험(혜원)', amount: 80000,  person: '혜원', category: '보험' },
    { id: 'f12', name: '통신비(혜원)',  amount: 55000,  person: '혜원', category: '통신' },
    { id: 'f13', name: '기타 고정(혜원)', amount: 253559, person: '혜원', category: '기타' },
  ],
  savings: 500000,
  investment: 300000,
  allowance: { ihyeon: 200000, hyewon: 200000 },
  reserve: 100000,
  catBudget: {
    '식비': 80000,
    '카페': 30000,
    '쇼핑': 40000,
    '교통': 20000,
    '의료': 15000,
    '여가': 15000,
    '경조사': 0,
    '기타': 10330,
  },
};

// 총수입 계산
export function calcTotal(settings) {
  return settings.income.ihyeon + settings.income.hyewon;
}

// 고정지출 합계
export function calcFixedTotal(settings) {
  return settings.fixed.reduce((s, f) => s + f.amount, 0);
}

// 변동지출 예산 = 총수입 - 고정지출합계 - 저축 - 투자 - 용돈합계 - 예비금
export function calcVariable(settings) {
  return calcTotal(settings)
    - calcFixedTotal(settings)
    - settings.savings
    - settings.investment
    - settings.allowance.ihyeon
    - settings.allowance.hyewon
    - settings.reserve;
}

// ──────────────────────────────────────────
// 5월 실데이터 (샘플)
// ──────────────────────────────────────────
const MAY_EXPENSES = [
  { id: 'e01', date: '2026-05-02', amount: 15000, category: '식비',   merchant: '홈플러스',   person: '혜원', memo: '장보기' },
  { id: 'e02', date: '2026-05-03', amount: 4500,  category: '카페',   merchant: '이디야',     person: '이현', memo: '' },
  { id: 'e03', date: '2026-05-05', amount: 28000, category: '식비',   merchant: '고기집',     person: '이현', memo: '어린이날 외식' },
  { id: 'e04', date: '2026-05-07', amount: 12000, category: '교통',   merchant: 'GS칼텍스',   person: '이현', memo: '주유' },
  { id: 'e05', date: '2026-05-08', amount: 5900,  category: '카페',   merchant: '스타벅스',   person: '혜원', memo: '아메리카노 2잔' },
  { id: 'e06', date: '2026-05-10', amount: 32400, category: '쇼핑',   merchant: '쿠팡',       person: '이현', memo: '주방용품' },
  { id: 'e07', date: '2026-05-12', amount: 8000,  category: '식비',   merchant: '편의점',     person: '혜원', memo: '' },
  { id: 'e08', date: '2026-05-14', amount: 22000, category: '식비',   merchant: '이마트',     person: '혜원', memo: '장보기' },
  { id: 'e09', date: '2026-05-16', amount: 4200,  category: '카페',   merchant: 'GS25',       person: '혜원', memo: '' },
  { id: 'e10', date: '2026-05-18', amount: 15000, category: '여가',   merchant: '영화관',     person: '이현', memo: '둘이서 영화' },
  { id: 'e11', date: '2026-05-20', amount: 8500,  category: '교통',   merchant: '주유소',     person: '이현', memo: '' },
  { id: 'e12', date: '2026-05-22', amount: 12000, category: '식비',   merchant: '김밥천국',   person: '이현', memo: '' },
  { id: 'e13', date: '2026-05-24', amount: 18000, category: '쇼핑',   merchant: 'H&M',        person: '혜원', memo: '' },
  { id: 'e14', date: '2026-05-25', amount: 9000,  category: '여가',   merchant: '넷플릭스',   person: '이현', memo: '구독' },
  { id: 'e15', date: '2026-05-26', amount: 15000, category: '의료',   merchant: '약국',       person: '혜원', memo: '감기약' },
  { id: 'e16', date: '2026-05-27', amount: 7000,  category: '카페',   merchant: '투썸플레이스', person: '이현', memo: '' },
  { id: 'e17', date: '2026-05-28', amount: 6000,  category: '식비',   merchant: '떡볶이',     person: '혜원', memo: '' },
  { id: 'e18', date: '2026-05-29', amount: 4200,  category: '카페',   merchant: '메가커피',   person: '이현', memo: '' },
  { id: 'e19', date: '2026-05-30', amount: 25000, category: '식비',   merchant: '마트',       person: '혜원', memo: '이번주 장보기' },
];

export const GOAL_JARS = [
  { id: 'travel',    label: '✈️ 여행',  target: 2000000, current: 650000  },
  { id: 'appliance', label: '🏠 가전',  target: 1500000, current: 300000  },
  { id: 'wedding',   label: '💍 결혼',  target: 5000000, current: 1200000 },
];

// ──────────────────────────────────────────
// LocalStorage
// ──────────────────────────────────────────
const STORAGE_KEY = 'woori-gaebu-v2';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
    expenses: MAY_EXPENSES,
    budgetSettings: DEFAULT_BUDGET_SETTINGS,
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
  if (streak >= 6) return { emoji: '🐉', label: '전설의 용!',  color: '#C8960A' };
  if (streak >= 4) return { emoji: '🐓', label: '닭이 됐어요!', color: '#5F8A6E' };
  if (streak >= 2) return { emoji: '🐣', label: '부화 중!',    color: '#E8A060' };
  if (streak >= 1) return { emoji: '🥚', label: '알이 흔들려요!', color: '#C0622A' };
  return             { emoji: '🪨', label: '아직 돌이에요',  color: '#9A9A9A' };
}

// 월 이동
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
