# 우리 가계부 — 앱 구축 명세서

> **이현 + 혜원** 예비신혼부부 가계부 PWA  
> 버전: v3 | 최종 수정: 2026-06-13

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [디자인 시스템](#4-디자인-시스템)
5. [데이터 모델](#5-데이터-모델)
6. [핵심 비즈니스 로직](#6-핵심-비즈니스-로직)
7. [화면 명세](#7-화면-명세)
8. [컴포넌트 구조](#8-컴포넌트-구조)
9. [배포 설정](#9-배포-설정)
10. [예산 데이터 (2026년 5월)](#10-예산-데이터-2026년-5월)
11. [향후 개발 방향](#11-향후-개발-방향)
12. [로컬 개발 환경 설정](#12-로컬-개발-환경-설정)

---

## 1. 프로젝트 개요

### 1.1 목적

예비신혼부부 두 사람(이현, 혜원)이 매달 수입·고정지출·기타지출·저축·투자를 함께 관리하는 모바일 웹 가계부 앱.

- 별도 로그인/백엔드 없이 **localStorage**에 데이터 저장
- **PWA**로 설치해 스마트폰 홈 화면에서 앱처럼 사용
- 5개 탭으로 구성된 **싱글 페이지 앱 (SPA)**

### 1.2 핵심 기능 요약

| 기능 | 설명 |
|------|------|
| 월별 대시보드 | 수입·고정지출·기타지출·저축 현황 한눈에 |
| 지출 입력 | 카테고리·담당자·날짜·메모 포함 지출 등록 |
| 복리 누적액 | 저축+투자의 월별 복리(연 4%) 누적액 자동 계산 |
| 월별 고정지출 수정 | 매달 고정비 금액이 달라질 경우 월별 개별 수정 |
| 기타지출 예산 관리 | 카테고리별 예산 설정 및 진행률 시각화 |
| 스와이프 삭제 | 지출 항목을 왼쪽으로 밀어 삭제 |
| 월별 리포트 | 고정지출 + 기타지출 포함한 전체 차트 분석 |
| 챌린지 | 저축 스트릭·알 키우기·절약·재테크 콘텐츠 큐레이션 |
| 설정 자동저장 | 모든 예산 설정 변경 시 500ms 후 자동 저장 |
| 커플 한마디 | 월별 메시지 남기기 |

---

## 2. 기술 스택

```
React 19          UI 프레임워크
Vite 8            빌드 도구
Tailwind CSS v4   스타일링 (@tailwindcss/vite 플러그인)
Recharts 3        차트 (BarChart, PieChart)
vite-plugin-pwa   PWA / Service Worker
localStorage      데이터 영속성 (백엔드 없음)
Vercel            배포
```

### 2.1 package.json

```json
{
  "name": "budget-app",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.3.0",
    "react":             "^19.2.6",
    "react-dom":         "^19.2.6",
    "recharts":          "^3.8.1",
    "vite-plugin-pwa":   "^1.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.1",
    "vite":                 "^8.0.12"
  }
}
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
        background_color: '#FAFAFA',
        theme_color: '#111111',
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
andrej-karpathy-skills/          ← GitHub 저장소 루트
├── vercel.json                  ← Vercel 서브디렉토리 빌드 설정
└── budget-app/                  ← 앱 루트
    ├── public/
    │   ├── icon-192.png
    │   └── icon-512.png
    ├── src/
    │   ├── main.jsx             ← React 엔트리포인트
    │   ├── App.jsx              ← 루트 컴포넌트 (탭 라우팅 + 전역 상태)
    │   ├── store.js             ← 데이터 모델·계산 함수·localStorage
    │   ├── index.css            ← 글로벌 스타일 + CSS 변수
    │   └── screens/
    │       ├── Home.jsx         ← 홈 대시보드
    │       ├── Input.jsx        ← 지출 입력
    │       ├── Report.jsx       ← 월별 리포트
    │       ├── Challenge.jsx    ← 챌린지·콘텐츠 큐레이션
    │       └── Settings.jsx     ← 설정 (자동저장·아코디언)
    ├── APP_SPEC.md              ← 이 문서
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

## 4. 디자인 시스템

### 4.1 색상 팔레트

#### 기본 (화이트·블랙 계열)

| 변수 | 값 | 용도 |
|------|----|------|
| `--ink` | `#111111` | 메인 텍스트 |
| `--paper` | `#FFFFFF` | 카드 배경 |
| `--warm` | `#F5F5F5` | 서브 배경 |
| `--muted` | `#6B7280` | 보조 텍스트 (라벨, 설명) |
| `--line` | `#E5E7EB` | 구분선, 테두리 |
| 앱 배경 | `#EFEFEF` | body 배경 |
| 앱 쉘 배경 | `#FAFAFA` | 앱 컨테이너 |
| 헤더 배경 | `#111111` | 홈·헤더 다크 영역 |

#### 포인트 (주요 항목 색상)

| 색상 | 값 | 용도 |
|------|----|------|
| 러스트 오렌지 | `#C0622A` | 주 포인트, 지출 금액, 버튼 |
| 그린 (저축·달성) | `#16A34A` | 저축 달성, 예산 여유, 성공 상태 |
| 블루 (투자) | `#2563EB` | 투자, 정보성 강조 |
| 옐로 (경고) | `#F59E0B` | 예산 80% 이상 소진 |
| 레드 (초과·삭제) | `#EF4444` | 예산 초과, 삭제 버튼 |
| 보조 포인트 | `#8B6FBE` | 혜원 고정지출 구분 |

#### 다크 헤더 내부 색상

| 용도 | 값 |
|------|-----|
| 다크 내 보조 텍스트 | `#6B7280` |
| 다크 내 일반 텍스트 | `#D1D5DB` |
| 누적 복리 금액 강조 | `#4ADE80` (밝은 녹색) |
| 남은 금액 (양수) | `#4ADE80` |
| 남은 금액 (음수) | `#F87171` |

### 4.2 타이포그래피

```
font-family: 'Noto Sans KR', sans-serif  (Google Fonts)
```

| 용도 | 크기 | 굵기 |
|------|------|------|
| 대형 숫자 (스트릭 등) | 44px | 900 |
| 페이지 제목 | 22px | 800 |
| 헤더 타이틀 | 26px | 900 |
| 섹션 제목 | 15px | 700 |
| 카드 소제목 | 14px | 700 |
| 본문 | 13px | 400 |
| 보조 텍스트 | 11–12px | 400–600 |
| 네비게이션 레이블 | 10px | 600 |

### 4.3 공통 컴포넌트 스타일

```css
/* 카드 */
.card {
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #F3F4F6;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 12px rgba(0,0,0,0.04);
}

/* 예산 진행바 */
.budget-bar-track { height: 8px; background: #F3F4F6; border-radius: 99px; }
.budget-bar-fill  { height: 100%; border-radius: 99px; transition: width 0.7s; }

/* 진행바 색상 규칙 */
- 0~79%:  #16A34A (녹색, 여유)
- 80~99%: #F59E0B (노랑, 경고)
- 100%+:  #EF4444 (빨강, 초과)
```

### 4.4 애니메이션

| 클래스 | 효과 | 사용처 |
|--------|------|--------|
| `.slide-up` | 아래→위 페이드인 0.3s | 모달, 저장 확인 메시지 |
| `.egg-wobble` | 좌우 흔들기 0.6s | 저축 알 탭 시 |
| `.flame` | 불꽃 깜빡임 1.5s loop | 스트릭 🔥 아이콘 |
| `.pop-in` | 스케일업 팝인 0.4s | 요소 등장 시 |
| `.pulse` | 투명도 펄스 2s loop | 강조 요소 |

---

## 5. 데이터 모델

### 5.1 전역 상태 (localStorage key: `woori-gaebu-v3`)

```js
{
  currentMonth:   "2026-05",     // 현재 조회 월 (YYYY-MM)
  appStartMonth:  "2026-05",     // 앱 시작 월 — 복리 계산 기준
  expenses:       [...],          // 지출 내역 배열
  budgetSettings: { ... },        // 예산 설정 (아래 상세)
  monthlyFixed:   { ... },        // 월별 고정지출 금액 오버라이드
  savingsLog:     [...],          // 월별 저축 달성 기록
  streak:         2,              // 연속 저축 달성 개월 수
  coupleMessages: [...],          // 커플 한마디 메시지
  jars:           [...],          // 목표 항아리 (여행·가전·결혼)
}
```

### 5.2 지출 항목 (Expense)

```js
{
  id:       "e01",              // 고유 ID (Date.now().toString())
  date:     "2026-05-02",       // 날짜 (YYYY-MM-DD)
  amount:   15000,              // 금액 (원, 정수)
  category: "식비",             // 카테고리 ID
  merchant: "홈플러스",         // 가맹점명
  person:   "혜원",             // 지출자 ("이현" | "혜원")
  memo:     "장보기",           // 메모 (선택)
}
```

### 5.3 예산 설정 (BudgetSettings)

```js
{
  income: {
    ihyeon: 3388000,            // 이현 월 수입 (원)
    hyewon: 217139,             // 혜원 월 수입 (원)
  },

  fixed: [                      // 고정지출 항목 배열
    { id: "f1",  name: "차량 할부",      amount: 350000, person: "이현" },
    { id: "f2",  name: "KB손보(차량)",   amount: 159000, person: "이현" },
    { id: "f3",  name: "생명보험(이현)", amount: 120000, person: "이현" },
    { id: "f4",  name: "통신비(이현)",   amount: 55000,  person: "이현" },
    { id: "f5",  name: "주차비",         amount: 100000, person: "이현" },
    { id: "f6",  name: "유류비",         amount: 200000, person: "이현" },
    { id: "f7",  name: "넷플릭스",       amount: 17000,  person: "이현" },
    { id: "f8",  name: "유튜브프리미엄", amount: 14000,  person: "이현" },
    { id: "f9",  name: "기타 고정(이현)",amount: 541250, person: "이현" },
    { id: "f10", name: "공과금",         amount: 150000, person: "혜원" },
    { id: "f11", name: "생명보험(혜원)", amount: 80000,  person: "혜원" },
    { id: "f12", name: "통신비(혜원)",   amount: 55000,  person: "혜원" },
    { id: "f13", name: "기타 고정(혜원)",amount: 253559, person: "혜원" },
  ],

  savings:    500000,           // 저축 목표 (원/월)
  investment: 300000,           // 투자 목표 (원/월)

  allowance: {
    ihyeon: 200000,             // 이현 용돈 (원/월)
    hyewon: 200000,             // 혜원 용돈 (원/월)
  },
  reserve: 100000,              // 비상예비금 (원/월)

  catBudget: [                  // 기타지출 항목 배열 (편집 가능)
    { id: "cb1", categoryId: "식비",   name: "식비",   amount: 80000, person: "공통" },
    { id: "cb2", categoryId: "카페",   name: "카페",   amount: 30000, person: "공통" },
    { id: "cb3", categoryId: "쇼핑",   name: "쇼핑",   amount: 40000, person: "공통" },
    { id: "cb4", categoryId: "교통",   name: "교통",   amount: 20000, person: "이현" },
    { id: "cb5", categoryId: "의료",   name: "의료",   amount: 15000, person: "공통" },
    { id: "cb6", categoryId: "여가",   name: "여가",   amount: 15000, person: "공통" },
    { id: "cb7", categoryId: "경조사", name: "경조사", amount: 0,     person: "공통" },
    { id: "cb8", categoryId: "기타",   name: "기타",   amount: 10330, person: "공통" },
  ],
}
```

> **catBudget 구조 변경 이력**: v1/v2에서 `{ 식비: 80000 }` 객체 형식 → v3에서 배열 형식으로 변경. 자동 마이그레이션 포함.

### 5.4 월별 고정지출 오버라이드 (MonthlyFixed)

특정 달에만 고정지출 금액이 다를 경우 저장. 기본값은 `budgetSettings.fixed`의 amount 사용.

```js
monthlyFixed: {
  "2026-05": {
    "f5": 120000,   // 이번 달 주차비만 120,000원
    "f6": 150000,   // 이번 달 유류비만 150,000원
  },
  "2026-06": { ... },
}
```

### 5.5 카테고리 시스템

```js
CATEGORIES = [
  { id: "식비",   label: "🍚 식비",   color: "#C0622A" },
  { id: "카페",   label: "☕ 카페",   color: "#E8A060" },
  { id: "쇼핑",   label: "🛍️ 쇼핑",   color: "#8B6FBE" },
  { id: "교통",   label: "🚗 교통",   color: "#3A6FA8" },
  { id: "의료",   label: "💊 의료",   color: "#D94040" },
  { id: "여가",   label: "🎮 여가",   color: "#5F8A6E" },
  { id: "경조사", label: "🎁 경조사", color: "#C8960A" },
  { id: "기타",   label: "📦 기타",   color: "#9A9A9A" },
]
```

- 지출 입력 시 8개 중 선택
- `catBudget[].categoryId`가 `CATEGORIES[].id`와 매핑
- 리포트·홈 차트에 카테고리별 색상 사용

### 5.6 저축 기록 (SavingsLog)

```js
savingsLog: [
  { month: "2026-03", hit: true  },
  { month: "2026-04", hit: true  },
  { month: "2026-05", hit: false },
]
```

### 5.7 목표 항아리 (Jar)

```js
{
  id:      "travel",
  label:   "✈️ 여행",
  target:  2000000,   // 목표 금액
  current: 650000,    // 현재 모은 금액
}
```

---

## 6. 핵심 비즈니스 로직

### 6.1 예산 계산 흐름

```
총수입 = ihyeon + hyewon
고정지출 합계 = fixed.reduce(amount) [월별 오버라이드 적용]
기타지출 예산(variable) = 총수입 − 고정지출 − 저축 − 투자 − 용돈합계 − 예비금
```

```js
// store.js
function calcVariable(settings, monthlyFixed, month) {
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

### 6.2 월별 고정지출 금액 계산

```js
function calcFixedTotalForMonth(settings, monthlyFixed, month) {
  const overrides = monthlyFixed?.[month] || {};
  return settings.fixed.reduce((s, f) => {
    const amt = overrides[f.id] !== undefined ? overrides[f.id] : f.amount;
    return s + amt;
  }, 0);
}
```

### 6.3 복리 누적액 계산 (연 4%)

```js
// 적립식 복리 미래가치: FV = PMT × ((1+r)^n − 1) / r
function calcCompoundSavings(monthlyAmount, monthsElapsed, annualRate = 0.04) {
  if (monthsElapsed <= 0 || monthlyAmount <= 0) return 0;
  const r = annualRate / 12;   // 월 이율
  return Math.round(monthlyAmount * ((Math.pow(1 + r, monthsElapsed) - 1) / r));
}

// 두 월 사이 개월 수 (시작 월 포함)
function monthsBetween(startMonth, endMonth) {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}
```

**예시**: 월 800,000원, 12개월 → 원금 9,600,000원 → 복리 후 약 9,792,000원 (+이자 192,000원)

### 6.4 자동저장 (Settings)

```js
// 500ms 디바운스: 변경 후 입력이 멈추면 자동 저장
useEffect(() => {
  if (isFirstRender.current) { isFirstRender.current = false; return; }
  const timer = setTimeout(() => {
    onUpdate(settings);
    showSavedMessage();
  }, 500);
  return () => clearTimeout(timer);
}, [settings]);
```

### 6.5 스와이프 삭제 (SwipeRow)

```
터치 시작 → startX 기록
터치 이동 → dx < -5px  : 왼쪽으로 translateX (최대 -80px)
           dx >  5px  : 오른쪽으로 복귀
터치 종료 → offset < -50px : -80px 고정 (삭제 버튼 노출)
           offset ≥ -50px : 0으로 복귀
삭제 버튼 클릭 → onDelete() 호출
다른 곳 클릭   → 스와이프 복귀
```

### 6.6 데이터 흐름

```
App.jsx (전역 상태 + setState + saveState)
    │
    ├── update(updater) ──→ setState → saveState(localStorage)
    │
    ├── handleAddExpense         → expenses에 추가 → 홈 탭 이동
    ├── handleEditExpense        → expenses 항목 교체
    ├── handleDeleteExpense      → expenses에서 제거
    ├── handleBudgetUpdate       → budgetSettings 교체
    ├── handleMonthlyFixedUpdate → monthlyFixed[month] 업데이트
    ├── handleAddMessage         → coupleMessages에 추가
    └── goMonth(dir)             → currentMonth prev/next 이동
```

---

## 7. 화면 명세

### 7.1 홈 대시보드 (Home.jsx)

**Props**:

| Prop | 타입 | 설명 |
|------|------|------|
| `expenses` | `Expense[]` | 전체 지출 배열 |
| `budgetSettings` | `BudgetSettings` | 예산 설정 |
| `currentMonth` | `string` | 현재 조회 월 |
| `appStartMonth` | `string` | 앱 시작 월 (복리 기준) |
| `monthlyFixed` | `object` | 월별 고정지출 오버라이드 |
| `onMonthChange` | `fn(dir)` | 월 이동 |
| `onEditExpense` | `fn(expense)` | 지출 수정 |
| `onDeleteExpense` | `fn(id)` | 지출 삭제 |
| `onBudgetUpdate` | `fn(settings)` | 예산 설정 수정 |
| `onMonthlyFixedUpdate` | `fn(month, overrides)` | 월별 고정 수정 |

**UI 구성**:

```
┌─────────────────────────────┐
│ [헤더 — 다크 #111111 배경]   │
│  ‹ 2026년 5월 ›             │
│  이현 ❤️ 혜원               │
│  [총수입][고정][저축][용돈]  ← 클릭 시 수정 모달
│                    [남은금액] │
└─────────────────────────────┘
│ [저축 카드] [투자 카드]       │  ← 2열 그리드
│ [누적 복리 배너 — 다크]       │  ← N개월 / 연 4% 복리
│ [기타지출 예산 온도계]        │  ← catBudget 항목별 진행바
│ [최근 지출 5건]               │  ← 스와이프 삭제 지원
```

**수정 모달 (바텀시트)**:

| 모달 | 진입 | 편집 내용 |
|------|------|---------|
| IncomeModal | 총수입 칩 터치 | 이현·혜원 수입 |
| FixedModal | 고정지출 칩 터치 | 이번 달 고정지출 항목별 금액 |
| SavingsModal | 저축+투자 칩 터치 | 저축·투자 목표 |
| AllowanceModal | 용돈+예비 칩 터치 | 이현·혜원 용돈, 예비금 |
| ExpenseEditModal | 지출 항목 터치 | 금액·가맹점·카테고리·날짜·담당자·메모 |

---

### 7.2 지출 입력 (Input.jsx)

**Props**: `{ onAdd, currentMonth, budgetSettings }`

**입력 필드**:

| 필드 | 타입 | 필수 | 기본값 |
|------|------|:----:|--------|
| 금액 | 숫자 (천단위 자동 포맷) | ✅ | — |
| 카테고리 | 버튼 선택 (8개) | ✅ | 식비 |
| 가맹점명 | 텍스트 | ✅ | — |
| 날짜 | date picker | ✅ | `currentMonth-01` |
| 담당자 | 이현 / 혜원 토글 | ✅ | 이현 |
| 메모 | 텍스트 | ❌ | — |

저장 후 → `onAdd()` 호출 → 홈 탭으로 자동 이동

---

### 7.3 월별 리포트 (Report.jsx)

**Props**: `{ expenses, budgetSettings, currentMonth, monthlyFixed, coupleMessages, onAddMessage }`

**UI 구성**:

```
[요약 카드 4개]  ← 총지출 / 기타지출 / 저축+투자 / 지출건수
[고정지출 내역]  ← 이현·혜원 분리, 월별 오버라이드 금액 표시
[기타지출 바차트] ← Recharts BarChart: 예산(회색) vs 실지출(카테고리색)
[전체 지출 파이] ← 고정지출(이현/혜원) + 기타지출 카테고리 합산
[커플 한마디]    ← 이번 달 메시지 조회 + 작성
```

**파이차트 항목**:
- 고정 - 이현 (`#C0622A`)
- 고정 - 혜원 (`#8B6FBE`)
- 각 카테고리 기타지출 (카테고리 색상)

---

### 7.4 챌린지 (Challenge.jsx)

**Props**: `{ streak, savingsLog, jars, budgetSettings, appStartMonth, currentMonth }`

**UI 구성**:

```
[저축 스트릭]          ← 연속 개월 수 + 최근 6개월 점 + 다음 마일스톤
[저축 알 키우기]       ← EggDisplay (탭=흔들기) + 복리 배너
[목표 항아리 3개]      ← SVG 항아리 채움 + 달성률
[절약·재테크 가이드]   ← 필터(전체/절약/재테크) + 카드 10개
```

**저축 알 마일스톤**:

| 개월 | 이모지 | 레이블 |
|:----:|--------|--------|
| 0 | 🪨 | 아직 돌이에요 |
| 1 | 🥚 | 알이 흔들려요 |
| 2 | 🐣 | 부화 중! |
| 4 | 🐓 | 닭이 됐어요! |
| 6+ | 🐉 | 전설의 용! |

**콘텐츠 큐레이션 카드 (10개)**:

| # | 카테고리 | 제목 |
|---|----------|------|
| 1 | 절약 | 장보기 절약 꿀팁 |
| 2 | 재테크 | ETF 투자 입문 |
| 3 | 절약 | 카페 지출 줄이기 |
| 4 | 재테크 | 파킹통장 200% 활용 |
| 5 | 절약 | 구독 서비스 정리 |
| 6 | 재테크 | 체크카드 vs 신용카드 |
| 7 | 절약 | 교통비 절약 |
| 8 | 재테크 | 청약저축 꼭 넣기 |
| 9 | 절약 | 점심 도시락 챌린지 |
| 10 | 재테크 | IRP·연금저축 세액공제 |

---

### 7.5 설정 (Settings.jsx)

**Props**: `{ budgetSettings, onUpdate }`

**특징**: 저장 버튼 없음 — 변경 즉시 500ms 후 자동저장

**아코디언 섹션 구조**:

```
[섹션명 ─────────────────── 합계금액원 ▼]
  클릭 시 인라인으로 세부 항목 펼쳐짐
```

| 섹션 | 합계 표시 | 편집 방식 |
|------|-----------|---------|
| 💰 수입 | 총수입 | 이현·혜원 숫자 입력 |
| 📋 고정지출 - 이현 | 이현 고정 합계 | EditRow × N개 |
| 📋 고정지출 - 혜원 | 혜원 고정 합계 | EditRow × N개 |
| 💚 저축·투자 목표 | 저축+투자 합계 | 저축·투자 숫자 입력 |
| 💵 용돈·비상예비금 | 용돈+예비금 합계 | 이현·혜원·예비금 입력 |
| 🌡️ 기타지출 항목 | catBudget 합계 | EditRow × N개 |

**EditRow 컴포넌트**:

```
[항목명 텍스트] [금액 숫자입력] [이현/혜원/공통 Select]
                                [삭제 버튼]
```

각 섹션 하단: `+ 항목 추가` 버튼으로 행 추가 가능

---

## 8. 컴포넌트 구조

```
App.jsx                         ← 전역 상태, 탭 라우팅
├── Home.jsx
│   ├── AnimatedNumber          숫자 카운트업 (0.5s easing)
│   ├── SwipeRow                터치 스와이프 삭제 컨테이너
│   ├── Modal                   바텀시트 래퍼
│   ├── IncomeModal
│   ├── FixedModal              월별 금액 오버라이드
│   ├── SavingsModal
│   ├── AllowanceModal
│   └── ExpenseEditModal
│
├── Input.jsx                   독립 폼, 내부 state만 사용
│
├── Report.jsx
│   └── Recharts                BarChart, PieChart, Legend, Tooltip
│
├── Challenge.jsx
│   ├── Jar                     SVG 항아리 채움 애니메이션
│   ├── EggDisplay              저축 알 (wobble 애니메이션)
│   └── CONTENT_CARDS[]         하드코딩 큐레이션 데이터
│
└── Settings.jsx
    ├── AccordionSection        토글 펼침/닫힘 섹션
    └── EditRow                 이름·금액·담당자 편집 행
```

---

## 9. 배포 설정

### 9.1 GitHub 저장소

```
저장소: solardinhan-spec/andrej-karpathy-skills
개발 브랜치: claude/compassionate-maxwell-VxylE
메인 브랜치: main (프로덕션)
```

### 9.2 Vercel 배포

- **프로젝트 루트**에 `vercel.json` 필수 (서브디렉토리 `budget-app/` 빌드)
- 개발 브랜치 push → **Preview URL** 자동 생성
- `main` 병합 → **프로덕션 URL** 배포

### 9.3 PWA 설치

| 플랫폼 | 방법 |
|--------|------|
| iOS | Safari → 공유 → 홈 화면에 추가 |
| Android | Chrome → 메뉴 → 앱 설치 |
| 오프라인 지원 | vite-plugin-pwa workbox 정적 에셋 캐싱 |

---

## 10. 예산 데이터 (2026년 5월 기준)

### 10.1 수입

| 항목 | 금액 |
|------|-----:|
| 이현 월급 | 3,388,000원 |
| 혜원 수입 | 217,139원 |
| **총수입** | **3,605,139원** |

### 10.2 고정지출 — 이현

| 항목 | 금액 |
|------|-----:|
| 차량 할부 | 350,000원 |
| KB손보(차량) | 159,000원 |
| 생명보험(이현) | 120,000원 |
| 통신비(이현) | 55,000원 |
| 주차비 | 100,000원 |
| 유류비 | 200,000원 |
| 넷플릭스 | 17,000원 |
| 유튜브프리미엄 | 14,000원 |
| 기타 고정(이현) | 541,250원 |
| **소계** | **1,556,250원** |

### 10.3 고정지출 — 혜원

| 항목 | 금액 |
|------|-----:|
| 공과금 | 150,000원 |
| 생명보험(혜원) | 80,000원 |
| 통신비(혜원) | 55,000원 |
| 기타 고정(혜원) | 253,559원 |
| **소계** | **538,559원** |

### 10.4 예산 구조

| 항목 | 금액 |
|------|-----:|
| 총수입 | 3,605,139원 |
| 고정지출 합계 | 2,094,809원 |
| 저축 목표 | 500,000원 |
| 투자 목표 | 300,000원 |
| 이현 용돈 | 200,000원 |
| 혜원 용돈 | 200,000원 |
| 비상예비금 | 100,000원 |
| **기타지출 예산** | **210,330원** |

### 10.5 기타지출 예산 배분

| 카테고리 | 예산 | 담당 |
|----------|-----:|------|
| 식비 | 80,000원 | 공통 |
| 카페 | 30,000원 | 공통 |
| 쇼핑 | 40,000원 | 공통 |
| 교통 | 20,000원 | 이현 |
| 의료 | 15,000원 | 공통 |
| 여가 | 15,000원 | 공통 |
| 경조사 | 0원 | 공통 |
| 기타 | 10,330원 | 공통 |
| **합계** | **210,330원** | |

---

## 11. 향후 개발 방향

### 단기 (1~3개월)

- [ ] **Supabase 연동** — 온라인 동기화 (기기 간 공유)
- [ ] **목표 항아리 금액 수정** — 직접 편집 기능
- [ ] **푸시 알림** — "오늘 지출 입력 잊지 마세요!"
- [ ] **복리 이율 설정** — 연 4% 고정 → 사용자 지정

### 중기 (3~6개월)

- [ ] **카카오페이·토스 SMS 파싱** — 자동 지출 입력
- [ ] **월별 예산 복사** — 이전 달 설정을 다음 달에 복사
- [ ] **결혼 준비 체크리스트** — 예식장·혼수 등 진행 현황

### 장기

- [ ] **이현/혜원 개별 뷰** — 각자 로그인 후 본인 지출만 조회
- [ ] **AI 지출 분석** — 패턴 인식 및 절약 제안
- [ ] **공동 자산 트래커** — 부동산·주식·예금 통합 관리

---

## 12. 로컬 개발 환경 설정

### 12.1 저장소 클론

```bash
# 개발 브랜치로 클론
git clone -b claude/compassionate-maxwell-VxylE \
  https://github.com/solardinhan-spec/andrej-karpathy-skills.git

cd andrej-karpathy-skills/budget-app
```

### 12.2 의존성 설치 및 실행

```bash
npm install
npm run dev
# → http://localhost:5173
```

### 12.3 프로덕션 빌드

```bash
npm run build    # dist/ 생성
npm run preview  # 빌드 결과물 로컬 미리보기
```

### 12.4 새 기능 개발 순서

1. `store.js`에 상태 타입·초기값 추가
2. `App.jsx`에 핸들러 함수 추가 + Props 전달
3. 해당 화면 컴포넌트 수정
4. `npm run build`로 빌드 확인
5. `git commit & push` → Vercel Preview URL 확인

---

*이 문서는 `budget-app/` 코드베이스를 기반으로 작성되었습니다.*  
*코드 원본: `src/` 디렉토리 | 배포: Vercel Preview URL*
