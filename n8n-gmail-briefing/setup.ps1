$ErrorActionPreference = "Stop"
$WorkDir = "$env:USERPROFILE\workroom\n8n-briefing"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  n8n Gmail Briefing - Setup Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# 1. Create working directory
Write-Host "[1/5] Creating directory: $WorkDir" -ForegroundColor Yellow
if (!(Test-Path $WorkDir)) {
    New-Item -ItemType Directory -Path $WorkDir | Out-Null
}
Write-Host "      Done" -ForegroundColor Green

# 2. Download files
Write-Host "[2/5] Downloading files from GitHub..." -ForegroundColor Yellow
$Base = "https://raw.githubusercontent.com/solardinhan-spec/andrej-karpathy-skills/claude/n8n-docker-workflow-yirwM/n8n-gmail-briefing"
$Files = @("docker-compose.yml", ".env.example", "workflow.json", "system-prompt.md", "SETUP-GUIDE.md")

foreach ($f in $Files) {
    $dest = Join-Path $WorkDir $f
    if (!(Test-Path $dest)) {
        Invoke-WebRequest -Uri "$Base/$f" -OutFile $dest -UseBasicParsing
        Write-Host "      Downloaded: $f" -ForegroundColor Green
    } else {
        Write-Host "      Skipped (exists): $f" -ForegroundColor DarkGray
    }
}

# 3. Generate .env
Write-Host "[3/5] Generating .env file..." -ForegroundColor Yellow
$EnvPath = Join-Path $WorkDir ".env"

if (Test-Path $EnvPath) {
    Write-Host "      .env already exists, skipping." -ForegroundColor DarkGray
} else {
    $EncKey = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
    $Chars  = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    $DbPass = -join ((1..24) | ForEach-Object { $Chars[(Get-Random -Maximum $Chars.Length)] })

    $lines = @(
        "POSTGRES_DB=n8n",
        "POSTGRES_USER=n8n",
        "POSTGRES_PASSWORD=$DbPass",
        "",
        "N8N_ENCRYPTION_KEY=$EncKey",
        "",
        "N8N_HOST=localhost",
        "N8N_PROTOCOL=http",
        "N8N_EDITOR_BASE_URL=http://localhost:5678",
        "WEBHOOK_URL=http://localhost:5678/",
        "",
        "EXECUTIONS_MODE=regular",
        "",
        "OPENAI_API_KEY=sk-proj-ENTER_YOUR_KEY_HERE",
        "ANTHROPIC_API_KEY=sk-ant-ENTER_YOUR_KEY_HERE",
        "KAKAO_ACCESS_TOKEN=ENTER_YOUR_TOKEN_HERE"
    )
    $lines | Out-File -FilePath $EnvPath -Encoding ascii

    Write-Host "      Done: .env created" -ForegroundColor Green
    Write-Host ""
    Write-Host "  *** SAVE THESE VALUES NOW ***" -ForegroundColor Red
    Write-Host "  DB Password    : $DbPass" -ForegroundColor White
    Write-Host "  Encryption Key : $EncKey" -ForegroundColor White
    Write-Host "  *** SAVE THESE VALUES NOW ***" -ForegroundColor Red
    Write-Host ""

    Set-Clipboard -Value "POSTGRES_PASSWORD=$DbPass`r`nN8N_ENCRYPTION_KEY=$EncKey"
    Write-Host "      (Copied to clipboard)" -ForegroundColor DarkGray
}

# 4. Check Docker
Write-Host "[4/5] Checking Docker..." -ForegroundColor Yellow
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker not running" }
    Write-Host "      Docker is running" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Docker Desktop is not running. Start it first." -ForegroundColor Red
    exit 1
}

# 5. Handle existing n8n container
Write-Host "[5/5] Checking for existing n8n container..." -ForegroundColor Yellow
$existing = docker ps -a --filter "name=^n8n$" --format "{{.Names}}" 2>&1
if ($existing -eq "n8n") {
    Write-Host "      Found existing container: n8n" -ForegroundColor Yellow
    $confirm = Read-Host "      Stop and remove it? (y/N)"
    if ($confirm -eq 'y' -or $confirm -eq 'Y') {
        docker stop n8n 2>&1 | Out-Null
        docker rm   n8n 2>&1 | Out-Null
        Write-Host "      Removed." -ForegroundColor Green
    }
} else {
    Write-Host "      No existing n8n container found." -ForegroundColor Green
}

# Done
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these commands to start n8n:" -ForegroundColor White
Write-Host "  cd `"$WorkDir`"" -ForegroundColor Yellow
Write-Host "  docker compose up -d" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then open: http://localhost:5678" -ForegroundColor Cyan
Write-Host ""

$open = Read-Host "Open folder in Explorer? (Y/n)"
if ($open -ne 'n' -and $open -ne 'N') {
    Start-Process explorer.exe $WorkDir
}
