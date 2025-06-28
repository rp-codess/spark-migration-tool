@echo off
echo Starting Spark Migration Tool Development Environment...
echo.

REM Start Vite dev server in a new window
start "Vite Dev Server" cmd /k "cd /d %~dp0 && yarn dev"

REM Wait a few seconds for the server to start
timeout /t 8

REM Start Electron
echo Starting Electron...
yarn electron

pause
