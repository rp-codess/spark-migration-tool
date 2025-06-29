# Spark Migration Tool

A powerful cross-platform desktop application built with Electron that provides seamless database migration and analysis capabilities using Apache Spark. The tool features a self-contained bundled runtime with Python, Java, Spark, and all necessary database drivers for enterprise-grade data operations.

## 🚀 Features

### Core Functionality
- **Database Connection Management**: Connect to multiple database types (SQL Server, PostgreSQL, MySQL, Oracle)
- **Table Schema Analysis**: Comprehensive table schema exploration and comparison
- **Data Migration**: Efficient data transfer between databases using Spark
- **Table Export**: Export table lists and schemas to CSV/JSON formats
- **Real-time Monitoring**: Live monitoring of migration jobs and progress tracking

### Advanced Capabilities
- **Spark Integration**: Full Apache Spark 3.5.0 integration for big data processing
- **Cross-Platform Support**: Windows, macOS, and Linux compatibility
- **Bundled Runtime**: Self-contained environment with no external dependencies
- **Connection Persistence**: Save and manage multiple database connections securely
- **Schema Comparison**: Side-by-side schema comparison between databases
- **Error Handling**: Robust error handling with detailed logging and recovery options

## 🛠 Technical Architecture

### Technology Stack
- **Frontend**: React 18.x with modern hooks and functional components
- **Backend**: Electron with Node.js for cross-platform desktop functionality
- **Data Processing**: Apache Spark 3.5.0 with PySpark
- **Database Connectivity**: JDBC drivers + ODBC for maximum compatibility
- **Build System**: Vite for fast development and optimized builds
- **Package Management**: Yarn for dependency management

### Bundled Runtime Components
- **Python 3.11.7**: Embedded Python distribution
- **OpenJDK 17**: Java Runtime Environment
- **Apache Spark 3.5.0**: Distributed computing framework
- **Hadoop 3.3.x**: Required for Spark operations on Windows
- **Database Drivers**:
  - SQL Server JDBC Driver (mssql-jdbc-12.4.2.jre8.jar)
  - PostgreSQL JDBC Driver (postgresql-42.7.4.jar)
  - MySQL JDBC Driver (mysql-connector-j-8.2.0.jar)
  - Oracle JDBC Driver (ojdbc11-21.7.0.0.jar)

## 📦 Installation

### Prerequisites
- Windows 10/11, macOS 10.14+, or Linux (Ubuntu 18.04+)
- 4GB RAM minimum (8GB recommended)
- 2GB free disk space
- Administrative privileges for initial setup

### Quick Start
1. **Download**: Get the latest release from the releases page
2. **Extract**: Unzip the application to your desired location
3. **Run Setup**: Execute the setup script for your platform:
   ```bash
   # Windows
   .\quick-start.ps1
   
   # macOS/Linux
   ./setup.sh
   ```
4. **Launch**: Start the application:
   ```bash
   npm start
   ```

### Development Setup
```bash
# Clone the repository
git clone https://github.com/your-org/spark-migration-tool.git
cd spark-migration-tool

# Install dependencies
yarn install

# Setup bundled runtime
.\bundled-runtime\scripts\setup-runtime.ps1  # Windows
./bundled-runtime/scripts/setup-runtime.sh   # macOS/Linux

# Start development server
yarn dev

# In another terminal, start Electron
yarn electron
```

## 🎯 Usage Guide

### 1. Database Connection Setup
1. Navigate to the **Connection Management** page
2. Click **"Add New Connection"**
3. Fill in database details:
   - **Name**: Friendly connection name
   - **Type**: Database type (SQL Server, PostgreSQL, etc.)
   - **Host**: Database server hostname/IP
   - **Port**: Database port (default: 1433 for SQL Server)
   - **Database**: Database name
   - **Username/Password**: Authentication credentials
4. Click **"Test Connection"** to verify
5. Save the connection for future use

### 2. Table Schema Exploration
1. Select a saved connection
2. Click **"Connect"** to establish connection
3. Browse tables in the **Database Explorer**:
   - View table schemas and column details
   - Check constraints and foreign keys
   - Preview table data with sample rows
   - Export individual table schemas

### 3. Schema Comparison
1. Connect to two different databases
2. Navigate to **Schema Comparison**
3. Select tables from both databases
4. View side-by-side schema differences:
   - Column additions/deletions
   - Data type changes
   - Constraint differences
   - Index variations

### 4. Data Migration
1. Set up source and target connections
2. Navigate to **Data Migration**
3. Configure migration settings:
   - Select source tables
   - Map to target tables
   - Set batch size and parallelism
   - Configure data transformations
4. Start migration and monitor progress
5. Validate data integrity post-migration

### 5. Spark Table Export
1. Go to **Spark Table Export**
2. Connect to database using Spark
3. View comprehensive table listing
4. Export table metadata to CSV
5. Monitor Spark runtime verification logs

## 🔧 Configuration

### Database Connection Strings
The tool supports various connection string formats:

**SQL Server**:
```
DRIVER={ODBC Driver 17 for SQL Server};SERVER=hostname,port;DATABASE=dbname;UID=username;PWD=password;Encrypt=yes;TrustServerCertificate=yes
```

**PostgreSQL**:
```
postgresql://username:password@hostname:port/database
```

**MySQL**:
```
mysql://username:password@hostname:port/database
```

### Spark Configuration
Located in `bundled-runtime/spark/conf/spark-defaults.conf`:
```properties
spark.master=local[*]
spark.driver.memory=2g
spark.executor.memory=2g
spark.sql.adaptive.enabled=true
spark.sql.adaptive.coalescePartitions.enabled=true
```

### Runtime Environment
The bundled runtime is configured in `bundled-runtime/config/runtime.env`:
```bash
PYTHON_HOME=/path/to/bundled/python
JAVA_HOME=/path/to/bundled/java
SPARK_HOME=/path/to/bundled/spark
HADOOP_HOME=/path/to/hadoop
```

## 🏗 Project Structure

```
spark-migration-tool/
├── src/                          # Main application source
│   ├── components/               # React components
│   │   ├── ConnectionPage.jsx    # Database connection management
│   │   ├── DatabaseDashboard.jsx # Main dashboard
│   │   ├── DatabaseExplorer.jsx  # Table browsing
│   │   ├── SparkTableExport.jsx  # Spark-based table export
│   │   ├── TableMapping.jsx      # Migration table mapping
│   │   └── TransferMonitor.jsx   # Migration monitoring
│   ├── database/                 # Database abstraction layer
│   ├── services/                 # Core services
│   ├── ui/                       # Reusable UI components
│   ├── utils/                    # Utility functions
│   ├── main.js                   # Electron main process
│   └── preload.js               # Electron preload script
├── bundled-runtime/              # Self-contained runtime
│   ├── python/                   # Python 3.11.7 distribution
│   ├── java/                     # OpenJDK 17 JRE
│   ├── spark/                    # Apache Spark 3.5.0
│   ├── drivers/                  # JDBC drivers
│   ├── scripts/                  # Setup and management scripts
│   └── config/                   # Runtime configuration
├── python/                       # Python scripts
│   ├── spark-scripts/            # Modular Spark scripts
│   │   ├── README.md                    # Developer documentation
│   │   ├── spark_environment.py         # Environment setup utility
│   │   ├── spark_connection.py          # Database connection testing
│   │   ├── spark_table_operations.py    # Table listing and operations
│   │   ├── spark_export.py              # CSV export functionality
│   │   └── examples/
│   │       └── custom_migration.py      # Custom migration template
│   ├── scripts/                  # Legacy migration and analysis scripts
│   │   ├── data_migration.py           # Data migration operations
│   │   └── schema_comparison.py        # Schema comparison utilities
│   └── requirements*.txt                # Python dependencies
├── public/                       # Static assets
├── dist/                         # Built application
├── package.json                  # Node.js dependencies
├── vite.config.js               # Vite build configuration
└── README.md                    # This file
```

## 🔄 Development Workflow

### Building the Application
```bash
# Development build
yarn build:dev

# Production build
yarn build

# Package for distribution
yarn package
```

### Testing
```bash
# Run unit tests
yarn test

# Run integration tests
yarn test:integration

# Test bundled runtime
yarn test:runtime
```

### Adding New Database Support
1. Add JDBC driver to `bundled-runtime/drivers/`
2. Update connection string templates in `src/database/`
3. Add database-specific SQL queries
4. Test connection and migration flows

## 🪟 Windows Compatibility Improvements

### Enhanced Spark Cleanup (v1.2+)
The tool includes comprehensive Windows-specific improvements for Spark operations:

**Key Improvements:**
- **🧹 Smart Temp Directory Management**: Unique session-based temporary directories prevent file conflicts
- **🔄 Graceful Cleanup**: Enhanced cleanup logic with proper file handle release timing
- **🚫 Suppressed Java Warnings**: Clean user interface without verbose Java stderr output
- **💪 Robust Error Handling**: User-friendly error messages instead of Java stack traces

**Technical Details:**
- Session-specific temp directories: `bundled-runtime/temp/spark/session_[timestamp]_[id]/`
- Automatic cleanup of directories older than 1 hour
- Windows file handle release timing improvements
- Spark shutdown hook optimization for Windows

**Error Message Examples:**
- ❌ Before: `ERROR ShutdownHookManager: Exception while deleting Spark temp dir: [500+ lines of Java stacktrace]`
- ✅ After: `Database host not found - check hostname/IP address`

**Files Involved:**
- `python/spark-scripts/spark_environment.py` - Enhanced Windows configuration
- `python/spark-scripts/spark_table_operations_clean.py` - Clean output wrapper
- `python/spark-scripts/WINDOWS_CLEANUP_IMPROVEMENTS.md` - Detailed technical documentation

### Testing Windows Improvements
```bash
# Run Windows-specific tests
cd python/spark-scripts
python test_windows_cleanup.py

# Test table operations with clean output
python spark_table_operations_clean.py '{"type":"postgresql","host":"test","port":5432,"database":"test","username":"user","password":"pass"}'
```

## 🪟 Windows Compatibility Improvements

### Enhanced Windows Support
Recent improvements have significantly enhanced Windows compatibility and user experience:

#### ✅ **Spark Temp Directory Handling**
- **Fixed**: Java NoSuchFileException errors during Spark cleanup
- **Solution**: Unique session-based temp directories with robust cleanup logic
- **Benefit**: Clean operation without disruptive error messages

#### ✅ **SQL Server ORDER BY Fix**
- **Fixed**: "ORDER BY clause is invalid" errors when listing SQL Server tables
- **Solution**: Restructured SQL queries to use Spark DataFrame sorting
- **Benefit**: Seamless SQL Server integration

#### ✅ **Clean Output Processing**
- **Added**: Clean wrapper scripts that suppress Java stderr warnings
- **Features**: Production-ready output with user-friendly error messages
- **Files**: `spark_table_operations_clean.py` for clean JSON responses

#### ✅ **Enhanced Error Handling**
- **Improved**: Intelligent error message parsing and user-friendly descriptions
- **Examples**: 
  - `"Cannot connect to SQL Server - check hostname and port"` instead of Java stack traces
  - `"Database host not found - check hostname/IP address"` for DNS issues
  - `"Invalid database credentials"` for authentication failures

#### 📁 **Windows-Specific Files**
- **`WINDOWS_IMPROVEMENTS.md`**: Detailed technical documentation
- **`test_windows_cleanup.py`**: Comprehensive Windows testing suite
- **`spark_table_operations_clean.py`**: Production wrapper with clean output

For detailed technical information, see [`WINDOWS_IMPROVEMENTS.md`](WINDOWS_IMPROVEMENTS.md).

## 🐛 Troubleshooting

### Common Issues

**1. Python Runtime Not Found**
```bash
# Reinstall Python runtime
.\bundled-runtime\scripts\setup-runtime.ps1 -Force
```

**2. Spark Session Fails to Start**
```bash
# Check Java installation
.\bundled-runtime\java\bin\java.exe -version

# Verify Spark configuration
cat .\bundled-runtime\spark\conf\spark-defaults.conf
```

**3. Database Connection Timeout**
- Verify network connectivity
- Check firewall settings
- Confirm database server is running
- Validate connection credentials

**4. JDBC Driver Issues**
- Ensure driver JARs are in `bundled-runtime/drivers/`
- Check driver version compatibility
- Verify classpaths in Spark configuration

### Logs and Debugging
- Application logs: `%APPDATA%/spark-migration-tool/logs/`
- Spark logs: `bundled-runtime/temp/spark/logs/`
- Python logs: Available in the UI console

## 📊 Performance Optimization

### Memory Configuration
Adjust memory settings based on data size:
```properties
# For large datasets (>10GB)
spark.driver.memory=4g
spark.executor.memory=4g
spark.driver.maxResultSize=2g

# For small datasets (<1GB)
spark.driver.memory=1g
spark.executor.memory=1g
```

### Migration Performance Tips
1. **Batch Size**: Start with 10,000 rows per batch
2. **Parallelism**: Use `local[*]` for maximum CPU utilization
3. **Network**: Ensure high-bandwidth connection between databases
4. **Indexing**: Drop indexes before migration, recreate after
5. **Partitioning**: Use date/time columns for natural partitioning

## 🔒 Security Considerations

### Connection Security
- Passwords are encrypted using AES-256-CBC
- SSL/TLS connections enforced by default
- Connection strings stored securely in OS keychain
- No plain-text credentials in configuration files

### Data Protection
- In-memory processing minimizes data exposure
- Temporary files automatically cleaned up
- Audit logs for all data operations
- Role-based access control support

## 🤝 Contributing

### Development Guidelines
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes with proper tests
4. Run linting: `yarn lint`
5. Submit pull request with detailed description

### Code Style
- Use ESLint configuration provided
- Follow React functional component patterns
- Use TypeScript for new components
- Document all public APIs

### Testing Requirements
- Unit tests for all new functions
- Integration tests for database operations
- UI tests for critical user flows
- Performance tests for large datasets

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [User Manual](docs/user-manual.md)
- [API Reference](docs/api-reference.md)
- [Troubleshooting Guide](docs/troubleshooting.md)

### Community
- GitHub Issues: Bug reports and feature requests
- Discussions: Community Q&A and tips
- Wiki: Community-contributed documentation

### Commercial Support
For enterprise support, custom features, or professional services:
- Email: support@sparkmigrationtool.com
- Website: https://sparkmigrationtool.com

## 🎉 Acknowledgments

### Open Source Projects
- **Apache Spark**: Distributed computing framework
- **Electron**: Cross-platform desktop applications
- **React**: User interface library
- **Node.js**: JavaScript runtime
- **Python**: Programming language and ecosystem

### Contributors
Special thanks to all contributors who have helped make this project better.

---

**Built with ❤️ for the data engineering community**

*Last updated: June 2025*
