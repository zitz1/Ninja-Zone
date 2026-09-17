@echo off
setlocal
cd /d "%~dp0"
call setup-local.cmd
if errorlevel 1 exit /b 1
echo.
echo Starting Ninja Zone...
call npm run dev
