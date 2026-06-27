// ─────────────────────────────────────────────────────────────
// J&H 가계부 — 데이터 모델 · 시드 · localStorage
// ─────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'jh-gaebu-v1';
export const MONTHS = ['2026-05', '2026-06', '2026-07'];
export const DEFAULT_MONTH = '2026-06';

// 구성원
export const OWNERS = {
  이현: { name: '이현', initial: '현', text: '#3182F6', bg: '#E8F3FF' },
  혜원: { name: '혜원', initial: '혜', text: '#E8568D', bg: '#FFEAF1' },
  기타: { name: '기타', initial: '타', text: '#4E5968', bg: '#ECEFF2' },
  공동: { name: '공동', initial: '공', text: '#4E5968', bg: '#ECEFF2' },
};

// 고정지출 카테고리 색상
export const FIXED_CATS = {
  생활: '#12B886',
  공과금: '#FA5252',
  보험: '#845EF7',
  통신: '#0CA678',
  구독: '#F76707',
  차량: '#3182F6',
  교통: '#F59F00',
  기타: '#868E96',
};
export const FIXED_CAT_LIST = Object.keys(FIXED_CATS);

// 저축 기본 5항목 (항상 존재)
export const SAVING_KEYS = ['저축', '투자', '청약통장', '비상예비금', '기타'];

// ─────────────────────────────────────────────────────────────
// 시드 데이터 (실제 데이터 기준)
// ─────────────────────────────────────────────────────────────

let seq = 0;
const uid = (p) => `${p}${(seq++).toString(36)}`;

const fixed = (owner, title, amount, cat) => ({ id: uid('e'), owner, kind: '고정', cat, title, amount, memo: '' });
const vary = (owner, title, amount) => ({ id: uid('e'), owner, kind: '변동', cat: '', title, amount, memo: '' });
const inc = (owner, title, amount) => ({ id: uid('i'), owner, title, amount, memo: '' });
const sav = (title, amount) => ({ id: uid('s'), owner: '공동', title, amount, memo: '' });

// 고정지출 — 이현 (12건)
const FIXED_IHYEON = [
  fixed('이현', '자동차 할부', 937500, '차량'),
  fixed('이현', 'KB손보 (자동차)', 0, '보험'),
  fixed('이현', 'KB손보 (운전자)', 10000, '보험'),
  fixed('이현', '전기차 충전비', 100000, '차량'),
  fixed('이현', '암보험', 91000, '보험'),
  fixed('이현', 'SK 통신료', 69550, '통신'),
  fixed('이현', '넷플릭스', 10000, '구독'),
  fixed('이현', '애플스토어', 3300, '구독'),
  fixed('이현', '토스프라임', 5900, '구독'),
  fixed('이현', '톨비 (하이패스)', 50000, '교통'),
  fixed('이현', '모임비 (가족+중친)', 70000, '생활'),
  fixed('이현', '쿠팡와우', 7890, '구독'),
];

// 고정지출 — 혜원 (10건)
const FIXED_HYEWON = [
  fixed('혜원', '에스원', 55000, '생활'),
  fixed('혜원', '세스코', 82000, '생활'),
  fixed('혜원', '국민연금', 66550, '공과금'),
  fixed('혜원', '건강보험', 58615, '공과금'),
  fixed('혜원', '산재보험', 21590, '공과금'),
  fixed('혜원', '실비보험', 63250, '보험'),
  fixed('혜원', '모임비 (대학)', 30000, '생활'),
  fixed('혜원', '모임비 (가족)', 50000, '생활'),
  fixed('혜원', '모임비 (주현)', 30000, '생활'),
  fixed('혜원', '휴대폰비', 41620, '통신'),
];

const cloneFixed = () => [...FIXED_IHYEON, ...FIXED_HYEWON].map(e => ({ ...e, id: uid('e') }));
const makeSavings = (vals) => SAVING_KEYS.map((k, i) => sav(k, vals[i] ?? 0));

function seed() {
  return {
    '2026-05': {
      income: [
        inc('이현', '이현 월 수입', 3388720),
        inc('기타', '이외 수입 (이월)', 1500000),
      ],
      expense: [
        ...cloneFixed(),
        vary('이현', '한식당 회식', 48000),
        vary('이현', '배달의민족', 54000),
        vary('이현', '다이소', 23700),
        vary('혜원', '무신사', 89000),
        vary('혜원', '투썸플레이스', 12400),
        vary('혜원', 'CU', 18600),
        vary('혜원', '온누리약국', 14000),
      ],
      savings: makeSavings([500000, 300000, 70000, 200000, 0]),
      savingsCards: [
        { key: '저축', prev: 1000000, curr: 1500000 },
        { key: '투자', prev: 600000, curr: 900000 },
        { key: '청약통장', prev: 430000, curr: 500000 },
        { key: '비상예비금', prev: 800000, curr: 1000000 },
      ],
    },
    '2026-06': {
      income: [
        inc('이현', '이현 월 수입', 3388720),
        inc('혜원', '혜원 수입 (확인 필요)', 0),
        inc('기타', '이외 수입 (환급금)', 629000),
      ],
      expense: [
        ...cloneFixed(),
        vary('이현', '쿠팡 생필품', 32400),
        vary('이현', '배달의민족', 23500),
        vary('이현', 'GS25', 4500),
        vary('혜원', '스타벅스', 5800),
        vary('혜원', '김밥천국', 12000),
        vary('혜원', '올리브영', 18900),
        vary('혜원', 'CGV 영화', 28000),
      ],
      savings: makeSavings([300000, 200000, 70000, 200000, 0]),
      savingsCards: [
        { key: '저축', prev: 1500000, curr: 1800000 },
        { key: '투자', prev: 900000, curr: 1100000 },
        { key: '청약통장', prev: 500000, curr: 570000 },
        { key: '비상예비금', prev: 1000000, curr: 1200000 },
      ],
    },
    '2026-07': {
      income: [],
      expense: [...cloneFixed()],
      savings: makeSavings([0, 0, 0, 0, 0]),
      savingsCards: [
        { key: '저축', prev: 1800000, curr: 1800000 },
        { key: '투자', prev: 1100000, curr: 1100000 },
        { key: '청약통장', prev: 570000, curr: 570000 },
        { key: '비상예비금', prev: 1200000, curr: 1200000 },
      ],
    },
  };
}

// ─────────────────────────────────────────────────────────────
// localStorage
// ─────────────────────────────────────────────────────────────

export function loadLedger() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return seed();
}

export function saveLedger(ledger) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  } catch (e) { /* ignore */ }
}

export function newId(prefix = 'x') {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

// ─────────────────────────────────────────────────────────────
// 계산식
// ─────────────────────────────────────────────────────────────

const sumAmt = (arr) => arr.reduce((s, x) => s + (x.amount || 0), 0);

export function totals(month) {
  if (!month) return { income: 0, fixed: 0, vary: 0, expense: 0, savings: 0, remain: 0, rate: 0 };
  const income = sumAmt(month.income);
  const fixedSum = sumAmt(month.expense.filter(e => e.kind === '고정'));
  const varySum = sumAmt(month.expense.filter(e => e.kind === '변동'));
  const expense = fixedSum + varySum;
  const savings = sumAmt(month.savings);
  const remain = income - expense - savings;
  const rate = income > 0 ? (savings / income) * 100 : 0;
  return { income, fixed: fixedSum, vary: varySum, expense, savings, remain, rate };
}

export const ownerExpense = (month, owner) => sumAmt(month.expense.filter(e => e.owner === owner));

export const formatKRW = (n) => `${n < 0 ? '-' : ''}${Math.abs(Math.round(n)).toLocaleString('ko-KR')}원`;
export const formatNum = (n) => Math.round(n).toLocaleString('ko-KR');
export const formatMonth = (m) => { const [y, mo] = m.split('-'); return `${y}년 ${Number(mo)}월`; };
