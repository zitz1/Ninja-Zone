@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo Ninja Zone - Local Setup
echo ========================================
if not exist ".env" (
  echo DATABASE_URL=postgresql://postgres:NinjaZone2026@localhost:5432/ninja_zone?schema=public> .env
  echo Created .env
)
call npm install
if errorlevel 1 goto :error
call npx prisma generate
if errorlevel 1 goto :error
call npx prisma db push --accept-data-loss
if errorlevel 1 goto :error
call npm run db:seed
if errorlevel 1 goto :error
echo.
echo SETUP COMPLETE.
echo Run: npm run dev
goto :end
:error
echo.
echo SETUP FAILED. Copy the error above and send it to ChatGPT.
exit /b 1
:end
endlocal
