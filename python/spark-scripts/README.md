# Spark Scripts for Migration Tool

This directory contains all Spark-related Python scripts used by the Migration Tool. Each script is designed to be executed independently by the Electron main process.

## Directory Structure

```
spark-scripts/
├── README.md                    # This file
├── spark_environment.py         # Environment setup utilities
├── spark_connection.py          # Database connection testing
├── spark_table_operations.py    # Table listing and operations
├── spark_export.py              # CSV export functionality
└── examples/                    # Example scripts for developers
    └── custom_migration.py      # Template for custom migrations
```

## Environment Setup

All scripts in this directory should use the bundled runtime environment. The standard setup pattern is:

```python
import sys
import os
import json
from pathlib import Path

# Import our environment setup utility
sys.path.insert(0, os.path.dirname(__file__))
from spark_environment import setup_spark_environment

# Setup the complete environment
spark_env = setup_spark_environment()
spark = spark_env.get_spark_session()

# Your Spark code here...

# Always cleanup
if spark:
    spark.stop()
```

## Database Connection Pattern

### SQL Server Connection
```python
# JDBC URL format for SQL Server
jdbc_url = f"jdbc:sqlserver://{host}:{port};databaseName={database};encrypt=true;trustServerCertificate=true"

# Connection properties
properties = {
    "user": username,
    "password": password,
    "driver": "com.microsoft.sqlserver.jdbc.SQLServerDriver"
}

# Read from database
df = spark.read.jdbc(jdbc_url, table_or_query, properties=properties)
```

### PostgreSQL Connection
```python
# JDBC URL format for PostgreSQL
jdbc_url = f"jdbc:postgresql://{host}:{port}/{database}"

# Connection properties
properties = {
    "user": username,
    "password": password,
    "driver": "org.postgresql.Driver"
}
```

### MySQL Connection
```python
# JDBC URL format for MySQL
jdbc_url = f"jdbc:mysql://{host}:{port}/{database}"

# Connection properties
properties = {
    "user": username,
    "password": password,
    "driver": "com.mysql.cj.jdbc.Driver"
}
```

## Script Guidelines

### 1. Input/Output Format
- **Input**: Scripts receive configuration as command line arguments or JSON files
- **Output**: Always return JSON to stdout for the main process to parse
- **Errors**: Use stderr for debug logs, stdout only for results

### 2. Error Handling
```python
try:
    # Your Spark operations
    result = {"success": True, "data": your_data}
    print(json.dumps(result))
except Exception as e:
    error_result = {"success": False, "error": str(e)}
    print(json.dumps(error_result))
    sys.exit(1)
```

### 3. Spark Configuration
Use the standard configuration from `spark_environment.py`:
- Memory settings optimized for desktop use
- Windows-specific configurations applied
- JDBC drivers automatically configured
- Logging levels set appropriately

### 4. Session Management
- Create Spark sessions with unique app names
- Always stop sessions in finally blocks
- Use minimal configurations for fast startup

## Available Scripts

### spark_connection.py
Tests database connectivity using Spark JDBC drivers.

**Usage**: `python spark_connection.py <config_json>`

**Input**: Database configuration as JSON string

**Output**: Connection test result with session info

### spark_table_operations.py
Lists all tables in the specified database.

**Usage**: `python spark_table_operations.py <config_json> <operation>`

**Operations**:
- `list_tables`: Get all tables with metadata
- `table_count`: Get count of tables
- `table_schemas`: Get schema information

### spark_export.py
Exports table metadata and data to CSV format.

**Usage**: `python spark_export.py <config_json> <export_config_json>`

**Features**:
- Metadata export with table information
- Data sampling and export
- Custom filtering options

## Development Guidelines

### Adding New Scripts

1. **Follow the naming convention**: `spark_<operation>.py`
2. **Use the environment setup utility**: Always import and use `spark_environment.py`
3. **Document your script**: Add docstrings and comments
4. **Test thoroughly**: Ensure scripts work with all supported databases
5. **Handle errors gracefully**: Return proper JSON error responses

### Testing Scripts

Test your scripts independently before integration:

```bash
# Navigate to spark-scripts directory
cd python/spark-scripts

# Test with sample configuration
python your_script.py '{"host":"localhost","port":"1433","database":"testdb","username":"user","password":"pass","type":"mssql"}'
```

### Debugging

Enable verbose logging during development:

```python
spark_env = setup_spark_environment(log_level="DEBUG")
```

## Integration with Main Process

Scripts are called from the Electron main process using Node.js `spawn`:

```javascript
const pythonExe = path.join(__dirname, '..', 'bundled-runtime', 'python', 'python.exe')
const scriptPath = path.join(__dirname, '..', 'python', 'spark-scripts', 'your_script.py')

const process = spawn(pythonExe, [scriptPath, JSON.stringify(config)], {
    cwd: path.join(__dirname, '..')
})
```

## Performance Considerations

- **Session Reuse**: For multiple operations, consider session reuse patterns
- **Memory Management**: Monitor memory usage for large datasets
- **Connection Pooling**: Use JDBC connection pooling for multiple queries
- **Partitioning**: Configure appropriate partitioning for large tables

## Security Notes

- **Password Handling**: Passwords are passed as arguments; ensure they're not logged
- **JDBC URLs**: Use secure connection parameters (encrypt=true, etc.)
- **Error Messages**: Don't expose sensitive information in error messages

## Examples

See the `examples/` directory for:
- Custom migration templates
- Advanced Spark operations
- Performance optimization examples
- Multi-database migration patterns
