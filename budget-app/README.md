# 우리집 가계부 (J&H 가계부)

부부가 함께 쓰는 **공유 가계부 PWA**입니다. 프로토타입을 React + Vite로 재구축하고,
아이폰 홈 화면에 추가하면 네이티브 앱처럼 동작하도록 만들었습니다.

- 📱 **아이폰 설치형 PWA** — Safari → 공유 → "홈 화면에 추가"
- ☁️ **부부 실시간 공유** — Supabase(익명 로그인 + 초대 코드)로 두 기기가 같은 데이터를 실시간 동기화
- 💾 **오프라인/로컬 폴백** — Supabase를 연결하지 않으면 이 기기에만 저장되는 로컬 모드로 동작
- 🧮 홈 / 월별 / 저축 / 통계 4개 탭, 빠른입력(키패드), 스와이프 삭제, 수정 모달 — 프로토타입 기능 그대로

화면: 홈(남은 금액·도넛·구성원 막대) · 월별(수입/지출/저축, 고정·변동, 담당 필터) · 저축(누적 자산·증감·이월 차트) · 통계(저축률·비중·월 비교).

---

## 빠른 시작 (로컬 개발)

```bash
cd budget-app
npm install
npm run dev          # http://localhost:5173
```

`.env` 없이 실행하면 **로컬 모드**(이 기기 localStorage 저장)로 동작합니다. 시드 데이터가 채워진 상태로 바로 확인할 수 있습니다.

---

## 부부 실시간 공유 설정 (Supabase)

### 1) Supabase 프로젝트 만들기
1. https://supabase.com 에서 무료 프로젝트 생성
2. **Authentication → Providers → Anonymous Sign-ins**를 **켜기** (이메일 없이 로그인하는 방식)
3. **SQL Editor**에 [`supabase/schema.sql`](./supabase/schema.sql) 전체를 붙여넣고 **Run** (테이블·RLS·초대코드 함수·실시간 한 번에 설정됨)
4. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사

### 2) 환경변수 설정
`.env.example`를 복사해 `.env`를 만들고 값을 채웁니다.
```bash
cp .env.example .env
```
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 3) 사용 흐름
- 앱을 처음 열면 → **"새 가계부 만들기"** (시드 데이터가 자동으로 채워짐)
- 우상단 ⚙️ 설정에서 **초대 코드**(6자리) 확인 → 배우자에게 전달
- 배우자는 앱에서 **"초대 코드로 참여하기"**에 코드 입력 → 같은 가계부를 실시간으로 공유

> 참고: 시드(데모) 데이터는 가계부를 만든 사람에게 자동으로 채워집니다. 필요 없으면 각 항목을 스와이프 삭제하거나 수정해 사용하세요.

---

## Vercel 배포

1. 이 저장소를 GitHub에 푸시
2. [Vercel](https://vercel.com)에서 **New Project → 이 저장소 import**
3. **Root Directory를 `budget-app`로 지정** (저장소 루트가 아니라 앱 폴더)
   - Framework Preset: **Vite** (자동 감지), Build: `npm run build`, Output: `dist`
4. **Environment Variables**에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가
5. Deploy → 발급된 URL을 아이폰 Safari에서 열기

### 아이폰에 설치
Safari로 배포 URL 접속 → 하단 **공유 버튼** → **"홈 화면에 추가"** → 전체화면 앱으로 실행됩니다.

---

## 기술 메모

- **스택**: Vite + React 18, `@supabase/supabase-js`, `vite-plugin-pwa`(서비스워커·매니페스트·오프라인 캐시)
- **차트**: 의존성 없이 인라인 SVG (도넛 = `stroke-dasharray`, 라인 = `path`)
- **데이터 계층**: `src/lib/useBudget.js` 한 곳에서 클라우드/로컬 모드를 모두 처리
  - 클라우드: `entries`/`savings_cards` 테이블 + Postgres Realtime 구독 → 변경 시 양쪽 화면 자동 갱신
  - 로컬: `localStorage`(`budget:data:v1`)
- **보안**: RLS로 가계부 멤버만 자기 데이터에 접근. 가입/참여는 `create_household` / `join_household` RPC로 처리
- **아이콘 재생성**: `python3 scripts/gen_icons.py`
- **화면 검증(헤드리스)**: `npm run preview` 후 `node scripts/verify.mjs`

### 폴더 구조
```
budget-app/
├─ src/
│  ├─ App.jsx                  # 화면 전환·모달·상태 오케스트레이션
│  ├─ components/              # Home/MonthDetail/Savings/Stats/TabBar/QuickModal/EditModal/Onboarding/Settings/Charts
│  └─ lib/                     # useBudget(데이터), compute(집계), constants, seed, supabase
├─ supabase/schema.sql         # DB 스키마 + RLS + RPC + Realtime
├─ public/                     # 아이콘·favicon
└─ vercel.json                 # Vite + SPA rewrite
```
