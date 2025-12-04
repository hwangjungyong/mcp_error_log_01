@echo off
REM ========================================
REM AI Error Log Analyzer Development Server Startup Script
REM Encoding: ANSI (CP949)
REM ========================================

REM Set code page to Korean (CP949)
chcp 949 >nul 2>&1
if errorlevel 1 chcp 949

echo ========================================
echo AI Error Log Analyzer Development Server Startup
echo ========================================
echo.

REM Check API Server
echo [1/2] Checking API Server...
netstat -ano | findstr :3011 | findstr LISTENING >nul 2>&1
set API_RUNNING=0
if errorlevel 1 (
    echo API Server is not running. Will start in concurrently...
    set API_RUNNING=1
) else (
    echo API Server is already running. Skipping...
    set API_RUNNING=0
)
echo.

REM Check Vite Dev Server
echo [2/2] Checking Vite Dev Server...
netstat -ano | findstr :5183 >nul 2>&1
set VITE_RUNNING=0
if errorlevel 1 (
    echo Vite Dev Server is not running. Will start in concurrently...
    set VITE_RUNNING=1
) else (
    echo Vite Dev Server is already running. Killing existing process...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5183 ^| findstr LISTENING') do (
        echo Killing process %%a on port 5183...
        taskkill /F /PID %%a >nul 2>&1
    )
    set VITE_RUNNING=1
)
echo.

REM Server Status Summary
echo [3/3] Server Status Summary:
netstat -ano | findstr ":3011 :5183" | findstr LISTENING
echo.

REM Check if concurrently is installed
if not exist node_modules\.bin\concurrently.cmd (
    echo Installing concurrently...
    call npm install concurrently --save-dev
)

REM Start servers in current terminal using concurrently
echo [4/4] Starting servers in current terminal...
echo.
echo ========================================
echo Servers are starting in this terminal.
echo Please open http://localhost:5183 in your browser.
echo Press Ctrl+C to stop all servers.
echo ========================================
echo.
echo Server URLs:
echo   - API Server: http://localhost:3011
echo   - Vite Dev Server: http://localhost:5183
echo.
echo Notes:
echo   - All servers run in this terminal window
echo   - Each server output is color-coded
echo   - Press Ctrl+C to stop all servers at once
echo.

REM Use npx concurrently to run only servers that are not already running
if %API_RUNNING%==1 (
    if %VITE_RUNNING%==1 (
        echo Starting API Server and Vite dev server...
        call npx concurrently "npm run api-server" "npm run dev"
    ) else (
        echo Starting API Server only...
        call npm run api-server
    )
) else (
    if %VITE_RUNNING%==1 (
        echo Starting Vite dev server...
        call npm run dev
    ) else (
        echo All servers are already running!
        echo.
        echo Server URLs:
        echo   - API Server: http://localhost:3011
        echo   - Vite Dev Server: http://localhost:5183
        echo.
        echo Verifying servers are actually running...
        timeout /t 2 /nobreak >nul
        netstat -ano | findstr ":3011 :5183" | findstr LISTENING
        if errorlevel 1 (
            echo.
            echo [WARNING] Some servers may not be responding properly.
            echo Please check the server windows for error messages.
        )
        pause
    )
)

REM Wait a moment for servers to start, then verify
if %API_RUNNING%==1 (
    echo.
    echo Waiting for servers to start...
    timeout /t 5 /nobreak >nul
    echo.
    echo Verifying server status...
    netstat -ano | findstr ":3011 :5183" | findstr LISTENING
    if errorlevel 1 (
        echo.
        echo [ERROR] Some servers failed to start!
        echo Please check the error messages above.
        echo.
        echo Troubleshooting:
        echo   1. Check if ports are already in use: netstat -ano ^| findstr ":3011 :5183"
        echo   2. Check database file permissions: data\database.db
        echo   3. Check Node.js is installed: node --version
        echo   4. Check Python is installed: python --version
        echo   5. Try running servers individually: npm run api-server
        pause
    ) else (
        echo.
        echo [SUCCESS] All servers started successfully!
    )
)

