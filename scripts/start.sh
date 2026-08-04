#!/usr/bin/env bash
# One-click local / server helper for 邓锦鑫 blog
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[1] FastAPI :8000"
(cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000) &
API_PID=$!

echo "[2] Build home static"
(cd home && npm run build)

echo "API PID=$API_PID"
echo "Serve home/dist with nginx; about-web via npm run build && nginx."
echo "Swagger: http://127.0.0.1:8000/docs"
wait $API_PID
