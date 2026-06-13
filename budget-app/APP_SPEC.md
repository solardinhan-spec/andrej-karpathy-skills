# 우리 가계부 — 앱 구축 명세서 (App Specification)

> 이현 + 혜원 커플을 위한 예비신혼부부 가계부 PWA
> 작성일: 2026-06-13 | 버전: v3

---

## 1. 프로젝트 개요

### 1.1 목적
예비신혼부부 두 사람(이현, 혜원)이 수입·고정지출·기타지출·저축을 함께 관리하는 모바일 웹 가계부 앱. 별도 로그인 없이 로컬스토리지에 데이터를 저장하며, PWA로 설치하여 스마트폰에서 앱처럼 사용.

### 1.2 핵심 가치
- **커플 공동관리**: 이현/혜원 각자의 지출·고정비 분리 표시
- **예산 구조화**: 수입 → 고정지출 → 저축·투자 → 기타지출 예산 자동 계산
- **복리 누적**: 저축+투자 금액의 월별 복리(연 4%) 누적액 시각화
- **월별 관리**: 과거 월 데이터 조회 및 고정지출 월별 금액 개별 수정

---

## 2. 기술 스택

```
프레임워크:   React 19 + Vite 8
스타일링:     Tailwind CSS v4 (@tailwindcss/vite)
차트:         Recharts 3
PWA:          vite-plugin-pwa 1.3
데이터 저장:  localStorage (백엔드 없음)
배포:         Vercel (버전 브랜치 Preview URL)
```

### 2.1 패키지 설치

```bash
npm create vite@latest budget-app -- --template react
cd budget-app
npm install recharts vite-plugin-pwa @tailwindcss/vite
npm install -D @vitejs/plugin-react
```

### 2.2 vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: { chunkSizeWarningLimit: 700 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '우리 가계부',
        short_name: '가계부',
        start_url: '/',
        display: 'standalone',
        background_color: '#FAF8F3',
        theme_color: '#1A1410',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

---

## 3. 디렉토리 구조

```
budget-app/
├── public/
│   ├── icon-192.png          # PWA 아이콘
│   └── icon-512.png
├── src/
│   ├── main.jsx              # React 엔트리포인트
│   ├── App.jsx               # 루트 컴포넌트 (탭 라우팅)
│   ├── store.js              # 전역 상태·데이터·유틸
│   ├── index.css             # 글로벌 스타일
│   └── screens/
│       ├── Home.jsx          # 홈 대시보드
│       ├── Input.jsx         # 지출 입력
│       ├── Report.jsx        # 월별 리포트
│       ├── Challenge.jsx     # 챌린지·가이드
│       └── Settings.jsx      # 설정
├── vercel.json               # Vercel 서브디렉토리 배포 설정
├── vite.config.js
└── package.json
```

### 3.1 vercel.json (저장소 루트에 위치)

```json
{
  "buildCommand": "cd budget-app && npm install && npm run build",
  "outputDirectory": "budget-app/dist",
  "installCommand": "echo 'skip'"
}
```

---

## 4. 데이터 모델 (State Shape)

### 4.1 전역 상태 구조

```js
{
  currentMonth: "2026-05",          // 현재 조회 중인 월 (YYYY-MM)
  appStartMonth: "2026-05",         // 앱 시작 월 (복리 계산 기준)
  expenses: [...],                  // 지출 내역 배열
  budgetSettings: { ... },          // 예산 설정
  monthlyFixed: { ... },            // 월별 고정지출 금액 오버라이드
  savingsLog: [...],                // 월별 저축 달성 기록
  streak: 2,                        // 연속 저축 달성 개월 수
  coupleMessages: [...],            // 커플 한마디 메시지
  jars: [...],                      // 목표 항아리 (여행·가전·결혼)
}
```

### 4.2 지출 항목 (Expense)

```js
{
  id: "e01",                        // 고유 ID (Date.now().toString())
  date: "2026-05-02",               // 날짜 (YYYY-MM-DD)
  amount: 15000,                    // 금액 (원, 정수)
  category: "식비",                 // 카테고리 ID (CATEGORIES 참조)
  merchant: "홈플러스",             // 가맹점명
  person: "혜원",                   // 지출자 ("이현" | "혜원")
  memo: "장보기",                   // 메모 (선택)
}
```

### 4.3 예산 설정 (BudgetSettings)

```js
{
  income: {
    ihyeon: 3388000,                // 이현 월 수입 (원)
    hyewon: 217139,                 // 혜원 월 수입 (원)
  },
  fixed: [                          // 고정지출 항목 배열
    {
      id: "f1",                     // 고유 ID
      name: "차량 할부",            // 항목명 (수정 가능)
      amount: 350000,               // 금액 (원)
      person: "이현",               // 담당자 ("이현" | "혜원")
    },
    // ... 총 13개 항목
  ],
  savings: 500000,                  // 저축 목표 (원/월)
  investment: 300000,               // 투자 목표 (원/월)
  allowance: {
    ihyeon: 200000,                 // 이현 용돈 (원/월)
    hyewon: 200000,                 // 혜원 용돈 (원/월)
  },
  reserve: 100000,                  // 비상예비금 (원/월)
  catBudget: [                      // 기타지출 항목 배열 (수정 가능)
    {
      id: "cb1",                    // 고유 ID
      categoryId: "식비",           // CATEGORIES의 id와 연결
      name: "식비",                 // 표시 이름 (수정 가능)
      amount: 80000,                // 예산 (원/월)
      person: "공통",               // 담당자 ("이현" | "혜원" | "공통")
    },
    // ... 총 8개 항목
  ],
}
```

### 4.4 월별 고정지출 오버라이드 (MonthlyFixed)

```js
{
  "2026-05": {
    "f1": 350000,     // 고정지출 항목 ID → 이번 달 금액
    "f5": 120000,     // 기본값과 다를 경우만 저장
  },
  "2026-06": { ... },
}
```

### 4.5 저축 기록 (SavingsLog)

```js
[
  { month: "2026-03", hit: true },   // 달성 여부
  { month: "2026-04", hit: true },
  { month: "2026-05", hit: false },
]
```

### 4.6 목표 항아리 (Jar)

```js
{
  id: "travel",           // 고유 ID
  label: "✈️ 여행",      // 표시명
  target: 2000000,        // 목표 금액 (원)
  current: 650000,        // 현재 모은 금액 (원)
}
```

---

## 5. 비즈니스 로직 (store.js 핵심 함수)

### 5.1 예산 계산 흐름

```
총수입 = ihyeon + hyewon
고정지출 합계 = fixed.reduce(amount)
기타지출 예산(variable) = 총수입 - 고정지출 - 저축 - 투자 - 용돈(이현+혜원) - 예비금
```

```js
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
```

### 5.2 월별 고정지출 (오버라이드 적용)

```js
export function calcFixedTotalForMonth(settings, monthlyFixed, month) {
  const overrides = monthlyFixed?.[month] || {};
  return settings.fixed.reduce((s, f) => {
    const amt = overrides[f.id] !== undefined ? overrides[f.id] : f.amount;
    return s + amt;
  }, 0);
}
```

### 5.3 복리 누적액 계산

```js
// 연 4% 기준, 월 납입 적립식 복리 (미래가치 공식)
export function calcCompoundSavings(monthlyAmount, monthsElapsed, annualRate = 0.04) {
  if (monthsElapsed <= 0 || monthlyAmount <= 0) return 0;
  const r = annualRate / 12;
  return Math.round(monthlyAmount * ((Math.pow(1 + r, monthsElapsed) - 1) / r));
}

// 두 월 사이 개월 수 (시작 월 포함)
export function monthsBetween(startMonth, endMonth) {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}
```

**예시**: 월 80만원, 12개월 → 원금 960만원, 복리 후 약 979만원

### 5.4 로컬스토리지 저장·로드

```js
const STORAGE_KEY = 'woori-gaebu-v3';

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getInitialState() {
  const saved = loadState();  // localStorage 우선
  if (saved) return saved;
  return { /* 기본값 */ };
}
```

**마이그레이션**: catBudget이 이전 버전의 객체 형식(`{식비: 80000}`)이면 배열 형식으로 자동 변환.

---

## 6. 화면 명세

### 6.1 홈 대시보드 (Home.jsx)

**역할**: 이번 달 예산 현황 전체 요약

**Props**:
```js
{
  expenses,           // 전체 지출 배열
  budgetSettings,     // 예산 설정
  currentMonth,       // 현재 월 "YYYY-MM"
  appStartMonth,      // 앱 시작 월
  monthlyFixed,       // 월별 고정지출 오버라이드
  onMonthChange,      // (dir: 'prev'|'next') => void
  onEditExpense,      // (expense) => void
  onDeleteExpense,    // (id) => void
  onBudgetUpdate,     // (settings) => void
  onMonthlyFixedUpdate, // (month, overrides) => void
}
```

**UI 구성**:
1. **헤더 (다크 배경)**
   - 월 이동 버튼 `‹ 2026년 5월 ›`
   - `이현 ❤️ 혜원` 타이틀
   - 이번달 남은 금액 (기타지출 예산 - 실지출, 빨강/초록)
   - 요약 칩 4개: 총수입·고정지출·저축+투자·용돈+예비 (터치 → 수정 모달)

2. **저축·투자 카드** (2열 그리드)
   - 각 카드: 이번 달 목표 금액 + 진행바

3. **누적 복리 배너** (다크)
   - N개월 누적 예상액 (연 4% 복리)
   - 원금 vs 이자 수익 표시

4. **기타지출 예산 온도계**
   - catBudget 항목별 진행바
   - 80% 경고(주황), 100% 초과(빨강)

5. **최근 지출 5건**
   - 스와이프 왼쪽(← 밀기) → 삭제 버튼 노출
   - 터치(클릭) → 수정 모달

**모달**:
- `IncomeModal`: 이현·혜원 수입 수정
- `FixedModal`: 이번 달 고정지출 항목별 금액 수정 (저장 시 monthlyFixed 업데이트)
- `SavingsModal`: 저축·투자 목표 수정
- `AllowanceModal`: 용돈·예비금 수정
- `ExpenseEditModal`: 지출 상세 수정 (카테고리·날짜·담당자·메모·금액)

**SwipeRow 컴포넌트 동작**:
```
onTouchStart → startX 기록
onTouchMove  → dx < -5px이면 translateX(-80px)까지 이동
onTouchEnd   → offset < -50px이면 -80px 고정 (삭제 버튼 노출)
               threshold 미달이면 복귀
삭제 버튼 클릭 → onDelete() 호출
다른 곳 클릭   → offset 복귀
```

---

### 6.2 지출 입력 (Input.jsx)

**역할**: 새 지출 항목 등록

**Props**:
```js
{ onAdd, currentMonth, budgetSettings }
```

**입력 필드**:
| 필드 | 타입 | 필수 | 기본값 |
|------|------|------|--------|
| 금액 | 숫자 (천단위 자동 포맷) | ✅ | - |
| 카테고리 | 버튼 선택 (8개) | ✅ | 식비 |
| 가맹점명 | 텍스트 | ✅ | - |
| 날짜 | date picker | ✅ | currentMonth-01 |
| 담당자 | 이현/혜원 토글 | ✅ | 이현 |
| 메모 | 텍스트 | ❌ | - |

**저장 후**: `onAdd` 호출 → 홈 탭으로 이동

---

### 6.3 월별 리포트 (Report.jsx)

**역할**: 이번 달 전체 지출 분석

**Props**:
```js
{
  expenses, budgetSettings, currentMonth,
  monthlyFixed, coupleMessages, onAddMessage
}
```

**UI 구성**:
1. **요약 카드** (2열 4개)
   - 총 지출 (고정+기타, 수입 대비 %)
   - 기타지출 사용 (예산 대비 %)
   - 저축+투자 (수입 대비 %)
   - 지출 건수 (이현/혜원 분리)

2. **고정지출 내역**
   - 이현/혜원 분리 목록
   - 월별 오버라이드 적용된 금액 표시

3. **기타지출 바 차트** (Recharts BarChart)
   - 예산(회색) vs 실지출(카테고리 색상) 병렬 바
   - 초과 시 빨간색

4. **전체 지출 파이 차트** (도넛)
   - 고정-이현, 고정-혜원, 카테고리별 기타지출

5. **커플 한마디**
   - 이번 달 저장된 메시지 목록
   - 이현/혜원 선택 후 메시지 작성

---

### 6.4 챌린지 (Challenge.jsx)

**역할**: 저축 게임화 + 절약·재테크 콘텐츠 큐레이션

**Props**:
```js
{
  streak, savingsLog, jars,
  budgetSettings, appStartMonth, currentMonth
}
```

**UI 구성**:
1. **저축 스트릭**
   - 연속 달성 개월 수 (불꽃 아이콘)
   - 최근 6개월 원형 점 표시 (달성: 주황, 미달성: 회색)
   - 다음 마일스톤까지 남은 개월

2. **저축 알 키우기**
   - streak에 따라 알→닭→용 이모지 변화
   - 탭하면 흔들기 애니메이션
   - 누적 복리 배너 (Challenge에서도 표시)

3. **목표 항아리** (3개)
   - SVG 항아리 채움 애니메이션 (달성률 %)

4. **절약·재테크 가이드** (큐레이션 카드)
   - 필터: 전체 / 절약 / 재테크
   - 카드별: 카테고리 배지 + 제목 + 설명

**마일스톤 테이블**:
| 개월 | 이모지 | 레이블 |
|------|--------|--------|
| 1 | 🥚 | 첫 알 |
| 2 | 🥚✨ | 알이 흔들려요 |
| 4 | 🐣 | 부화 중! |
| 6 | 🐓 | 닭이 됐어요 |
| 12 | 🐉 | 전설의 용! |

---

### 6.5 설정 (Settings.jsx)

**역할**: 모든 예산 항목 관리 (자동저장)

**Props**:
```js
{ budgetSettings, onUpdate }
```

**자동저장 로직**:
```js
useEffect(() => {
  const timer = setTimeout(() => {
    onUpdate(settings);
    // "✅ 자동 저장됨" 메시지 1.5초 표시
  }, 500); // 500ms 디바운스
  return () => clearTimeout(timer);
}, [settings]);
```

**아코디언 섹션 구조**:
```
각 섹션: [섹션명 ──────── 합계금액원 ▼]
클릭 시: 인라인으로 세부 항목 펼쳐짐
```

| 섹션 | 표시 합계 | 편집 형식 |
|------|-----------|-----------|
| 💰 수입 | 총수입 | 이현/혜원 개별 입력 |
| 📋 고정지출 - 이현 | 이현 고정 합계 | EditRow × N개 |
| 📋 고정지출 - 혜원 | 혜원 고정 합계 | EditRow × N개 |
| 💚 저축·투자 목표 | 저축+투자 합계 | 저축/투자 개별 입력 |
| 💵 용돈·비상예비금 | 용돈+예비금 합계 | 이현/혜원/예비금 입력 |
| 🌡️ 기타지출 항목 | catBudget 합계 | EditRow × N개 |

**EditRow 컴포넌트**:
```
[항목명 텍스트입력] [금액 숫자입력] [이현/혜원/공통 셀렉트]
                                     [삭제 버튼]
```

**항목 추가**: 각 섹션 하단 `+ 항목 추가` 대시 버튼

---

## 7. 컴포넌트 의존 관계

```
App.jsx
├── state: { currentMonth, appStartMonth, expenses, budgetSettings,
│            monthlyFixed, savingsLog, streak, coupleMessages, jars }
│
├── Home.jsx
│   ├── AnimatedNumber          (숫자 카운트업 애니메이션)
│   ├── SwipeRow                (스와이프 삭제 래퍼)
│   ├── Modal                   (바텀시트 모달 래퍼)
│   ├── IncomeModal
│   ├── FixedModal              (월별 금액 오버라이드)
│   ├── SavingsModal
│   ├── AllowanceModal
│   └── ExpenseEditModal
│
├── Input.jsx                   (독립 폼)
│
├── Report.jsx
│   └── Recharts: BarChart, PieChart
│
├── Challenge.jsx
│   ├── Jar                     (SVG 항아리)
│   ├── EggDisplay              (wobble 애니메이션)
│   └── CONTENT_CARDS[]         (하드코딩된 큐레이션 데이터)
│
└── Settings.jsx
    ├── AccordionSection        (토글 펼침 섹션)
    └── EditRow                 (이름/금액/담당자 편집 행)
```

---

## 8. 카테고리 시스템

```js
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
```

- `catBudget[].categoryId`가 `CATEGORIES[].id`와 매핑
- 지출 입력 시 8개 카테고리 중 선택
- 리포트 파이차트·바차트에 해당 색상 사용

---

## 9. 디자인 시스템

### 9.1 색상 팔레트

```css
--ink:   #1A1410  /* 메인 텍스트 */
--paper: #FAF8F3  /* 배경 */
--warm:  #F2EBE0  /* 카드 배경 */
--rust:  #C0622A  /* 주요 강조색 (이현) */
--sage:  #5F8A6E  /* 긍정/달성 */
--gold:  #C8960A  /* 경고/마일스톤 */
--muted: #7A6A5A  /* 보조 텍스트 */
--line:  #E0D5C8  /* 구분선 */
```

추가 색상:
- 초과: `#D94040`
- 80% 경고: `#E8A060`
- 어두운 헤더: `linear-gradient(135deg, #1A1410, #2E1E10)`
- 배경: `linear-gradient(160deg, #EDE6DC 0%, #E2D9CF 100%)`

### 9.2 타이포그래피

```css
font-family: 'Noto Sans KR', sans-serif;
/* Google Fonts 로드 필요 */
```

| 용도 | 크기 | 굵기 |
|------|------|------|
| 대형 숫자 | 44px | 900 |
| 페이지 제목 | 22px | 800 |
| 섹션 제목 | 15px | 700 |
| 카드 제목 | 14px | 700 |
| 본문 | 13px | 400 |
| 보조 텍스트 | 11-12px | 400 |
| 네비게이션 레이블 | 10px | 600 |

### 9.3 컴포넌트 공통 스타일

```css
/* 카드 */
.card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 2px 16px rgba(26,20,16,0.08);
}

/* 예산 진행바 */
.budget-bar-track { height: 10px; background: #F0EBE3; border-radius: 99px; }
.budget-bar-fill  { height: 100%; border-radius: 99px; transition: width 0.7s; }

/* 앱 쉘 */
#app-shell { max-width: 430px; margin: 0 auto; }
```

### 9.4 애니메이션

| 클래스 | 효과 | 사용처 |
|--------|------|--------|
| `.slide-up` | 아래→위 페이드인 (0.3s) | 모달, 저장 확인 |
| `.egg-wobble` | 좌우 흔들기 (0.6s) | 저축 알 탭 |
| `.flame` | 깜빡임 불꽃 (1.5s loop) | 스트릭 불꽃 아이콘 |
| `.pop-in` | 스케일업 팝인 (0.4s) | 배지 등장 |
| `.pulse` | 투명도 펄스 (2s loop) | 강조 요소 |

---

## 10. 라우팅 구조

싱글 페이지 앱 (탭 기반 라우팅, URL 변경 없음)

```
Tab ID       화면              아이콘
─────────────────────────────────────
home         홈 대시보드        🏠
input        지출 입력          ✏️
report       월별 리포트        📊
challenge    챌린지·가이드      🏆
settings     설정               ⚙️
```

---

## 11. 데이터 흐름

```
App.jsx (전역 상태)
    │
    ├─ update(updater) ──→ setState → saveState(localStorage)
    │
    ├─ handleAddExpense    → expenses.push + setTab('home')
    ├─ handleEditExpense   → expenses.map(replace)
    ├─ handleDeleteExpense → expenses.filter(remove)
    ├─ handleBudgetUpdate  → budgetSettings = newSettings
    ├─ handleMonthlyFixedUpdate → monthlyFixed[month] = overrides
    └─ goMonth(dir)        → currentMonth = prev/next
```

각 화면은 필요한 데이터만 props로 받아 읽기·쓰기. 단방향 데이터 흐름.

---

## 12. 배포 설정

### 12.1 Vercel

- 레포지토리: GitHub `solardinhan-spec/andrej-karpathy-skills`
- 프로젝트 루트에 `vercel.json` 배치 (subdirectory 지정)
- 개발 브랜치: `claude/compassionate-maxwell-VxylE` → Preview URL 자동 생성
- 메인 브랜치(`main`) 병합 시 프로덕션 배포

### 12.2 PWA 설치

- iOS: Safari → 공유 → 홈 화면에 추가
- Android: Chrome → 메뉴 → 앱 설치
- 오프라인 지원: vite-plugin-pwa의 workbox가 정적 에셋 캐싱

---

## 13. 향후 개발 방향 (백로그)

### 단기 (1-2개월)
- [ ] Supabase 연동 (온라인 동기화)
- [ ] 푸시 알림: "오늘 지출 입력 잊지 마세요!"
- [ ] 사진 첨부 기능 (영수증)

### 중기 (3-6개월)
- [ ] 이현/혜원 개별 뷰 (아이디 로그인)
- [ ] 카카오페이·토스 SMS 자동 파싱
- [ ] 예산 초과 알림

### 장기
- [ ] 결혼 준비 체크리스트 모듈
- [ ] 공동 자산 트래커 (부동산·주식)
- [ ] AI 지출 패턴 분석 리포트

---

## 14. 로컬 개발 환경 설정

```bash
# 1. 저장소 클론 (개발 브랜치)
git clone -b claude/compassionate-maxwell-VxylE \
  https://github.com/solardinhan-spec/andrej-karpathy-skills.git

# 2. 의존성 설치
cd andrej-karpathy-skills/budget-app
npm install

# 3. 개발 서버 시작
npm run dev
# → http://localhost:5173 에서 확인

# 4. 프로덕션 빌드
npm run build
npm run preview
```

---

## 15. 실제 예산 데이터 (2026년 5월 기준)

| 항목 | 금액 |
|------|------|
| 이현 월급 | 3,388,000원 |
| 혜원 수입 | 217,139원 |
| **총수입** | **3,605,139원** |
| 고정지출 (이현) | 1,556,250원 |
| 고정지출 (혜원) | 538,559원 |
| 저축 목표 | 500,000원 |
| 투자 목표 | 300,000원 |
| 이현 용돈 | 200,000원 |
| 혜원 용돈 | 200,000원 |
| 비상예비금 | 100,000원 |
| **기타지출 예산** | **210,330원** |

---

*이 문서는 현재 코드베이스를 기반으로 자동 생성되었습니다.*
*최신 코드: `budget-app/src/` 디렉토리 참조*
