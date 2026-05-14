# VITALIS AI STARTUP SCRIPT
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"

Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host "  VITALIS AI - STARTING SYSTEM" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Installing Engine Dependencies..." -ForegroundColor Yellow
Set-Location $frontend
npm install --quiet

Write-Host "[2/2] Launching Vitalis Core..." -ForegroundColor Green
Write-Host "Opening browser at http://localhost:3000 in 10 seconds..." -ForegroundColor Gray

Start-Process "http://localhost:3000"
npm run dev
