#!/usr/bin/env pwsh

Write-Host "Starting Spark Migration Tool Development Environment..." -ForegroundColor Green
Write-Host ""

# Start Vite dev server in a new window
Write-Host "Starting Vite dev server..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-Command", "Set-Location '$PSScriptRoot'; yarn dev" -WindowStyle Normal

# Wait for the server to start
Write-Host "Waiting for dev server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Start Electron
Write-Host "Starting Electron..." -ForegroundColor Yellow
& yarn electron

Write-Host "Press any key to exit..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
