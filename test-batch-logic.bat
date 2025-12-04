@echo off
REM 테스트용 배치 파일 로직 확인

echo ========================================
echo Testing batch file logic
echo ========================================
echo.

echo [1/2] Checking API Server (port 3011)...
netstat -ano | findstr :3011 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo   -> API Server is NOT running
    set API_RUNNING=1
) else (
    echo   -> API Server is RUNNING
    set API_RUNNING=0
)
echo   API_RUNNING=%API_RUNNING%
echo.

echo [2/2] Checking Vite Dev Server (port 5183)...
netstat -ano | findstr :5183 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo   -> Vite Dev Server is NOT running
    set VITE_RUNNING=1
) else (
    echo   -> Vite Dev Server is RUNNING
    echo   -> Would kill existing process and restart
    set VITE_RUNNING=1
)
echo   VITE_RUNNING=%VITE_RUNNING%
echo.

echo [3/3] Server Status Summary:
netstat -ano | findstr ":3011 :5183" | findstr LISTENING
echo.

echo Expected behavior:
if %API_RUNNING%==0 (
    if %VITE_RUNNING%==1 (
        echo   -> Would start Vite dev server only
        echo   -> Command: npm run dev
    ) else (
        echo   -> All servers already running
        echo   -> Would show status and pause
    )
) else (
    if %VITE_RUNNING%==1 (
        echo   -> Would start both API Server and Vite dev server
        echo   -> Command: npx concurrently "npm run api-server" "npm run dev"
    ) else (
        echo   -> Would start API Server only
        echo   -> Command: npm run api-server
    )
)
echo.

pause

