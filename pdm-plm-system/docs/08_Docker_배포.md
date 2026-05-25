# 08. Docker 컨테이너화 및 Cloud Run 배포

## 8.1 Dockerfile (멀티스테이지 빌드)

```dockerfile
# Dockerfile (pdm-server/)

# ─── 스테이지 1: 의존성 설치 ───────────────────────────────────────
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
# 운영 의존성만 설치 (devDependencies 제외)
RUN npm ci --only=production && npm cache clean --force

# ─── 스테이지 2: 런타임 이미지 (최소화) ────────────────────────────
FROM node:18-alpine AS runtime
WORKDIR /app

# 보안: root 계정 사용 금지
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodeuser

# 의존성 복사
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# 소스 코드 복사
COPY --chown=nodeuser:nodejs src/ ./src/
COPY --chown=nodeuser:nodejs package.json ./

# 비root 사용자로 전환
USER nodeuser

# Cloud Run: PORT 환경변수 사용 필수
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# 헬스체크 (Cloud Run 프로브용)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
```

```dockerfile
# Dockerfile (pdm-dashboard/ - Next.js 프론트엔드)

FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

## 8.2 .dockerignore

```
# .dockerignore
node_modules
.next
.git
.env
.env.local
*.log
serviceAccountKey.json
coverage/
__tests__/
*.test.js
Dockerfile*
docker-compose*
```

## 8.3 docker-compose.yml (로컬 개발 환경)

```yaml
# docker-compose.yml
version: '3.8'

services:
  pdm-backend:
    build:
      context: ./pdm-server
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - PROJECT_ID=pdm-plm-semiconductor
      - STORAGE_BUCKET=pdm-drawings-semiconductor
      - GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json
    volumes:
      # 로컬 개발 시 서비스 계정 키 마운트
      - ./serviceAccountKey.json:/app/serviceAccountKey.json:ro
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  pdm-dashboard:
    build:
      context: ./pdm-dashboard
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3000
      - NEXT_PUBLIC_FIREBASE_PROJECT_ID=pdm-plm-semiconductor
    depends_on:
      pdm-backend:
        condition: service_healthy
```

## 8.4 Cloud Build 파이프라인 (CI/CD)

```yaml
# cloudbuild.yaml (프로젝트 루트)
steps:
  # ─── 백엔드 테스트 ───────────────────────────────────────────────
  - name: 'node:18-alpine'
    id: 'backend-test'
    dir: 'pdm-server'
    entrypoint: 'npm'
    args: ['test', '--', '--ci', '--coverage']

  # ─── 백엔드 Docker 빌드 ──────────────────────────────────────────
  - name: 'gcr.io/cloud-builders/docker'
    id: 'backend-build'
    waitFor: ['backend-test']
    args:
      - 'build'
      - '-t'
      - 'asia-northeast3-docker.pkg.dev/$PROJECT_ID/pdm-containers/pdm-backend:$COMMIT_SHA'
      - '-t'
      - 'asia-northeast3-docker.pkg.dev/$PROJECT_ID/pdm-containers/pdm-backend:latest'
      - './pdm-server'

  # ─── 이미지 푸시 ─────────────────────────────────────────────────
  - name: 'gcr.io/cloud-builders/docker'
    id: 'backend-push'
    waitFor: ['backend-build']
    args:
      - 'push'
      - '--all-tags'
      - 'asia-northeast3-docker.pkg.dev/$PROJECT_ID/pdm-containers/pdm-backend'

  # ─── 프론트엔드 빌드 + 푸시 ─────────────────────────────────────
  - name: 'gcr.io/cloud-builders/docker'
    id: 'frontend-build'
    waitFor: ['backend-test']
    args:
      - 'build'
      - '-t'
      - 'asia-northeast3-docker.pkg.dev/$PROJECT_ID/pdm-containers/pdm-dashboard:$COMMIT_SHA'
      - './pdm-dashboard'

  - name: 'gcr.io/cloud-builders/docker'
    id: 'frontend-push'
    waitFor: ['frontend-build']
    args:
      - 'push'
      - 'asia-northeast3-docker.pkg.dev/$PROJECT_ID/pdm-containers/pdm-dashboard:$COMMIT_SHA'

  # ─── 백엔드 Cloud Run 배포 ───────────────────────────────────────
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-backend'
    waitFor: ['backend-push']
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'pdm-backend'
      - '--image=asia-northeast3-docker.pkg.dev/$PROJECT_ID/pdm-containers/pdm-backend:$COMMIT_SHA'
      - '--platform=managed'
      - '--region=asia-northeast3'
      - '--service-account=pdm-backend-sa@$PROJECT_ID.iam.gserviceaccount.com'
      - '--set-env-vars=PROJECT_ID=$PROJECT_ID,NODE_ENV=production'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--min-instances=1'
      - '--max-instances=10'
      - '--concurrency=80'

  # ─── 프론트엔드 Cloud Run 배포 ───────────────────────────────────
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-frontend'
    waitFor: ['frontend-push']
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'pdm-dashboard'
      - '--image=asia-northeast3-docker.pkg.dev/$PROJECT_ID/pdm-containers/pdm-dashboard:$COMMIT_SHA'
      - '--platform=managed'
      - '--region=asia-northeast3'
      - '--allow-unauthenticated'
      - '--memory=512Mi'

timeout: '1200s'

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'
```

## 8.5 GitHub Actions 연동 (선택사항)

```yaml
# .github/workflows/deploy.yml
name: PDM 시스템 배포

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Workload Identity Federation

    steps:
      - uses: actions/checkout@v4

      - name: Google Cloud 인증
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_SA_EMAIL }}

      - name: Cloud Build 트리거
        run: |
          gcloud builds submit \
            --config=cloudbuild.yaml \
            --project=${{ secrets.GCP_PROJECT_ID }}
```

## 8.6 배포 CLI 명령어 요약

```bash
# ─── 최초 배포 ────────────────────────────────────────────────────

# 1. 인증
gcloud auth login
gcloud config set project pdm-plm-semiconductor

# 2. 백엔드 이미지 빌드 & 배포
gcloud builds submit --tag asia-northeast3-docker.pkg.dev/pdm-plm-semiconductor/pdm-containers/pdm-backend:v1 ./pdm-server

gcloud run deploy pdm-backend \
  --image asia-northeast3-docker.pkg.dev/pdm-plm-semiconductor/pdm-containers/pdm-backend:v1 \
  --platform managed \
  --region asia-northeast3 \
  --service-account pdm-backend-sa@pdm-plm-semiconductor.iam.gserviceaccount.com \
  --set-env-vars "PROJECT_ID=pdm-plm-semiconductor,STORAGE_BUCKET=pdm-drawings-semiconductor" \
  --min-instances 1 \
  --memory 512Mi

# 3. 프론트엔드 Firebase Hosting 배포 (Static Export 사용 시)
cd pdm-dashboard
npm run build
firebase deploy --only hosting

# ─── 롤백 ─────────────────────────────────────────────────────────

# 특정 리비전으로 롤백
gcloud run services update-traffic pdm-backend \
  --to-revisions pdm-backend-00001-xxx=100 \
  --region asia-northeast3

# ─── 서비스 상태 확인 ─────────────────────────────────────────────

gcloud run services describe pdm-backend --region asia-northeast3
gcloud run revisions list --service pdm-backend --region asia-northeast3
```
