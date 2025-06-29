# Spark Migration Tool - Self-Contained Edition

A powerful, self-contained database migration and schema comparison tool that bundles Python, Java, Apache Spark, and all necessary dependencies. Users don't need to install anything separately!

## 🚀 What's New

This enhanced version includes:
- **Bundled Python Runtime** - No need to install Python
- **Bundled Java Runtime** - No need to install Java
- **Bundled Apache Spark** - Full Spark 3.5.0 included
- **All JDBC Drivers** - SQL Server, PostgreSQL, MySQL, Oracle
- **Advanced Schema Comparison** - Using PySpark for scalability
- **High-Performance Data Migration** - Parallel processing with Spark
- **User-Friendly Setup** - Automated runtime setup and management

## 📁 Project Structure

```
spark-migration-tool/
├── bundled-runtime/                 # Self-contained runtime environment
│   ├── python/                      # Portable Python distribution
│   ├── java/                        # Portable Java Runtime (JRE)
│   ├── spark/                       # Apache Spark distribution
│   ├── drivers/                     # JDBC drivers for all databases
│   ├── scripts/                     # Runtime management scripts
│   │   ├── setup-runtime.ps1        # Downloads and configures all components
│   │   ├── install-python-packages.ps1 # Installs Python packages
│   │   └── runtime_manager.py       # Python runtime management
│   └── config/                      # Runtime configuration
├── python/                          # Python scripts and configuration
│   ├── scripts/                     # Main Python scripts
│   │   ├── schema_comparison.py     # Advanced schema comparison tool
│   │   └── data_migration.py        # High-performance data migration
│   ├── config/                      # Configuration examples
│   └── requirements.txt             # Python package dependencies
├── src/                             # Electron application source
│   ├── components/                  # React components
│   │   ├── SparkRuntimeManager.jsx  # Runtime management UI
│   │   └── ...                      # Other components
│   └── services/                    # Node.js services
│       ├── python-runtime.js        # Python script execution service
│       └── ...                      # Other services
└── ...                              # Other application files
```

## 🛠️ Setup Instructions

### First-Time Setup

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd spark-migration-tool
   ```

2. **Install Node.js dependencies**
   ```bash
   yarn install
   ```

3. **Setup the bundled runtime environment**
   
   **Option A: Using PowerShell (Recommended)**
   ```powershell
   cd bundled-runtime\scripts
   .\setup-runtime.ps1
   ```
   
   **Option B: Using the Application UI**
   - Start the application: `yarn electron-dev`
   - Navigate to "Spark Runtime" from the connection page
   - Click "Setup Runtime"

4. **Install Python packages**
   ```powershell
   cd bundled-runtime\scripts
   .\install-python-packages.ps1
   ```

### What Gets Downloaded

The setup process automatically downloads:

- **Python 3.11** (Windows Embeddable Package) - ~15MB
- **OpenJDK 17** (Java Runtime) - ~180MB  
- **Apache Spark 3.5.0** with Hadoop 3.3 - ~300MB
- **JDBC Drivers**:
  - SQL Server (mssql-jdbc) - ~1MB
  - PostgreSQL (postgresql) - ~1MB
  - MySQL (mysql-connector-java) - ~2MB
  - Oracle (if needed) - ~4MB

**Total download size: ~500MB**
**Extracted size: ~1.2GB**

## 🎯 Key Features

### 1. Schema Comparison Tool
- **Scalable Processing**: Uses Apache Spark for large databases
- **Multi-Database Support**: SQL Server ↔ PostgreSQL, MySQL ↔ Oracle, etc.
- **Detailed Analysis**: Column types, constraints, nullable differences
- **Flexible Filtering**: Include/exclude specific tables or patterns
- **Comprehensive Reports**: Detailed differences and summary statistics

### 2. Data Migration Tool  
- **High Performance**: Parallel processing with configurable partitions
- **Batch Processing**: Configurable batch sizes for optimal performance
- **Data Transformations**: Built-in transformation pipeline
- **Progress Monitoring**: Real-time migration status and logging
- **Data Integrity**: Row count verification and hash-based validation
- **Resume Capability**: Continue interrupted migrations

### 3. Runtime Management
- **Automatic Setup**: One-click runtime component installation
- **Health Monitoring**: Verify all components are working correctly
- **Easy Updates**: Force re-setup for updates or fixes
- **Detailed Logging**: Track setup and execution progress

## 🔧 Usage Examples

### Schema Comparison

1. **Using the UI**: Navigate to the Spark Runtime page and use the schema comparison interface

2. **Using Configuration Files**: Create a JSON config file:
   ```json
   {
     "source_database": {
       "type": "sqlserver",
       "jdbc_url": "jdbc:sqlserver://server:1433;database=mydb",
       "properties": {
         "user": "username",
         "password": "password",
         "driver": "com.microsoft.sqlserver.jdbc.SQLServerDriver"
       }
     },
     "target_database": {
       "type": "postgresql", 
       "jdbc_url": "jdbc:postgresql://server:5432/mydb",
       "properties": {
         "user": "username",
         "password": "password",
         "driver": "org.postgresql.Driver"
       }
     },
     "comparison_options": {
       "exclude_system_tables": true,
       "exclude_tables": ["temp_table", "log_table"],
       "case_sensitive_comparison": false
     }
   }
   ```

### Data Migration

Configure migration settings:
```json
{
  "source_database": { /* source config */ },
  "target_database": { /* target config */ },
  "migration_config": {
    "table_filters": {
      "exclude_system_tables": true,
      "include_tables": ["users", "orders", "products"]
    },
    "migration_options": {
      "write_mode": "overwrite",
      "batch_size": 10000,
      "read_partitions": 4,
      "add_migration_metadata": true
    }
  }
}
```

## 🚀 Advanced Features

### Performance Tuning
- **Partition Configuration**: Optimize read/write partitions based on data size
- **Memory Management**: Automatic Spark memory configuration
- **Batch Size Optimization**: Configurable batch sizes for different database types
- **Connection Pooling**: Efficient database connection management

### Data Transformations
- **Column Mapping**: Rename columns during migration
- **Data Type Casting**: Automatic type conversion between databases
- **Data Filtering**: Apply WHERE conditions during migration
- **Row Hashing**: Add integrity verification columns
- **Custom Transformations**: Extensible transformation pipeline

### Monitoring & Logging
- **Real-time Progress**: Live updates during long-running operations
- **Detailed Logging**: Comprehensive logs for troubleshooting
- **Performance Metrics**: Track processing speed and resource usage
- **Error Handling**: Graceful error recovery and reporting

## 🔧 Troubleshooting

### Common Issues

1. **Runtime Setup Fails**
   - Check internet connection
   - Run PowerShell as Administrator
   - Use force re-setup: `.\setup-runtime.ps1 -Force`

2. **Python Package Installation Fails**
   - Ensure runtime is set up first
   - Check Windows Defender/Antivirus settings
   - Try force reinstall: `.\install-python-packages.ps1 -Force`

3. **Spark Jobs Fail**
   - Verify all JDBC drivers are present
   - Check database connection strings
   - Review logs for specific error messages

4. **Memory Issues**
   - Increase Spark driver memory in configuration
   - Reduce batch sizes for large tables
   - Use more partitions for better parallelism

### Log Locations
- Runtime setup logs: Real-time in the UI or PowerShell console
- Python script logs: Embedded in script output
- Application logs: Available through the UI

## 🌟 Benefits

### For End Users
- **Zero Dependencies**: No need to install Python, Java, or Spark
- **Plug & Play**: Download, setup, and start migrating immediately
- **Professional Grade**: Enterprise-level performance and reliability
- **User Friendly**: Intuitive UI with progress monitoring

### For Organizations  
- **Reduced IT Overhead**: No environment setup or dependency management
- **Consistent Results**: Same runtime environment across all machines
- **Scalable**: Handle databases of any size with Spark's distributed processing
- **Secure**: Bundled components reduce external dependency risks

## 🔄 Updates and Maintenance

### Updating Components
- Runtime components can be updated by running setup scripts with `-Force` flag
- Python packages can be updated independently
- Application updates through standard Electron update mechanisms

### Backup and Recovery
- Runtime configurations are saved in `bundled-runtime/config/`
- Migration configurations can be exported/imported
- Complete runtime can be backed up by copying the `bundled-runtime` folder

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs for specific error messages  
3. Use the runtime health check in the UI
4. Report issues with detailed logs and configuration

---

**Note**: This self-contained approach ensures that your Spark Migration Tool works consistently across different environments without requiring users to install and configure complex dependencies like Python, Java, or Apache Spark.
