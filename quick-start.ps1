# Quick Start Script for Spark Migration Tool Development
# This script sets up the development environment with all bundled components

Write-Host "=== Spark Migration Tool Development Setup ===" -ForegroundColor Green
Write-Host "Setting up bundled runtime environment for development..." -ForegroundColor Yellow

# Check if Node.js dependencies are installed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Cyan
    yarn install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Node.js dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check if runtime is set up
$runtimeSetup = Test-Path "bundled-runtime\config\runtime.env"
if (!$runtimeSetup) {
    Write-Host "Setting up bundled runtime components..." -ForegroundColor Cyan
    & "bundled-runtime\scripts\setup-runtime.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to setup runtime components" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Installing Python packages..." -ForegroundColor Cyan
    & "bundled-runtime\scripts\install-python-packages.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Python packages" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Runtime components already set up" -ForegroundColor Green
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "You can now run the application:" -ForegroundColor Yellow
Write-Host "  yarn electron-dev       # Run in development mode" -ForegroundColor Cyan
Write-Host "  yarn build-electron     # Build production version" -ForegroundColor Cyan
Write-Host "  yarn setup-runtime      # Setup runtime components" -ForegroundColor Cyan
Write-Host "  yarn install-python-packages # Install Python deps" -ForegroundColor Cyan
Write-Host "`nThe application includes:" -ForegroundColor Yellow
Write-Host "  ✅ Bundled Python 3.11" -ForegroundColor Green
Write-Host "  ✅ Bundled Java Runtime" -ForegroundColor Green  
Write-Host "  ✅ Apache Spark 3.5.0" -ForegroundColor Green
Write-Host "  ✅ All JDBC Drivers" -ForegroundColor Green
Write-Host "  ✅ PySpark + Dependencies" -ForegroundColor Green
