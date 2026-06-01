@echo off
setlocal

cd /d "%~dp0.."

call npm run prisma:migrate:deploy
if errorlevel 1 exit /b %errorlevel%

call npm run prisma:generate
if errorlevel 1 exit /b %errorlevel%

call npx next build
if errorlevel 1 exit /b %errorlevel%

echo note2 Windows local deploy completed.
