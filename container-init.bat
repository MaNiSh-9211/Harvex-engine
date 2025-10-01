@echo off
echo =========================================
echo Starting Container-Based Node.js Debugger Environment for Windows
echo =========================================

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Stopping any existing containers...
docker-compose down 2>nul

echo Building and starting containers...
docker-compose up --build -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to start containers.
    pause
    exit /b 1
)

echo Waiting 10 seconds for containers to initialize...
timeout /t 10 /nobreak >nul

REM Check container health
echo Checking container health...
docker ps --filter "name=nodejs-debugger-container" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo =========================================
echo Debugger Environment Ready!
echo =========================================
echo TCP RPC Server:  http://localhost:3069
echo Node.js Debugger:  http://localhost:9269
echo Web UI:           http://localhost:5000
echo Workspace:        ./example-project
echo.
echo To view logs: docker-compose logs -f
echo To stop:      docker-compose down
echo.

REM Open Web UI in default browser
start http://localhost:5000

echo Press any key to view live logs...
pause >nul
docker-compose logs -f
