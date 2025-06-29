# Bundled Runtime Components

This directory contains all the runtime components needed for the Spark Migration Tool to work without requiring users to install Python, Java, or Spark separately.

## Structure

```
bundled-runtime/
├── python/                 # Portable Python distribution
├── java/                   # Portable Java Runtime Environment (JRE)
├── spark/                  # Apache Spark distribution
├── drivers/                # JDBC drivers for various databases
├── scripts/                # Runtime management scripts
└── config/                 # Runtime configuration files
```

## Download Requirements

The following components need to be downloaded and extracted:

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
- SQL Server: mssql-jdbc-12.4.2.jre8.jar
- PostgreSQL: postgresql-42.2.5.jar
- Oracle: ojdbc8.jar
- MySQL: mysql-connector-java-8.0.33.jar

## Setup Instructions

1. Run `scripts/setup-runtime.ps1` to download and configure all components
2. Run `scripts/install-python-packages.ps1` to install required Python packages
3. Components will be automatically configured for the application
