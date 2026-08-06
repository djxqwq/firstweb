@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo [1/2] FastAPI :8000
start "blog-api" cmd /k "cd /d %CD%\backend && .venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/2] Unified site :3000
start "blog-site" cmd /k "cd /d %CD%\frontend && npm run dev -- -p 3000 -H 127.0.0.1"

echo.
echo 站点     http://127.0.0.1:3000
echo 后台     http://127.0.0.1:3000/admin
echo API      http://127.0.0.1:8000/docs
pause
