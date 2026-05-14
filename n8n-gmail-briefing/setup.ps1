# n8n Gmail 브리핑 - Windows 자동 설치 스크립트
# 실행 방법: PowerShell을 관리자로 열고 아래 명령어 실행
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup.ps1

$ErrorActionPreference = "Stop"
$WorkDir = "$env:USERPROFILE\workroom\n8n-briefing"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  n8n Gmail 브리핑 자동 설치 스크립트" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. 작업 폴더 생성 ──────────────────────────────────────
Write-Host "[1/5] 작업 폴더 생성: $WorkDir" -ForegroundColor Yellow

if (!(Test-Path $WorkDir)) {
    New-Item -ItemType Directory -Path $WorkDir | Out-Null
    Write-Host "      완료: 폴더 생성됨" -ForegroundColor Green
} else {
    Write-Host "      완료: 폴더 이미 존재함" -ForegroundColor Green
}

# ── 2. 파일 다운로드 ────────────────────────────────────────
Write-Host "[2/5] GitHub에서 파일 다운로드..." -ForegroundColor Yellow

$RepoUrl = "https://raw.githubusercontent.com/solardinhan-spec/andrej-karpathy-skills/claude/n8n-docker-workflow-yirwM/n8n-gmail-briefing"
$Files = @("docker-compose.yml", ".env.example", "workflow.json", "system-prompt.md", "SETUP-GUIDE.md")

foreach ($File in $Files) {
    $Dest = Join-Path $WorkDir $File
    if (!(Test-Path $Dest)) {
        try {
            Invoke-WebRequest -Uri "$RepoUrl/$File" -OutFile $Dest -UseBasicParsing
            Write-Host "      다운로드: $File" -ForegroundColor Green
        } catch {
            Write-Host "      실패: $File - $_" -ForegroundColor Red
            Write-Host "      수동으로 파일을 복사해주세요." -ForegroundColor Red
        }
    } else {
        Write-Host "      건너뜀 (이미 존재): $File" -ForegroundColor DarkGray
    }
}

# ── 3. .env 파일 생성 ───────────────────────────────────────
Write-Host "[3/5] .env 파일 생성..." -ForegroundColor Yellow

$EnvPath = Join-Path $WorkDir ".env"

if (Test-Path $EnvPath) {
    Write-Host "      .env 파일이 이미 존재합니다. 건너뜀." -ForegroundColor DarkGray
} else {
    # 암호화 키 자동 생성 (64자 hex)
    $EncKey = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })

    # DB 비밀번호 자동 생성 (24자 alphanumeric)
    $Chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    $DbPass = -join ((1..24) | ForEach-Object { $Chars[(Get-Random -Maximum $Chars.Length)] })

    $EnvContent = @"
# ============================================================
# n8n Gmail 브리핑 - 환경 변수
# 자동 생성일: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# ============================================================

# PostgreSQL
POSTGRES_DB=n8n
POSTGRES_USER=n8n
POSTGRES_PASSWORD=$DbPass

# n8n 암호화 키 (절대 변경하지 마세요 - 변경 시 Credential 복호화 불가)
N8N_ENCRYPTION_KEY=$EncKey

# n8n 호스트 설정
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_EDITOR_BASE_URL=http://localhost:5678
WEBHOOK_URL=http://localhost:5678/

# 실행 모드
EXECUTIONS_MODE=regular

# AI API 키 (여기 또는 n8n UI에서 직접 설정)
OPENAI_API_KEY=sk-proj-여기에_OpenAI_키_입력
ANTHROPIC_API_KEY=sk-ant-여기에_Claude_키_입력

# 카카오 (Access Token은 6시간마다 만료 - 주기적 갱신 필요)
KAKAO_ACCESS_TOKEN=여기에_카카오_액세스_토큰_입력
"@

    $EnvContent | Out-File -FilePath $EnvPath -Encoding UTF8 -NoNewline
    Write-Host "      완료: .env 파일 생성됨" -ForegroundColor Green

    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────┐" -ForegroundColor Magenta
    Write-Host "  │  자동 생성된 값 (반드시 메모하세요!)    │" -ForegroundColor Magenta
    Write-Host "  ├─────────────────────────────────────────┤" -ForegroundColor Magenta
    Write-Host "  │  DB 비밀번호   : $DbPass" -ForegroundColor White
    Write-Host "  │  암호화 키     : $EncKey" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────┘" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  !! 이 값들을 안전한 곳(메모앱, 비밀번호관리자)에 저장하세요 !!" -ForegroundColor Red
    Write-Host ""

    # 클립보드에 복사
    $ClipText = "N8N_ENCRYPTION_KEY=$EncKey`nPOSTGRES_PASSWORD=$DbPass"
    $ClipText | Set-Clipboard
    Write-Host "      (클립보드에 복사됨)" -ForegroundColor DarkGray
}

# ── 4. Docker 실행 여부 확인 ────────────────────────────────
Write-Host "[4/5] Docker 상태 확인..." -ForegroundColor Yellow

try {
    $DockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      완료: Docker 실행 중" -ForegroundColor Green
    } else {
        Write-Host "      경고: Docker Desktop이 실행되지 않았습니다." -ForegroundColor Red
        Write-Host "      Docker Desktop을 먼저 시작한 후 다시 실행하세요." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "      경고: Docker를 찾을 수 없습니다. Docker Desktop 설치를 확인하세요." -ForegroundColor Red
    exit 1
}

# ── 5. 기존 n8n 컨테이너 확인 ──────────────────────────────
Write-Host "[5/5] 기존 n8n 컨테이너 확인..." -ForegroundColor Yellow

$ExistingN8n = docker ps -a --filter "name=n8n" --format "{{.Names}}" 2>&1
if ($ExistingN8n) {
    Write-Host "      발견된 기존 컨테이너: $ExistingN8n" -ForegroundColor Yellow
    $Confirm = Read-Host "      기존 n8n 컨테이너를 중지 및 삭제하시겠습니까? (y/N)"
    if ($Confirm -eq 'y' -or $Confirm -eq 'Y') {
        docker stop n8n 2>&1 | Out-Null
        docker rm n8n 2>&1 | Out-Null
        Write-Host "      완료: 기존 컨테이너 삭제됨" -ForegroundColor Green
    } else {
        Write-Host "      건너뜀. 포트 충돌이 발생할 수 있습니다." -ForegroundColor DarkGray
    }
} else {
    Write-Host "      완료: 기존 n8n 컨테이너 없음" -ForegroundColor Green
}

# ── 완료 메시지 ─────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  설치 준비 완료!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "다음 명령어로 n8n을 시작하세요:" -ForegroundColor White
Write-Host ""
Write-Host "  cd `"$WorkDir`"" -ForegroundColor Yellow
Write-Host "  docker compose up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "시작 후 브라우저에서 접속:" -ForegroundColor White
Write-Host "  http://localhost:5678" -ForegroundColor Cyan
Write-Host ""
Write-Host "상세 설정은 SETUP-GUIDE.md 파일을 참고하세요." -ForegroundColor DarkGray
Write-Host ""

# 작업 폴더 열기
$OpenFolder = Read-Host "작업 폴더를 파일 탐색기로 여시겠습니까? (Y/n)"
if ($OpenFolder -ne 'n' -and $OpenFolder -ne 'N') {
    Start-Process explorer.exe $WorkDir
}
