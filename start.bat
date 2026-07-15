@echo off
REM University Website - Startup Script for Windows
REM This script starts all three services in separate windows

echo.
echo ================================
echo University of Makran - Startup
echo ================================
echo.

echo Checking Node.js installation...
node -v
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.
echo Starting all services...
echo.

REM Change to backend directory and start
echo Starting Backend on port 5000...
start "Backend Server" cmd /k "cd backend && echo Installing dependencies... && npm install && npm run dev"

timeout /t 3 /nobreak

REM Change to frontend directory and start
echo Starting Frontend on port 3000...
start "Frontend Server" cmd /k "cd frontend && echo Installing dependencies... && npm install && npm run dev"

timeout /t 3 /nobreak

REM Change to admin-dashboard directory and start
echo Starting Admin Dashboard on port 3001...
start "Admin Dashboard" cmd /k "cd admin-dashboard && echo Installing dependencies... && npm install && npm run dev"

echo.
echo ================================
echo All services are starting...
echo ================================
echo.
echo Access the applications at:
echo   Frontend:     http://localhost:3000
echo   Admin:        http://localhost:3001
echo   Backend API:  http://localhost:5000
echo.
echo Close the command windows to stop services.
echo.
pause
