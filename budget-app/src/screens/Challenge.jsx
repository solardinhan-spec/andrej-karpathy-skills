import { useState } from 'react';
import { getEggState, formatKRW, calcCompoundSavings, monthsBetween } from '../store';

// 절약·재테크 큐레이션 카드 데이터
const CONTENT_CARDS = [
  {
    id: 'c1', category: '절약', color: '#16A34A', bg: '#EFF7F2',
    emoji: '🛒', title: '장보기 절약 꿀팁',
    desc: '이마트·롯데마트 앱 할인쿠폰 + 행사 상품 위주로 구매하면 식비 20~30% 절약 가능',
    tag: '식비',
  },
  {
    id: 'c2', category: '재테크', color: '#3A6FA8', bg: '#EEF4FB',
    emoji: '📈', title: 'ETF 투자 입문',
    desc: 'KODEX 200, S&P500 ETF를 매달 일정액 적립식으로 투자하면 장기적으로 안정적 수익 가능',
    tag: '투자',
  },
  {
    id: 'c3', category: '절약', color: '#C0622A', bg: '#FEF4EE',
    emoji: '☕', title: '카페 지출 줄이기',
    desc: '텀블러 지참 할인 + 커피숍 대신 편의점 RTD 활용. 월 10회 → 5회만 해도 15,000원 절약',
    tag: '카페',
  },
  {
    id: 'c4', category: '재테크', color: '#D97706', bg: '#FEF9EC',
    emoji: '🏦', title: '파킹통장 200% 활용',
    desc: '카카오뱅크·토스뱅크 파킹통장 연 2.5~3.5% 활용. 비상예비금은 파킹통장에 넣어두세요',
    tag: '저축',
  },
  {
    id: 'c5', category: '절약', color: '#8B6FBE', bg: '#F3F0FA',
    emoji: '📱', title: '구독 서비스 정리',
    desc: '사용 안 하는 OTT·앱 구독 취소하기. 넷플릭스+유튜브+음악 = 매달 3~5만원 고정 지출',
    tag: '구독',
  },
  {
    id: 'c6', category: '재테크', color: '#EF4444', bg: '#FEF0F0',
    emoji: '💳', title: '체크카드 vs 신용카드',
    desc: '소비 통제엔 체크카드, 혜택은 신용카드. 월 지출의 30%는 캐시백 신용카드로 혜택 극대화',
    tag: '카드',
  },
  {
    id: 'c7', category: '절약', color: '#16A34A', bg: '#EFF7F2',
    emoji: '🚗', title: '교통비 절약',
    desc: '알뜰교통카드로 대중교통 최대 20% 마일리지 적립. 주 1~2회 자차 대신 대중교통 이용 고려',
    tag: '교통',
  },
  {
    id: 'c8', category: '재테크', color: '#3A6FA8', bg: '#EEF4FB',
    emoji: '🏠', title: '청약저축 꼭 넣기',
    desc: '주택청약종합저축 월 2만~10만원. 연말정산 소득공제 + 청약 자격 동시에 챙길 수 있어요',
    tag: '주거',
  },
  {
    id: 'c9', category: '절약', color: '#C0622A', bg: '#FEF4EE',
    emoji: '🍱', title: '점심 도시락 챌린지',
    desc: '주 3회만 도시락 싸도 외식비 약 30,000원 절약. 건강도 챙기고 지갑도 챙기는 일석이조',
    tag: '식비',
  },
  {
    id: 'c10', category: '재테크', color: '#D97706', bg: '#FEF9EC',
    emoji: '📊', title: 'IRP·연금저축으로 세액공제',
    desc: 'IRP 연 700만원, 연금저축 400만원까지 세액공제 16.5%. 사회초년생도 소액부터 시작 가능',
    tag: '세금',
  },
];

function Jar({ jar }) {
  const pct = Math.min(jar.current / jar.target, 1);
  const h = Math.round(pct * 72);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 100, margin: '0 auto 8px' }}>
        <svg viewBox="0 0 80 100" width="80" height="100">
          <rect x="10" y="20" width="60" height="72" rx="12" fill="#F5F5F5" stroke="#E5E7EB" strokeWidth="2" />
          {pct > 0 && (
            <rect x="12" y={20 + (72 - h)} width="56" height={h} rx={h >= 60 ? 10 : 0} fill="#C0622A" opacity="0.7" />
          )}
          <rect x="22" y="12" width="36" height="12" rx="4" fill="#F5F5F5" stroke="#E5E7EB" strokeWidth="2" />
          <rect x="16" y="8" width="48" height="8" rx="4" fill="#C0622A" opacity="0.8" />
        </svg>
        <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: pct > 0.4 ? 'white' : '#9CA3AF' }}>
          {Math.round(pct * 100)}%
        </div>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{jar.label}</p>
      <p style={{ fontSize: 11, color: '#9CA3AF' }}>{jar.current.toLocaleString('ko-KR')} / {jar.target.toLocaleString('ko-KR')}</p>
    </div>
  );
}

function EggDisplay({ streak }) {
  const egg = getEggState(streak);
  const [wobble, setWobble] = useState(false);
  return (
    <div style={{ textAlign: 'center' }}>
      <button onClick={() => { setWobble(true); setTimeout(() => setWobble(false), 700); }}
        style={{ fontSize: 80, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'block', margin: '0 auto 12px' }}
        className={wobble ? 'egg-wobble' : ''}>
        {egg.emoji}
      </button>
      <p style={{ fontSize: 18, fontWeight: 800, color: egg.color, marginBottom: 4 }}>{egg.label}</p>
      <p style={{ fontSize: 13, color: '#9CA3AF' }}>{streak}개월 연속 저축 달성</p>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>👆 탭하면 흔들려요</p>
    </div>
  );
}

const MILESTONE_LABELS = [
  { months: 1, emoji: '🥚', label: '첫 알' },
  { months: 2, emoji: '🥚✨', label: '알이 흔들려요' },
  { months: 4, emoji: '🐣', label: '부화 중!' },
  { months: 6, emoji: '🐓', label: '닭이 됐어요' },
  { months: 12, emoji: '🐉', label: '전설의 용!' },
];

const CATEGORIES_FILTER = ['전체', '절약', '재테크'];

export default function Challenge({ streak, savingsLog, jars, budgetSettings, appStartMonth, currentMonth }) {
  const [filter, setFilter] = useState('전체');
  const currentMonthHit = savingsLog[savingsLog.length - 1]?.hit || false;
  const nextMilestone = MILESTONE_LABELS.find(m => m.months > streak) || MILESTONE_LABELS[MILESTONE_LABELS.length - 1];
  const toNext = nextMilestone.months - streak;

  const monthsElapsed = monthsBetween(appStartMonth || currentMonth, currentMonth);
  const monthlyTarget = (budgetSettings?.savings || 0) + (budgetSettings?.investment || 0);
  const accumulated = calcCompoundSavings(monthlyTarget, monthsElapsed);

  const filteredCards = CONTENT_CARDS.filter(c => filter === '전체' || c.category === filter);

  return (
    <div className="screen" style={{ padding: '0 16px 80px' }}>
      <div style={{ padding: '24px 0 20px' }}>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>함께 성장하기</p>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>🏆 챌린지</h1>
      </div>

      {/* 스트릭 */}
      <div className="card" style={{ padding: 20, marginBottom: 14, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className="flame" style={{ fontSize: 32 }}>🔥</span>
          <span style={{ fontSize: 44, fontWeight: 900, color: '#C0622A' }}>{streak}</span>
          <span style={{ fontSize: 18, color: '#9CA3AF', alignSelf: 'flex-end', paddingBottom: 8 }}>개월</span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>절약 스트릭</p>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>
          {toNext}개월 더 달성하면 <strong style={{ color: '#C0622A' }}>{nextMilestone.emoji} {nextMilestone.label}</strong>
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {savingsLog.slice(-6).map(log => (
            <div key={log.month} title={log.month}
              style={{ width: 32, height: 32, borderRadius: '50%', background: log.hit ? '#C0622A' : '#F3F4F6', border: `2px solid ${log.hit ? '#C0622A' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              {log.hit ? '✓' : '·'}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>최근 6개월</p>
        {!currentMonthHit && (
          <div style={{ background: '#FFF8F2', border: '1px solid #FFE0C8', borderRadius: 10, padding: '10px 14px', marginTop: 14, fontSize: 13, color: '#C0622A' }}>
            💪 이번 달 저축 목표 <strong>{formatKRW(budgetSettings?.savings || 0)}</strong> 달성하면 스트릭 유지!
          </div>
        )}
      </div>

      {/* 저축 알 + 누적 복리 */}
      <div className="card" style={{ padding: '20px 20px 24px', marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>🥚 저축 알 키우기</h2>
        <EggDisplay streak={streak} />
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: '#9CA3AF' }}>
            <span>현재: {streak}개월</span>
            <span>목표: {nextMilestone.months}개월 {nextMilestone.emoji}</span>
          </div>
          <div className="budget-bar-track" style={{ height: 8 }}>
            <div className="budget-bar-fill" style={{ width: `${Math.min((streak / nextMilestone.months) * 100, 100)}%`, background: 'linear-gradient(90deg, #C0622A, #E8A060)' }} />
          </div>
        </div>
        <div style={{ marginTop: 16, background: '#F9FAFB', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>💰 {monthsElapsed}개월 누적 (연 4% 복리)</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#16A34A' }}>{accumulated.toLocaleString('ko-KR')}원</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: '#9CA3AF' }}>이자 수익</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>+{(accumulated - monthlyTarget * monthsElapsed).toLocaleString('ko-KR')}원</p>
          </div>
        </div>
      </div>

      {/* 목표 항아리 */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>🏺 목표 항아리</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {jars.map(jar => <Jar key={jar.id} jar={jar} />)}
        </div>
      </div>

      {/* 절약·재테크 콘텐츠 큐레이션 */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>💡 절약·재테크 가이드</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {CATEGORIES_FILTER.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ padding: '6px 14px', borderRadius: 99, border: `2px solid ${filter === cat ? '#C0622A' : '#E5E7EB'}`, background: filter === cat ? '#C0622A' : 'white', color: filter === cat ? 'white' : '#6B7280', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {cat}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredCards.map(card => (
            <div key={card.id} className="card" style={{ padding: 16, background: card.bg, boxShadow: 'none', border: `1px solid ${card.color}20` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{card.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: card.color, color: 'white', fontSize: 10, fontWeight: 700 }}>{card.category}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 99, background: 'white', color: card.color, fontSize: 10, fontWeight: 700, border: `1px solid ${card.color}40` }}>{card.tag}</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#111111' }}>{card.title}</p>
                  <p style={{ fontSize: 12, color: '#5A4A3A', lineHeight: 1.5 }}>{card.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
