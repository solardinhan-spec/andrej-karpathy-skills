# n8n Gmail 아침 브리핑 - 설치 및 운영 가이드

## 목차
1. [최초 설치](#1-최초-설치)
2. [Credential 설정](#2-credential-설정)
3. [워크플로우 Import](#3-워크플로우-import)
4. [실행/중지/로그](#4-실행중지로그)
5. [다른 PC로 이동](#5-다른-pc로-이동)

---

## 1. 최초 설치

### 전제 조건
- Docker Desktop 설치 및 실행 중
- 이 폴더(`n8n-gmail-briefing/`)가 있는 위치에서 터미널 실행

### 단계별 설치

```bash
# 1. .env 파일 생성
cp .env.example .env

# 2. .env 파일 편집 - 반드시 수정할 항목:
#    POSTGRES_PASSWORD=  (강력한 비밀번호)
#    N8N_ENCRYPTION_KEY= (32자 hex, 아래 명령으로 생성)
openssl rand -hex 32
# 출력된 값을 N8N_ENCRYPTION_KEY에 입력

# 3. 컨테이너 실행
docker compose up -d

# 4. 로그 확인 (정상 시작 확인)
docker compose logs -f n8n
# "Editor is now accessible via: http://localhost:5678" 메시지 확인 후 Ctrl+C

# 5. 브라우저에서 접속
# http://localhost:5678
# 최초 접속 시 관리자 계정 생성
```

---

## 2. Credential 설정

n8n UI (`http://localhost:5678`) 접속 후 진행합니다.

### 2-1. Google OAuth2 설정 (Gmail + Calendar 공통)

**Google Cloud Console 준비:**
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성 (예: `n8n-briefing`)
3. API 및 서비스 → 라이브러리에서 활성화:
   - Gmail API
   - Google Calendar API
4. API 및 서비스 → OAuth 동의 화면:
   - 외부 선택 → 앱 이름 입력 → 저장
   - 테스트 사용자에 `han@solardin.com` 추가
5. API 및 서비스 → 사용자 인증 정보:
   - `+ 사용자 인증 정보 만들기` → OAuth 2.0 클라이언트 ID
   - 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI 추가:
     ```
     http://localhost:5678/rest/oauth2-credential/callback
     ```
   - 클라이언트 ID, 시크릿 복사

**n8n에서 Credential 추가:**
1. 좌측 메뉴 → Credentials → Add Credential
2. `Google OAuth2 API` 검색 선택
3. Client ID, Client Secret 입력
4. Scopes에 추가:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/gmail.send
   https://www.googleapis.com/auth/calendar.readonly
   ```
5. `Connect my account` 클릭 → Google 계정(`han@solardin.com`) 로그인 및 허용
6. 저장 후 Credential ID 메모

### 2-2. Gmail Credential

1. Add Credential → `Gmail OAuth2` 검색
2. 위에서 만든 Google OAuth2 Credential 선택
3. 저장

### 2-3. Google Calendar Credential

1. Add Credential → `Google Calendar OAuth2 API` 검색
2. 위에서 만든 Google OAuth2 Credential 선택
3. 저장

### 2-4. OpenAI Credential

1. Add Credential → `OpenAI API` 검색
2. API Key: `sk-...` 입력 (https://platform.openai.com/api-keys)
3. 저장

### 2-5. 카카오 Access Token 갱신

카카오 Access Token은 6시간마다 만료됩니다.
장기 사용을 위해 두 가지 방법 중 선택:

**방법 A: 환경변수 방식 (간단, 수동 갱신 필요)**
- `.env` 파일의 `KAKAO_ACCESS_TOKEN` 값을 주기적으로 갱신
- https://developers.kakao.com → 내 앱 → 도구 → REST API 테스트에서 토큰 발급

**방법 B: Refresh Token 자동 갱신 (권장)**
- 카카오 토큰 갱신 워크플로우를 별도로 구성 (고급)

---

## 3. 워크플로우 Import

```
n8n UI → 좌측 Workflows → Import from File
→ workflow.json 선택
```

Import 후 각 노드의 Credential을 위에서 생성한 것으로 연결:
- `Gmail 메일 조회` 노드 → Gmail OAuth2 Credential 선택
- `Google Calendar 5일 일정 조회` 노드 → Google Calendar Credential 선택
- `AI 브리핑 생성 (GPT-4o)` 노드 → OpenAI Credential 선택
- `브리핑 메일 발송` 노드 → Gmail OAuth2 Credential 선택

**System Prompt 설정:**
`AI 브리핑 생성 (GPT-4o)` 노드 → System Message에 `system-prompt.md` 내용 붙여넣기

워크플로우 우측 상단 토글을 **Active**로 변경합니다.

---

## 4. 실행/중지/로그

### 컨테이너 관리

```bash
# 시작
docker compose up -d

# 중지 (데이터 유지)
docker compose stop

# 재시작
docker compose restart n8n

# 완전 종료 (데이터 유지)
docker compose down

# 완전 삭제 (데이터까지 삭제 - 주의!)
docker compose down -v
```

### 로그 확인

```bash
# n8n 실시간 로그
docker compose logs -f n8n

# PostgreSQL 로그
docker compose logs -f postgres

# 최근 100줄만
docker compose logs --tail=100 n8n
```

### 수동 테스트 실행

n8n UI → 워크플로우 열기 → 우측 상단 `Test workflow` 버튼

---

## 5. 다른 PC로 이동

### 방법 1: Volume 백업 (권장)

**현재 PC에서 백업:**
```bash
# n8n 데이터 백업 (Credentials, Workflows, 실행 이력)
docker run --rm \
  -v n8n-gmail-briefing_n8n_data:/source \
  -v $(pwd):/backup \
  alpine tar czf /backup/n8n_backup_$(date +%Y%m%d).tar.gz -C /source .

# PostgreSQL 백업
docker compose exec postgres pg_dump -U n8n n8n > n8n_db_backup_$(date +%Y%m%d).sql

# .env 파일도 복사 (중요: N8N_ENCRYPTION_KEY 동일해야 함)
cp .env .env.backup
```

**새 PC에서 복원:**
```bash
# 1. 이 폴더 전체 복사 (docker-compose.yml, .env 포함)
# 2. 백업 파일들 같은 폴더에 복사

# 3. 컨테이너 시작 (빈 상태)
docker compose up -d

# 4. n8n 데이터 복원
docker run --rm \
  -v n8n-gmail-briefing_n8n_data:/target \
  -v $(pwd):/backup \
  alpine tar xzf /backup/n8n_backup_YYYYMMDD.tar.gz -C /target

# 5. DB 복원
docker compose exec -T postgres psql -U n8n n8n < n8n_db_backup_YYYYMMDD.sql

# 6. 재시작
docker compose restart n8n
```

### 방법 2: 워크플로우만 이동 (Credentials 재설정 필요)

```
n8n UI → Workflows → 해당 워크플로우 → ⋮ → Export
→ 새 PC에서 Import 후 Credentials 재설정
```

### 중요 주의사항

> `N8N_ENCRYPTION_KEY`는 반드시 동일한 값을 유지해야 합니다.
> 다른 값으로 복원 시 저장된 Credentials(API 키, OAuth 토큰)이 복호화 불가합니다.

---

## 트러블슈팅

### Gmail API 할당량 초과
- 기본 1일 1,000,000 units (개인 사용에는 충분)
- 초과 시 Google Cloud Console에서 할당량 확인

### 카카오 토큰 만료
```
HTTP 401 Unauthorized 에러 발생 시
→ 새 Access Token 발급 후 .env 업데이트
→ docker compose restart n8n
```

### 공휴일 목록 업데이트
`공휴일/주말 체크 & 날짜 계산` 노드의 Code에서 `KR_HOLIDAYS` 배열에 연도별 공휴일 추가

### Armaranth10 POP3 읽음 처리
POP3 수신 메일은 Gmail API를 통한 읽음 상태 반영이 지연될 수 있습니다.
필터링 로직에서 POP3 계정 메일은 항상 포함되도록 발신 도메인을 화이트리스트에 추가하세요.
