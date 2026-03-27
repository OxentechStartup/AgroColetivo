@echo off
REM Start both Vite dev server and email server in parallel (Windows)
REM Opens 2 new terminals

echo Starting AgroColetivo Development Environment...
echo.
echo 📱 Terminal 1: Vite Dev Server (http://localhost:5173)
echo 📧 Terminal 2: Email Server (http://localhost:3001)
echo.

REM Start Vite dev server in new terminal
start "Vite Dev Server" cmd /k npm run dev

REM Wait a moment before starting email server
timeout /t 2 /nobreak

REM Start email server in new terminal
start "Email Server" cmd /k npm run email-server

echo.
echo ✅ Both servers started!
echo    - Frontend: http://localhost:5173
echo    - Email API: http://localhost:3001
echo.
echo Close either terminal to stop that server.
pause
