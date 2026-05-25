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

# 4. 필수 API 서비스 일괄 활성화
gcloud services enable \
  firestore.googleapis.com \
  storage.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloudfunctions.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  identitytoolkit.googleapis.com \
  gmail.googleapis.com \
  drive.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com
```

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

## 2.5 Artifact Registry 설정 (Docker 이미지 저장소)

```bash
# Docker 이미지 저장소 생성
gcloud artifacts repositories create pdm-containers \
  --repository-format=docker \
  --location=asia-northeast3 \
  --description="PDM/PLM 시스템 컨테이너 이미지"

# Docker 인증 설정
gcloud auth configure-docker asia-northeast3-docker.pkg.dev
```

## 2.6 Firebase 프로젝트 연결

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 기존 GCP 프로젝트에 Firebase 연결
firebase projects:addfirebase pdm-plm-semiconductor

# Firebase 초기화 (Firestore, Functions, Hosting 선택)
firebase init
```

## 2.7 환경 변수 관리 (.env 구조)

```bash
# .env.production (실제 값은 Secret Manager에서 로드)
PROJECT_ID=pdm-plm-semiconductor
STORAGE_BUCKET=pdm-drawings-semiconductor
FIRESTORE_DATABASE=(default)
REGION=asia-northeast3

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

# Cloud Run
resource "google_cloud_run_v2_service" "pdm_backend" {
  name     = "pdm-backend"
  location = "asia-northeast3"

  template {
    service_account = google_service_account.pdm_backend.email
    containers {
      image = "asia-northeast3-docker.pkg.dev/${var.project_id}/pdm-containers/pdm-backend:latest"
      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }
    }
  }
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
