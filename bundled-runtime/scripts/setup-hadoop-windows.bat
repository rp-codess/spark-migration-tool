@echo off
REM Windows Hadoop Environment Setup Script
REM This script creates a minimal Hadoop environment for Spark on Windows

echo Setting up Hadoop environment for Windows...

REM Create hadoop bin directory
if not exist "C:\temp\hadoop\bin" mkdir "C:\temp\hadoop\bin"

REM Create a minimal winutils.exe placeholder (Spark needs this on Windows)
if not exist "C:\temp\hadoop\bin\winutils.exe" (
    echo Creating winutils.exe placeholder...
    echo. > "C:\temp\hadoop\bin\winutils.exe"
)

REM Create hadoop configuration directory
if not exist "C:\temp\hadoop\conf" mkdir "C:\temp\hadoop\conf"

REM Set proper permissions (Windows equivalent)
icacls "C:\temp\hadoop" /grant Everyone:F /T >nul 2>&1

echo Hadoop environment setup complete.
