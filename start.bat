@echo off
setlocal

:: Add Node.js to PATH
set "NODE_DIR=C:\Program Files\nodejs"
if exist "%NODE_DIR%\node.exe" set "PATH=%NODE_DIR%;%PATH%"

echo ================================================
echo   Karekat Prints ERP
echo ================================================
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Install backend packages if needed
if not exist "backend\node_modules\express" (
    echo Installing backend packages...
    cd backend && call "%NODE_DIR%\npm.cmd" install && cd ..
)

:: Install frontend packages if needed
if not exist "frontend\node_modules\vite" (
    echo Installing frontend packages...
    cd frontend && call "%NODE_DIR%\npm.cmd" install && cd ..
)

:: Build frontend if dist missing or outdated
if not exist "frontend\dist\index.html" (
    echo Building frontend...
    cd frontend && call "%NODE_DIR%\npm.cmd" run build && cd ..
)

echo.
echo  URL    : http://localhost:3001
echo  Owner  : owner / karekat2024
echo  Staff  : arun  / staff2024
echo.
echo  Press Ctrl+C to stop.
echo ================================================

:: Open browser after a moment
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3001"

:: Run backend in foreground (Ctrl+C to stop)
cd backend
node server.js
