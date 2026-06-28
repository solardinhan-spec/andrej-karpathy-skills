// Seed data ported verbatim from the prototype's buildData().
// Used to populate a fresh household (cloud) or a fresh device (local-only).
import { SAV } from './constants.js'

export function buildSeed() {
  const fI = [
    ['자동차 할부', 937500, '차량'], ['KB손보 (자동차)', 0, '보험'], ['KB손보 (운전자)', 10000, '보험'],
    ['전기차 충전비', 100000, '차량'], ['암보험', 91000, '보험'], ['SK 통신료', 69550, '통신'],
    ['넷플릭스', 10000, '구독'], ['애플스토어', 3300, '구독'], ['토스프라임', 5900, '구독'],
    ['톨비 (하이패스)', 50000, '교통'], ['모임비(가족+중친)', 70000, '생활'], ['쿠팡와우', 7890, '구독'],
  ]
  const fH = [
    ['에스원', 55000, '생활'], ['세스코', 82000, '생활'], ['국민연금', 66550, '공과금'], ['건강보험', 58615, '공과금'],
    ['산재보험', 21590, '공과금'], ['실비보험', 63250, '보험'], ['모임비 (대학)', 30000, '생활'], ['모임비 (가족)', 50000, '생활'],
    ['모임비 (주현)', 30000, '생활'], ['휴대폰비', 41620, '통신'],
  ]
  const fixedExp = (p) => [
    ...fI.map((x, i) => ({ id: p + 'i' + i, owner: '이현', kind: '고정', cat: x[2], title: x[0], amount: x[1], memo: '' })),
    ...fH.map((x, i) => ({ id: p + 'h' + i, owner: '혜원', kind: '고정', cat: x[2], title: x[0], amount: x[1], memo: '' })),
  ]
  const v = (p, owner, arr) => arr.map((x, i) => ({ id: p + i, owner, kind: '변동', cat: '', title: x[0], amount: x[1], memo: x[2] || '' }))
  const sav = (vals) => SAV.map((s, i) => ({ id: 'sav' + i + '_', owner: '공동', cat: s[0], title: s[0], amount: vals[i] || 0, memo: '' }))

  const jun = {
    income: [
      { id: 'ji1', owner: '이현', title: '이현 월 수입', amount: 3388720, memo: '6월 말 입금 예정' },
      { id: 'ji2', owner: '혜원', title: '혜원 수입', amount: 0, memo: '확인 필요' },
      { id: 'ji3', owner: '기타', title: '이외 수입', amount: 629000, memo: '환급금' },
    ],
    expense: [
      ...fixedExp('j'),
      ...v('jvi', '이현', [['쿠팡 생필품', 32400, ''], ['배달의민족', 23500, ''], ['GS25', 4500, '']]),
      ...v('jvh', '혜원', [['스타벅스', 5800, ''], ['김밥천국', 12000, ''], ['올리브영', 18900, ''], ['CGV 영화', 28000, '']]),
    ],
    savings: sav([300000, 200000, 70000, 200000, 0]),
    savingsCards: [
      { key: '저축', curr: 1800000 }, { key: '투자', curr: 1100000 },
      { key: '청약통장', curr: 570000 }, { key: '비상예비금', curr: 1200000 },
    ],
  }
  const jul = {
    income: [],
    expense: fixedExp('l'),
    savings: sav([0, 0, 0, 0, 0]),
    savingsCards: [
      { key: '저축', curr: 1800000 }, { key: '투자', curr: 1100000 },
      { key: '청약통장', curr: 570000 }, { key: '비상예비금', curr: 1200000 },
    ],
  }
  return { '2026-06': jun, '2026-07': jul }
}
