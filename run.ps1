Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "Starting Pehla 500 - Groww GenZ Copilot" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Yellow

$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"

Start-Process powershell -WorkingDirectory $backendDir -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\activate; python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
Start-Process powershell -WorkingDirectory $frontendDir -ArgumentList "-NoExit", "-Command", "npm run dev -- --host"

Write-Host "`nServers launched in independent persistent terminal windows!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173/" -ForegroundColor Cyan
Write-Host "Backend:  http://127.0.0.1:8000/" -ForegroundColor Cyan
Write-Host "Docs:     http://127.0.0.1:8000/docs" -ForegroundColor Cyan
