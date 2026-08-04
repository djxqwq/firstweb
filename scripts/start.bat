@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo [1/3] FastAPI :8000
start "blog-api" cmd /k "cd /d %CD%\backend && .venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/3] HomePage entry :8080
start "blog-home" cmd /k "cd /d %CD%\home && npm run dev"

echo [3/3] Portfolio site :3000
start "blog-site" cmd /k "cd /d %CD%\frontend && npm run dev -- -p 3000 -H 127.0.0.1"

echo.
echo Entry     http://localhost:8080
echo Portfolio http://127.0.0.1:3000
echo Admin     http://127.0.0.1:3001/admin  (optional)
echo API       http://127.0.0.1:8000/docs
pause
