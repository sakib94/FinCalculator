@echo off
REM ---------------------------------------------------------------
REM  FinCalc - production preview (for testing only)
REM
REM  Builds the site exactly as it will be deployed (one pre-rendered
REM  HTML page per calculator, guide and legal page, plus sitemap.xml)
REM  and serves it on port 4173 for this PC and phones on the same Wi-Fi.
REM  Use this to check the final site before uploading dist\ to a host.
REM  Code changes need a restart of this file to show up.
REM ---------------------------------------------------------------
setlocal
cd /d "%~dp0.."
title FinCalc production preview

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not on PATH.
  echo         Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

REM Install dependencies on the first run AND whenever package-lock.json
REM has changed since the last install - e.g. after a git pull that added
REM a package. A copy of the lockfile from the last install is kept in
REM node_modules and compared byte for byte.
set "STAMP=node_modules\.fincalc-installed-lock"
set "NEED_INSTALL="
if not exist "node_modules\" set "NEED_INSTALL=1"
if not exist "%STAMP%" set "NEED_INSTALL=1"
if not defined NEED_INSTALL (
  fc /b "package-lock.json" "%STAMP%" >nul 2>nul || set "NEED_INSTALL=1"
)
if defined NEED_INSTALL (
  echo Installing / updating dependencies ^(only when they have changed^)...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
  copy /y "package-lock.json" "%STAMP%" >nul
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
