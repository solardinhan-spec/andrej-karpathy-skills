# 02. Google Cloud Platform 인프라 설정

## 2.1 프로젝트 초기화

### 사전 준비
- Google Cloud 계정 및 결제 계정
- `gcloud` CLI 설치 (https://cloud.google.com/sdk/docs/install)
- `terraform` 설치 (v1.5 이상)
- `node` 18 이상, `npm` 9 이상

### GCP 프로젝트 생성 및 기본 설정

```bash
# 1. Google Cloud CLI 인증
gcloud auth login
gcloud auth application-default login

# 2. 프로젝트 생성 (프로젝트 ID는 전역 고유값)
gcloud projects create pdm-plm-semiconductor --name="반도체PDM시스템"

# 3. 프로젝트 설정 및 결제 계정 연결
gcloud config set project pdm-plm-semiconductor
gcloud billing projects link pdm-plm-semiconductor \
  --billing-account=XXXXXX-XXXXXX-XXXXXX

# 4. 필수 API 서비스 일괄 활성화 (Docker/Cloud Run/Artifact Registry 미사용)
gcloud services enable \
  firestore.googleapis.com \
  storage.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  identitytoolkit.googleapis.com \
  firebasehosting.googleapis.com \
  gmail.googleapis.com \
  drive.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com
```

> **참고:** DWG 전용·서버리스 구조이므로 `run.googleapis.com`(Cloud Run),
> `artifactregistry.googleapis.com`는 활성화하지 않는다. 백엔드는
> Cloud Functions 2nd gen으로 배포한다. (Cloud Build는 Functions 빌드에 내부적으로 사용)

## 2.2 Firestore 설정

```bash
# Firestore Native 모드로 초기화 (asia-northeast3 = 서울 리전)
gcloud firestore databases create \
  --location=asia-northeast3 \
  --type=firestore-native

# TTL 정책 설정 (Obsolete 도면 자동 정리 - 선택사항, 규정에 따라 보존 필요 시 생략)
# 실제 반도체 도면은 법적 보존 의무가 있으므로 삭제하지 않는 것을 강력 권장
```

## 2.3 Cloud Storage 버킷 설정

> DWG 전용·소용량이므로 단일 STANDARD 버킷으로 충분하다. 도면은 법적 보존
> 의무가 있어 삭제하지 않으며, 버전 관리(versioning)로 덮어쓰기 이력을 보존한다.

```bash
# 도면 저장 버킷 생성 (버전 관리 활성화 필수)
gcloud storage buckets create gs://pdm-drawings-semiconductor \
  --location=asia-northeast3 \
  --uniform-bucket-level-access \
  --public-access-prevention

# 버전 관리 활성화 (파일 덮어쓰기 시 이전 버전 보존)
gcloud storage buckets update gs://pdm-drawings-semiconductor \
  --versioning

# 수명 주기 정책: 90일 이후 Nearline, 365일 이후 Coldline으로 자동 이동 (비용 최적화)
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "SetStorageClass", "storageClass": "NEARLINE" },
        "condition": { "age": 90, "matchesStorageClass": ["STANDARD"] }
      },
      {
        "action": { "type": "SetStorageClass", "storageClass": "COLDLINE" },
        "condition": { "age": 365, "matchesStorageClass": ["NEARLINE"] }
      }
    ]
  }
}
EOF
gcloud storage buckets update gs://pdm-drawings-semiconductor \
  --lifecycle-file=lifecycle.json
```

## 2.4 IAM 역할 및 서비스 계정 설정

```bash
# 백엔드 API 서버용 서비스 계정
gcloud iam service-accounts create pdm-backend-sa \
  --display-name="PDM Backend Service Account"

# Cloud Functions용 서비스 계정
gcloud iam service-accounts create pdm-functions-sa \
  --display-name="PDM Cloud Functions Service Account"

# 백엔드 SA에 필요 권한 부여
SA_EMAIL="pdm-backend-sa@pdm-plm-semiconductor.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding pdm-plm-semiconductor \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding pdm-plm-semiconductor \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding pdm-plm-semiconductor \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"

# 서비스 계정 키 생성 (Secret Manager에 저장)
gcloud iam service-accounts keys create ./serviceAccountKey.json \
  --iam-account=${SA_EMAIL}

# Secret Manager에 키 등록 (파일을 직접 노출하지 않음)
gcloud secrets create pdm-backend-sa-key \
  --data-file=./serviceAccountKey.json \
  --replication-policy=user-managed \
  --locations=asia-northeast3

# 로컬 파일은 즉시 삭제
rm ./serviceAccountKey.json
```

## 2.5 Autodesk APS(Forge) 자격 증명 등록 (DWG 뷰어용)

DWG 웹 열람은 Autodesk APS Model Derivative + Viewer를 사용한다.
https://aps.autodesk.com 에서 앱을 생성해 Client ID/Secret을 발급받고,
Secret Manager에 보관한다.

```bash
# APS Client ID 저장
echo -n "YOUR_APS_CLIENT_ID" | gcloud secrets create aps-client-id \
  --data-file=- --replication-policy=user-managed --locations=asia-northeast3

# APS Client Secret 저장
echo -n "YOUR_APS_CLIENT_SECRET" | gcloud secrets create aps-client-secret \
  --data-file=- --replication-policy=user-managed --locations=asia-northeast3

# 백엔드 SA에 두 시크릿 접근 권한 부여
for SECRET in aps-client-id aps-client-secret pdm-backend-sa-key; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
done
```

> **참고:** APS는 DWG → SVF2 변환 후 브라우저 Viewer에서 렌더링한다.
> 변환된 모델의 보존/삭제 정책은 APS 콘솔에서 별도 관리한다.

## 2.6 Firebase Authentication (관리자 1회 발급 정책)

계정은 **자가 가입 없이 관리자가 1회 발급**한다.

```bash
# Firebase CLI 설치 및 로그인
npm install -g firebase-tools
firebase login

# 기존 GCP 프로젝트에 Firebase 연결
firebase projects:addfirebase pdm-plm-semiconductor

# Firebase 초기화 (Firestore, Functions, Hosting 선택 / Hosting만 프론트엔드용)
firebase init
```

### 자가 가입(self sign-up) 차단

Firebase Console → Authentication → Settings 에서:
- **이메일/비밀번호** 공급자만 활성화 (Google 등 소셜 로그인 비활성)
- 신규 사용자 생성은 **백엔드 Admin API**(`POST /api/admin/users`)로만 수행
- 클라이언트 SDK의 `createUserWithEmailAndPassword`는 프론트엔드에서 사용하지 않음

### 최초 관리자(부트스트랩) 계정 생성

```bash
# 최초 1명의 admin 계정은 스크립트로 직접 생성 (이후 admin이 웹에서 발급)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
  node scripts/bootstrap_admin.js admin@company.com '초기관리자'
```

```javascript
// scripts/bootstrap_admin.js
const admin = require('firebase-admin');
admin.initializeApp();

(async () => {
  const [email, name] = process.argv.slice(2);
  const user = await admin.auth().createUser({
    email,
    password: Math.random().toString(36).slice(2) + 'Aa1!', // 임시 비밀번호
    displayName: name
  });
  await admin.firestore().collection('users').doc(user.uid).set({
    name, email, role: 'admin',
    department: '시스템관리',
    createdBy: 'bootstrap',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log(`[부트스트랩] admin 계정 생성: ${email} (uid=${user.uid})`);
  console.log('→ 비밀번호 재설정 메일을 발송하거나 콘솔에서 비밀번호를 설정하세요.');
})();
```

## 2.7 환경 변수 관리 (.env 구조)

```bash
# .env.production (실제 값은 Secret Manager에서 로드)
PROJECT_ID=pdm-plm-semiconductor
STORAGE_BUCKET=pdm-drawings-semiconductor
FIRESTORE_DATABASE=(default)
REGION=asia-northeast3
# APS(Forge) — 운영에서는 Secret Manager에서 로드, 로컬에서만 직접 지정
APS_CLIENT_ID=
APS_CLIENT_SECRET=
APS_BUCKET_KEY=pdm-dwg-derivatives   # APS OSS 버킷 키 (소문자/숫자)

# .env.local (개발 환경 - 절대 커밋 금지)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
FIREBASE_API_KEY=AIzaSy...
```

> **보안 주의:** `.env.local` 및 `serviceAccountKey.json`은 반드시 `.gitignore`에 추가

## 2.8 Terraform IaC (선택 사항 - 인프라 코드화)

```hcl
# infra/main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  backend "gcs" {
    bucket = "pdm-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = "asia-northeast3"
}

# Firestore
resource "google_firestore_database" "pdm" {
  project     = var.project_id
  name        = "(default)"
  location_id = "asia-northeast3"
  type        = "FIRESTORE_NATIVE"
}

# Cloud Storage
resource "google_storage_bucket" "drawings" {
  name          = "pdm-drawings-${var.project_id}"
  location      = "ASIA-NORTHEAST3"
  force_destroy = false

  versioning {
    enabled = true
  }

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
}

# 백엔드는 Cloud Functions 2nd gen으로 배포한다 (Docker/Cloud Run 미사용).
# Functions는 firebase.json + `firebase deploy --only functions`로 배포하므로
# Terraform에는 버킷/Firestore/시크릿 등 상태 인프라만 정의하고
# 함수 자체는 Firebase CLI 파이프라인에 위임한다. (docs/08 참고)

# APS 자격 증명 시크릿 (값은 콘솔/CLI로 별도 주입)
resource "google_secret_manager_secret" "aps_client_id" {
  secret_id = "aps-client-id"
  replication { user_managed { replicas { location = "asia-northeast3" } } }
}

resource "google_secret_manager_secret" "aps_client_secret" {
  secret_id = "aps-client-secret"
  replication { user_managed { replicas { location = "asia-northeast3" } } }
}
```

```hcl
# infra/variables.tf
variable "project_id" {
  description = "GCP 프로젝트 ID"
  type        = string
  default     = "pdm-plm-semiconductor"
}
```

```bash
# Terraform 실행
cd infra
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```
