@echo off
REM ---------------------------------------------------------------
REM  Finora - local test server (for testing only, not production)
REM
REM  Starts the Vite dev server on port 5173, reachable from this PC
REM  and from any phone/tablet on the same Wi-Fi network.
REM  Double-click this file, then open one of the URLs it prints.
REM  Press Ctrl+C in this window to stop the server.
REM ---------------------------------------------------------------
setlocal
cd /d "%~dp0"
title Finora local server

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

echo.
echo ===============================================================
echo  On this PC open:     http://localhost:5173
echo.
echo  On your phone ^(same Wi-Fi^) open one of these:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo                        http://%%b:5173
)
echo.
echo  If the phone cannot connect, allow Node.js through Windows
echo  Firewall on "Private" networks and make sure your Wi-Fi is
echo  set to a Private network ^(not Public^).
echo.
echo  Press Ctrl+C to stop the server.
echo ===============================================================
echo.

call npm run dev -- --host 0.0.0.0 --port 5173 --strictPort

pause
endlocal
