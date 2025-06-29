# PowerShell script to download and setup all runtime components
param(
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "=== Spark Migration Tool Runtime Setup ===" -ForegroundColor Green
Write-Host "This script will download and configure all required runtime components." -ForegroundColor Yellow
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeDir = Split-Path -Parent $scriptDir
$downloadDir = Join-Path $runtimeDir "downloads"

# Create directories
$directories = @(
    (Join-Path $runtimeDir "python"),
    (Join-Path $runtimeDir "java"),
    (Join-Path $runtimeDir "spark"),
    (Join-Path $runtimeDir "drivers"),
    $downloadDir
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Green
    }
}

# Function to download file with progress
function Download-File {
    param(
        [string]$Url,
        [string]$OutputPath,
        [string]$Description
    )
    
    if (Test-Path $OutputPath -and !$Force) {
        Write-Host "Skipping $Description (already exists)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "Downloading $Description..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $Url -OutFile $OutputPath -UseBasicParsing
        Write-Host "Downloaded: $Description" -ForegroundColor Green
    } catch {
        Write-Host "Failed to download $Description : $_" -ForegroundColor Red
        throw
    }
}

# Function to extract archive
function Extract-Archive {
    param(
        [string]$ArchivePath,
        [string]$DestinationPath,
        [string]$Description
    )
    
    Write-Host "Extracting $Description..." -ForegroundColor Cyan
    try {
        if ($ArchivePath.EndsWith('.zip')) {
            Expand-Archive -Path $ArchivePath -DestinationPath $DestinationPath -Force
        } elseif ($ArchivePath.EndsWith('.tar.gz') -or $ArchivePath.EndsWith('.tgz')) {
            # Use tar command (available in Windows 10+)
            tar -xzf $ArchivePath -C $DestinationPath
        }
        Write-Host "Extracted: $Description" -ForegroundColor Green
    } catch {
        Write-Host "Failed to extract $Description : $_" -ForegroundColor Red
        throw
    }
}

try {
    # Download URLs (these should be updated to latest stable versions)
    $downloads = @{
        "Python" = @{
            Url = "https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip"
            File = "python-embed.zip"
            Extract = $true
            Destination = "python"
        }
        "OpenJDK" = @{
            Url = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jre_x64_windows_hotspot_17.0.9_9.zip"
            File = "openjdk-jre.zip"
            Extract = $true
            Destination = "java"
        }
        "Spark" = @{
            Url = "https://archive.apache.org/dist/spark/spark-3.5.0/spark-3.5.0-bin-hadoop3.tgz"
            File = "spark.tgz"
            Extract = $true
            Destination = "spark"
        }
        "SQL Server JDBC" = @{
            Url = "https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/12.4.2.jre8/mssql-jdbc-12.4.2.jre8.jar"
            File = "mssql-jdbc-12.4.2.jre8.jar"
            Extract = $false
            Destination = "drivers"
        }
        "PostgreSQL JDBC" = @{
            Url = "https://repo1.maven.org/maven2/org/postgresql/postgresql/42.2.27/postgresql-42.2.27.jar"
            File = "postgresql-42.2.27.jar"
            Extract = $false
            Destination = "drivers"
        }
        "MySQL JDBC" = @{
            Url = "https://repo1.maven.org/maven2/mysql/mysql-connector-java/8.0.33/mysql-connector-java-8.0.33.jar"
            File = "mysql-connector-java-8.0.33.jar"
            Extract = $false
            Destination = "drivers"
        }
    }
    
    # Download all components
    Write-Host "`nDownloading runtime components..." -ForegroundColor Yellow
    foreach ($component in $downloads.Keys) {
        $info = $downloads[$component]
        $filePath = Join-Path $downloadDir $info.File
        Download-File -Url $info.Url -OutputPath $filePath -Description $component
    }
    
    # Extract archives
    Write-Host "`nExtracting components..." -ForegroundColor Yellow
    foreach ($component in $downloads.Keys) {
        $info = $downloads[$component]
        $filePath = Join-Path $downloadDir $info.File
        $destPath = Join-Path $runtimeDir $info.Destination
        
        if ($info.Extract) {
            Extract-Archive -ArchivePath $filePath -DestinationPath $destPath -Description $component
        } else {
            # Just copy the file (for JDBC drivers)
            Copy-Item $filePath -Destination $destPath -Force
            Write-Host "Copied: $component" -ForegroundColor Green
        }
    }
    
    # Create Python configuration
    Write-Host "`nConfiguring Python environment..." -ForegroundColor Yellow
    $pythonDir = Join-Path $runtimeDir "python"
    $pthFile = Join-Path $pythonDir "python311._pth"
    
    # Configure Python path
    $pythonPaths = @(
        "python311.zip",
        ".",
        "Lib",
        "Lib/site-packages"
    )
    
    $pythonPaths | Out-File -FilePath $pthFile -Encoding ascii
    Write-Host "Created Python path configuration" -ForegroundColor Green
    
    # Create environment configuration
    $configContent = @"
# Spark Migration Tool Runtime Configuration
# Auto-generated by setup script

PYTHON_HOME=$pythonDir
JAVA_HOME=$(Join-Path $runtimeDir "java" | Get-ChildItem | Select-Object -First 1 | ForEach-Object { $_.FullName })
SPARK_HOME=$(Join-Path $runtimeDir "spark" | Get-ChildItem | Select-Object -First 1 | ForEach-Object { $_.FullName })
DRIVERS_PATH=$(Join-Path $runtimeDir "drivers")

# Python executable
PYTHON_EXE=$(Join-Path $pythonDir "python.exe")

# Spark configuration
SPARK_CONF_DIR=$(Join-Path $runtimeDir "config")
PYSPARK_PYTHON=$(Join-Path $pythonDir "python.exe")
PYSPARK_DRIVER_PYTHON=$(Join-Path $pythonDir "python.exe")
"@
    
    $configPath = Join-Path $runtimeDir "config" "runtime.env"
    $configDir = Split-Path $configPath -Parent
    if (!(Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    $configContent | Out-File -FilePath $configPath -Encoding utf8
    Write-Host "Created runtime configuration: $configPath" -ForegroundColor Green
    
    # Clean up downloads if successful
    if (Test-Path $downloadDir) {
        Remove-Item $downloadDir -Recurse -Force
        Write-Host "Cleaned up temporary downloads" -ForegroundColor Green
    }
    
    Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
    Write-Host "All runtime components have been downloaded and configured." -ForegroundColor Yellow
    Write-Host "Next step: Run install-python-packages.ps1 to install Python dependencies." -ForegroundColor Yellow
    
} catch {
    Write-Host "`nSetup failed: $_" -ForegroundColor Red
    Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
    exit 1
}
