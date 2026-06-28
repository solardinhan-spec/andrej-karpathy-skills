// Domain constants ported from the prototype.

export const OWN = {
  이현: { i: '현', c: '#3182F6', bg: '#E8F3FF' },
  혜원: { i: '혜', c: '#E8568D', bg: '#FFEAF1' },
  기타: { i: '기', c: '#4E5968', bg: '#ECEFF2' },
  공동: { i: '공', c: '#4E5968', bg: '#ECEFF2' },
}

export const FCAT = {
  생활: '#12B886', 공과금: '#FA5252', 보험: '#845EF7', 통신: '#0CA678',
  구독: '#F76707', 차량: '#3182F6', 교통: '#F59F00', 기타: '#868E96',
}

export const CATS = ['생활', '공과금', '보험', '통신', '구독', '차량', '교통', '기타']
export const OWNERS = ['이현', '혜원', '기타']
export const SAV = [
  ['저축', '🐷', '#E3F7EF'],
  ['투자', '📈', '#E8F1FF'],
  ['청약통장', '🏦', '#E7F0FF'],
  ['비상예비금', '🛟', '#FFF3E0'],
  ['기타', '✨', '#F1F3F5'],
]

// Savings category names + icon/background lookup (저축/투자/청약통장/비상예비금/기타).
export const SAV_CATS = SAV.map((s) => s[0])
export const savMeta = (cat) => {
  const s = SAV.find((x) => x[0] === cat)
  return s ? { emoji: s[1], bg: s[2] } : { emoji: '🐷', bg: '#E3F7EF' }
}
export const BIGS = [['income', '수입'], ['expense', '지출'], ['savings', '저축']]

// Seed months (초기 예시 데이터 생성용).
export const MONTH_KEYS = ['2026-06', '2026-07']

// 앱이 다루는 월 범위: 2026년 6월 ~ 2027년 12월.
export const START_MONTH = '2026-06'
export const END_MONTH = '2027-12'

// 'YYYY-MM' 월 유틸
export const addMonth = (mk, n) => {
  const [y, m] = mk.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return ny + '-' + String(nm).padStart(2, '0')
}
export const monthLabel = (mk) => { const [y, m] = mk.split('-').map(Number); return `${y}년 ${m}월` }
export const monthShort = (mk) => `${Number(mk.split('-')[1])}월`
export const currentMonth = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }
export const clampMonth = (mk) => (mk < START_MONTH ? START_MONTH : mk > END_MONTH ? END_MONTH : mk)
// 전 범위 월 목록(필요 시)
export const ALL_MONTHS = (() => { const out = []; let k = START_MONTH; while (k <= END_MONTH) { out.push(k); k = addMonth(k, 1) } return out })()

export const won = (n) => {
  const x = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (n < 0 ? '-' : '') + x
}
