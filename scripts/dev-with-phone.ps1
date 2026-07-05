# ANI Platform — laptop on localhost, phone on public tunnel link
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host ""
Write-Host "Starting ANI Platform for laptop + phone..." -ForegroundColor Cyan
Write-Host ""

Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$backend'; Write-Host 'Backend -> http://localhost:3001' -ForegroundColor Green; npm run dev"
)

Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "Set-Location '$frontend'; Write-Host 'Laptop -> http://localhost:3000' -ForegroundColor Green; npm run dev"
)

Start-Sleep -Seconds 4

Write-Host "Laptop:  http://localhost:3000" -ForegroundColor Green
Write-Host "Waiting for public phone link..." -ForegroundColor Yellow
Write-Host ""

Set-Location $frontend
npx --yes localtunnel --port 3000
