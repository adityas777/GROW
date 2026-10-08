@echo off
echo ===================================================
echo Starting Pehla 500 - Groww GenZ Copilot
echo ===================================================

set ROOT_DIR=%~dp0
start "Pehla 500 Backend" /D "%ROOT_DIR%backend" cmd /k ".\venv\Scripts\activate && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
start "Pehla 500 Frontend" /D "%ROOT_DIR%frontend" cmd /k "npm run dev -- --host"

echo Servers started!
echo Frontend: http://localhost:5173/
echo Backend:  http://127.0.0.1:8000/
echo Swagger:  http://127.0.0.1:8000/docs
pause
