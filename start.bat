@echo off
echo ===================================================
echo             Starting WelfareIntel Project           
echo ===================================================

echo [1/4] Starting Local Qwen Vision AI Server on port 1234...
start "Local Qwen Vision AI" cmd /k "call backend\start_qwen.bat"

echo [2/4] Starting FastAPI Backend on port 8000...
start "WelfareIntel Backend" cmd /k "cd backend && .venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000"

echo [3/4] Starting Vite Frontend on port 8081...
start "WelfareIntel Frontend" cmd /k "cd frontend && npm run dev"

echo Waiting 6 seconds for AI server and backend to warm up...
timeout /t 6 /nobreak >nul

echo [4/4] Checking Backend Scrape Status...
curl -s http://127.0.0.1:8000/api/scrape-status
echo.

echo Opening application in default browser...
start http://localhost:8081/

echo ===================================================
echo Project started successfully! Close the cmd windows
echo of Ollama, Backend, and Frontend to terminate.
echo ===================================================
