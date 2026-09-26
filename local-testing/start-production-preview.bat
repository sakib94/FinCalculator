@echo off
REM ---------------------------------------------------------------
REM  Finora - production preview (for testing only)
REM
REM  Builds the site exactly as it will be deployed (one pre-rendered
REM  HTML page per calculator, guide and legal page, plus sitemap.xml)
REM  and serves it on port 4173 for this PC and phones on the same Wi-Fi.
REM  Use this to check the final site before uploading dist\ to a host.
REM  Code changes need a restart of this file to show up.
REM ---------------------------------------------------------------
setlocal
cd /d "%~dp0.."
title Finora production preview

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on PATH.
  echo         Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies ^(first run only^)...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo Building the site...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed - see the messages above.
  pause
  exit /b 1
)

echo.
echo ===============================================================
echo  On this PC open:     http://localhost:4173
echo.
echo  On your phone ^(same Wi-Fi^) open one of these:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo                        http://%%b:4173
)
echo.
echo  If the phone cannot connect, allow Node.js through Windows
echo  Firewall on "Private" networks.
echo.
echo  Press Ctrl+C to stop the server.
echo ===============================================================
echo.

call npm run preview -- --host 0.0.0.0 --port 4173 --strictPort

pause
endlocal
