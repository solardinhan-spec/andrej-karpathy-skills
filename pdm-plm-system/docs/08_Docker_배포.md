# 08. 서버리스 배포 (Cloud Functions + Firebase Hosting)

> **Docker 미사용.** DWG 전용·소용량 구조이므로 컨테이너/Cloud Run/Artifact Registry
> 없이 Cloud Functions 2nd gen(백엔드) + Firebase Hosting(프론트엔드)으로 배포한다.

## 8.1 firebase.json (배포 설정)

> 본 저장소에서 함수 소스 디렉토리는 `backend/`이다. 아래 `source` 값은 실제
> 디렉토리명(`backend`)으로 맞춘다. (문서 예시의 `pdm-functions`와 동일 대상)

```json
{
  "functions": {
    "source": "backend",
    "runtime": "nodejs18",
    "region": "asia-northeast3"
  },
  "hosting": {
    "public": "pdm-dashboard/out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/api/**", "function": "api" },
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "firestore": {
    "rules": "infra/firestore.rules"
  },
  "storage": {
    "rules": "infra/storage.rules"
  }
}
```

> `/api/**` 요청은 `exports.api`(Express) 함수로 라우팅되고, 나머지는 Next.js
> 정적 산출물로 서빙된다. 프론트엔드는 `next.config.js`에 `output: 'export'`를 설정한다.

## 8.2 백엔드 배포 (Cloud Functions)

```bash
cd pdm-functions
npm install

# APS 시크릿을 Functions에 연결 (index.js의 secrets 선언과 일치)
firebase functions:secrets:set aps-client-id
firebase functions:secrets:set aps-client-secret

# 전체 함수 배포 (api + 트리거)
firebase deploy --only functions

# 특정 함수만 배포
firebase deploy --only functions:api
firebase deploy --only functions:onDrawingReleased

# 로그 확인
gcloud functions logs read api --region=asia-northeast3 --gen2
```

배포 후 API 엔드포인트:
```
https://asia-northeast3-pdm-plm-semiconductor.cloudfunctions.net/api
```
프론트엔드의 `NEXT_PUBLIC_API_URL`에 이 값을 설정한다 (또는 Hosting rewrite로 `/api` 사용).

## 8.3 프론트엔드 배포 (Firebase Hosting)

```bash
cd pdm-dashboard

# Next.js 정적 export
# next.config.js: module.exports = { output: 'export' }
npm run build      # → out/ 디렉토리 생성

# Hosting 배포
firebase deploy --only hosting
```

배포 후:
```
https://pdm-plm-semiconductor.web.app
```

## 8.4 Firestore/Storage 규칙 배포

```bash
firebase deploy --only firestore:rules,storage:rules
```

## 8.5 전체 한 번에 배포

```bash
firebase deploy
# = functions + hosting + firestore:rules + storage:rules
```

## 8.6 CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: PDM 배포 (서버리스)

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write   # Workload Identity Federation
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with: { node-version: '18' }

      # 백엔드 의존성 + 테스트
      - run: npm ci && npm test
        working-directory: pdm-functions

      # 프론트엔드 빌드
      - run: npm ci && npm run build
        working-directory: pdm-dashboard

      - name: Google Cloud 인증
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_SA_EMAIL }}

      - name: Firebase 배포
        run: npx firebase-tools deploy --project pdm-plm-semiconductor --non-interactive
```

> Docker 이미지 빌드/푸시 단계가 없으므로 파이프라인이 단순하고 빌드 시간이 짧다.

## 8.7 로컬 개발 (에뮬레이터)

```bash
# Docker/docker-compose 대신 Firebase 에뮬레이터 사용
firebase emulators:start --only functions,firestore,storage,auth

# 프론트엔드 개발 서버 (별도 터미널)
cd pdm-dashboard && npm run dev   # http://localhost:3000
```

> 에뮬레이터는 Firestore/Storage/Auth/Functions를 로컬에서 모사한다.
> APS 변환은 외부 서비스이므로 에뮬레이터에서는 실제 APS 자격 증명이 필요하다
> (또는 `apsUrn`을 mock 처리하여 뷰어 흐름만 점검).

## 8.8 롤백

```bash
# Functions: 이전 버전으로 롤백
gcloud functions deploy api --gen2 --region=asia-northeast3 --source=<이전 소스>

# Hosting: 콘솔 또는 CLI에서 이전 릴리스로 롤백
firebase hosting:rollback
```

## 8.9 인프라 정리 메모 (구버전 대비 제거된 항목)

| 제거됨 (구 Docker 구조) | 대체 (서버리스) |
|------------------------|----------------|
| `Dockerfile`, `docker-compose.yml` | firebase.json + 에뮬레이터 |
| Cloud Run 배포 | Cloud Functions 2nd gen |
| Artifact Registry | (불필요) |
| Cloud Build Docker 빌드 단계 | `firebase deploy` |
