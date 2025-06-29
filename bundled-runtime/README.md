# Bundled Runtime Components

This directory contains all the runtime components needed for the Spark Migration Tool to work without requiring users to install Python, Java, or Spark separately.

## Structure

```
bundled-runtime/
├── python/                 # Portable Python distribution ✅
├── java/                   # Portable Java Runtime Environment (JRE) ✅
├── spark/                  # Apache Spark distribution ✅
├── drivers/                # JDBC drivers for various databases ✅
├── scripts/                # Runtime management scripts ✅
└── config/                 # Runtime configuration files ✅
```

## Current Status: ✅ READY TO USE

All runtime components are installed and configured:

- **✅ Python 3.11.7**: Embedded distribution with all required packages
- **✅ OpenJDK 17 JRE**: Java runtime environment 
- **✅ Apache Spark 3.5.0**: Distributed computing framework
- **✅ JDBC Drivers**: SQL Server, PostgreSQL, MySQL, Oracle (4 drivers)
- **✅ Configuration**: Runtime environment configured

## For End Users

**No setup required!** Simply:

1. Download/clone this project
2. Run `yarn install` (installs Node.js dependencies only)
3. Run `yarn electron-dev` to start the application

Everything else is bundled and ready to use.

## For Developers: Manual Setup Reference

If you need to recreate this setup from scratch, here are the original download requirements:

### Python (Embedded Distribution)
- Download: Python 3.11 Windows Embeddable Package
- URL: https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip
- Extract to: `bundled-runtime/python/`

### Java Runtime Environment (JRE)
- Download: OpenJDK 17 JRE (Windows x64) - **Use JRE, not JDK**
- URL: https://adoptium.net/temurin/releases/
- Direct Link: https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jre_x64_windows_hotspot_17.0.9_9.zip
- Extract to: `bundled-runtime/java/`
- Size: ~180MB (vs ~300MB for full JDK)

### Apache Spark
- Download: Spark 3.5.0 with Hadoop 3.3
- URL: https://spark.apache.org/downloads.html
- Extract to: `bundled-runtime/spark/`

### JDBC Drivers
Download to `bundled-runtime/drivers/`:
- **SQL Server**: [mssql-jdbc-12.4.2.jre8.jar](https://github.com/microsoft/mssql-jdbc/releases)
- **PostgreSQL**: [postgresql-42.7.4.jar](https://jdbc.postgresql.org/download.html)
- **MySQL**: [mysql-connector-j-8.2.0.jar](https://dev.mysql.com/downloads/connector/j/)
- **Oracle**: [ojdbc11-21.7.0.0.jar](https://www.oracle.com/database/technologies/appdev/jdbc-downloads.html)

### Automated Setup Scripts

The following PowerShell scripts are available in `scripts/` directory:

1. `setup-runtime.ps1` - Downloads and configures all components
2. `install-python-packages.ps1` - Installs required Python packages

To recreate the setup:
```powershell
.\bundled-runtime\scripts\setup-runtime.ps1
.\bundled-runtime\scripts\install-python-packages.ps1
```
