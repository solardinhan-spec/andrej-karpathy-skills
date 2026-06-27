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

export const LINE = [
  { m: '2월', v: 760000 }, { m: '3월', v: 980000 }, { m: '4월', v: 1200000 },
  { m: '5월', v: 1500000 }, { m: '6월', v: 1768855 }, { m: '7월', v: 1768855 },
]

// Month keys the app manages. (5월 제거 — 6월부터 시작)
export const MONTH_KEYS = ['2026-06', '2026-07']
export const MONTH_LABELS = {
  '2026-06': '2026년 6월',
  '2026-07': '2026년 7월',
}
export const MONTH_SHORT = { '2026-06': '6월', '2026-07': '7월' }

export const won = (n) => {
  const x = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return (n < 0 ? '-' : '') + x
}
