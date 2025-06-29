# PowerShell script to install Python packages in bundled Python environment
param(
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "=== Installing Python Packages ===" -ForegroundColor Green

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeDir = Split-Path -Parent $scriptDir
$pythonDir = Join-Path $runtimeDir "python"
$pythonExe = Join-Path $pythonDir "python.exe"
$projectRoot = Split-Path -Parent $runtimeDir
$pythonProjectDir = Join-Path $projectRoot "python"
$requirementsFile = Join-Path $pythonProjectDir "requirements-spark.txt"

# Check if Python is available
if (!(Test-Path $pythonExe)) {
    Write-Host "Python not found at: $pythonExe" -ForegroundColor Red
    Write-Host "Please run setup-runtime.ps1 first." -ForegroundColor Yellow
    exit 1
}

# Check if requirements file exists
if (!(Test-Path $requirementsFile)) {
    Write-Host "Requirements file not found at: $requirementsFile" -ForegroundColor Red
    exit 1
}

try {
    # First, we need to install pip in the embedded Python
    Write-Host "Setting up pip in embedded Python..." -ForegroundColor Yellow
    
    # Download get-pip.py
    $getPipUrl = "https://bootstrap.pypa.io/get-pip.py"
    $getPipPath = Join-Path $pythonDir "get-pip.py"
    
    if (!(Test-Path $getPipPath) -or $Force) {
        Write-Host "Downloading get-pip.py..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $getPipUrl -OutFile $getPipPath -UseBasicParsing
    }
    
    # Install pip
    Write-Host "Installing pip..." -ForegroundColor Cyan
    & $pythonExe $getPipPath --no-warn-script-location
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install pip"
    }
    
    # Install packages from requirements.txt
    Write-Host "Installing packages from requirements.txt..." -ForegroundColor Cyan
    $pipExe = Join-Path $pythonDir "Scripts" "pip.exe"
    
    if (Test-Path $pipExe) {
        & $pipExe install -r $requirementsFile --no-warn-script-location
    } else {
        # Fallback to python -m pip
        & $pythonExe -m pip install -r $requirementsFile --no-warn-script-location
    }
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install packages from requirements.txt"
    }
    
    # Install additional packages for Spark
    Write-Host "Installing additional Spark-related packages..." -ForegroundColor Cyan
    $additionalPackages = @(
        "findspark==2.0.1",
        "py4j==0.10.9.7"
    )
    
    foreach ($package in $additionalPackages) {
        Write-Host "Installing $package..." -ForegroundColor White
        if (Test-Path $pipExe) {
            & $pipExe install $package --no-warn-script-location
        } else {
            & $pythonExe -m pip install $package --no-warn-script-location
        }
    }
    
    # Verify installation
    Write-Host "`nVerifying installation..." -ForegroundColor Yellow
    $testScript = @"
import sys
import subprocess

def check_package(package_name):
    try:
        __import__(package_name)
        print(f'✓ {package_name}')
        return True
    except ImportError:
        print(f'✗ {package_name}')
        return False

# Check critical packages
packages = ['pyspark', 'findspark', 'pandas', 'numpy', 'pyodbc', 'psycopg2', 'sqlalchemy']
failed = []

for package in packages:
    if not check_package(package):
        failed.append(package)

if failed:
    print(f'\\nFailed packages: {", ".join(failed)}')
    sys.exit(1)
else:
    print('\\nAll packages installed successfully!')
    sys.exit(0)
"@
    
    $testScriptPath = Join-Path $pythonDir "test_packages.py"
    $testScript | Out-File -FilePath $testScriptPath -Encoding utf8
    
    & $pythonExe $testScriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n=== Package Installation Complete ===" -ForegroundColor Green
        Write-Host "All Python packages have been successfully installed." -ForegroundColor Yellow
        
        # Clean up
        Remove-Item $testScriptPath -Force -ErrorAction SilentlyContinue
        Remove-Item $getPipPath -Force -ErrorAction SilentlyContinue
    } else {
        throw "Package verification failed"
    }
    
} catch {
    Write-Host "`nPackage installation failed: $_" -ForegroundColor Red
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
    exit 1
}
