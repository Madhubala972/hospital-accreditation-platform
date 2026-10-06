@echo off
echo =======================================================
echo 🏥 Starting Hospital Accreditation Intelligence System
echo =======================================================

echo [1/3] Starting Python AI Flask Service on port 5001...
start "Hospital AI Service" cmd /k "cd /d %~dp0ai-service && python app.py"

timeout /t 2 /nobreak >nul

echo [2/3] Starting Node.js Backend Server on port 5000...
start "Hospital Backend API" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 2 /nobreak >nul

echo [3/3] Starting React Frontend on port 3000...
start "Hospital React Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =======================================================
echo ✅ All services launched!
echo 🌐 Frontend UI: http://localhost:3000
echo 📡 Backend API: http://localhost:5000/api
echo 🧠 Python AI Service: http://localhost:5001
echo =======================================================
