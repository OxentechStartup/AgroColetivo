@echo off
REM Start both Vite dev server and email server in parallel (Windows)
REM Opens 2 new terminals

echo Starting HubCompras Development Environment...
echo.
echo 📱 Terminal 1: Vite Dev Server (http://localhost:5173)
echo 🖥️ Terminal 2: Local API Server (http://localhost:3000)
echo.

REM Start Vite dev server in new terminal
start "Vite Dev Server" cmd /k npm run dev

REM Wait a moment before starting API server
timeout /t 2 /nobreak

REM Start local API server in new terminal
start "Local API Server" cmd /k npm run dev:server

echo.
echo ✅ Both servers started!
echo    - Frontend: http://localhost:5173
echo    - Local API: http://localhost:3000
echo.
echo Close either terminal to stop that server.
pause
