@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo [1/3] Starting FastAPI (TiDB/SQLite) on :8000
start "blog-api" cmd /k "cd /d %~dp0..\backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/3] Starting HomePage (fluid+snake) on :8080
start "blog-home" cmd /k "cd /d %~dp0..\home && npm run dev"

echo [3/3] Starting TermFolio + Admin on :3001
start "blog-about" cmd /k "cd /d %~dp0..\about-web && npm run dev"

echo.
echo Open:
echo   Home  http://localhost:8080
echo   Term  http://127.0.0.1:3001
echo   Admin http://127.0.0.1:3001/admin
echo   API   http://127.0.0.1:8000/docs
pause
