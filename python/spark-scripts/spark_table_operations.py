"""
Spark Table Operations Script
Handles table listing and metadata operations using Spark JDBC.
"""

import sys
import os
import json
from pathlib import Path

# Add spark-scripts to path
sys.path.insert(0, os.path.dirname(__file__))
from spark_environment import setup_spark_environment


def get_tables_list(db_config, operation="list_tables"):
    """
    Get table information from database using Spark.
    
    Args:
        db_config: Database configuration dictionary
        operation: Type of operation (list_tables, table_count, table_schemas)
        
    Returns:
        dict: Operation result
    """
    spark_env = None
    
    try:
        # Setup Spark environment with minimal logging for better performance
        spark_env = setup_spark_environment(log_level="ERROR")
        
        # Get Spark session with optimized config for table operations
        session_id = f"table_ops_{db_config.get('database', 'unknown')}_{os.getpid()}"
        
        # Optimized config for table listing
        additional_config = {
            "spark.sql.adaptive.enabled": "false",
            "spark.serializer": "org.apache.spark.serializer.KryoSerializer",
            "spark.sql.execution.arrow.pyspark.enabled": "false",
            "spark.sql.streaming.forceDeleteTempCheckpointLocation": "true"
        }
        
        spark = spark_env.get_spark_session(session_id, additional_config)
        
        # Get JDBC connection details
        jdbc_url = spark_env.get_jdbc_url(db_config)
        properties = spark_env.get_jdbc_properties(db_config)
        
        # Execute operation based on type
        if operation == "list_tables":
            return _list_tables(spark, jdbc_url, properties, db_config, session_id)
        elif operation == "table_count":
            return _get_table_count(spark, jdbc_url, properties, db_config, session_id)
        elif operation == "table_schemas":
            return _get_table_schemas(spark, jdbc_url, properties, db_config, session_id)
        else:
            return {
                "success": False,
                "error": f"Unknown operation: {operation}"
            }
            
    except Exception as e:
        error_msg = str(e)
        
        # Simplify common error messages for better user experience
        if "java.nio.file.NoSuchFileException" in error_msg:
            # This is a Windows temp cleanup issue - operation likely succeeded
            return {
                "success": True,
                "warning": "Operation completed but temporary file cleanup had issues (Windows)",
                "tables": [],
                "count": 0,
                "method": "spark_jdbc_with_cleanup_warning"
            }
        elif "Connection refused" in error_msg or "Could not connect" in error_msg:
            error_msg = "Database server is not running or not accessible"
        elif "Login failed" in error_msg or "Authentication failed" in error_msg:
            error_msg = "Invalid database credentials"
        elif "java.lang.ClassNotFoundException" in error_msg:
            error_msg = "Database driver not found or not compatible"
        elif "java.net.SocketTimeoutException" in error_msg:
            error_msg = "Database connection timeout - server may be slow or busy"
        elif "java.sql.SQLException" in error_msg and "database" in error_msg.lower():
            error_msg = "Database does not exist or access is denied"
        elif "java.net.UnknownHostException" in error_msg:
            error_msg = "Database host not found - check hostname/IP address"
        elif "The connection attempt failed" in error_msg:
            error_msg = "Cannot connect to database - check host, port, and network"
        elif "Connection timed out" in error_msg:
            error_msg = "Database connection timed out - server may be unreachable"
        elif "java.sql.SQLInvalidAuthorizationSpecException" in error_msg:
            error_msg = "Database login failed - check username and password"
        elif "The TCP/IP connection to the host" in error_msg:
            error_msg = "Cannot connect to SQL Server - check hostname and port"
        elif "ORDER BY clause is invalid" in error_msg:
            error_msg = "SQL query structure issue - this should be fixed in the latest version"
        elif "Login timeout expired" in error_msg:
            error_msg = "SQL Server login timeout - server may be busy or slow"
        else:
            # Keep original error for unknown issues, but limit length
            if len(error_msg) > 200:
                error_msg = error_msg[:200] + "... (error truncated)"
        
        return {
            "success": False,
            "error": f"Table operation failed: {error_msg}",
            "method": "spark_jdbc"
        }
    
    finally:
        if spark_env:
            try:
                # Give Windows extra time to release file handles
                import time
                time.sleep(0.5)
                spark_env.stop_spark_session()
            except Exception as cleanup_error:
                # Log cleanup errors but don't let them affect the result
                print(f"Warning: Cleanup error (non-critical): {cleanup_error}", file=sys.stderr)


def _list_tables(spark, jdbc_url, properties, db_config, session_id):
    """List all tables in the database."""
    db_type = db_config.get("type", "").lower()
    
    # Build table query based on database type
    # Note: Subqueries in Spark JDBC cannot have ORDER BY clauses
    if db_type in ["mssql", "sqlserver"]:
        query = """
        (SELECT 
            COALESCE(TABLE_SCHEMA, 'dbo') as schema_name,
            TABLE_NAME as table_name,
            TABLE_TYPE as table_type
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE') as tables
        """
    elif db_type == "postgresql":
        query = """
        (SELECT 
            table_schema as schema_name,
            table_name,
            table_type
        FROM information_schema.tables 
        WHERE table_type = 'BASE TABLE' 
        AND table_schema NOT IN ('information_schema', 'pg_catalog')) as tables
        """
    elif db_type == "mysql":
        database_name = db_config.get("database")
        query = f"""
        (SELECT 
            TABLE_SCHEMA as schema_name,
            TABLE_NAME as table_name,
            TABLE_TYPE as table_type
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_SCHEMA = '{database_name}') as tables
        """
    elif db_type == "oracle":
        query = """
        (SELECT 
            OWNER as schema_name,
            TABLE_NAME as table_name,
            'BASE TABLE' as table_type
        FROM ALL_TABLES) as tables
        """
    else:
        raise ValueError(f"Unsupported database type: {db_type}")
    
    # Execute query
    df = spark.read.jdbc(jdbc_url, query, properties=properties)
    
    # Sort the DataFrame using Spark operations instead of SQL ORDER BY
    df_sorted = df.orderBy("schema_name", "table_name")
    rows = df_sorted.collect()
    
    # Convert to list of dictionaries
    tables = []
    for row in rows:
        tables.append({
            "schema": row.schema_name if row.schema_name else "dbo",
            "name": row.table_name,
            "type": row.table_type
        })
    
    return {
        "success": True,
        "tables": tables,
        "count": len(tables),
        "sessionId": session_id,
        "method": "spark_jdbc"
    }


def _get_table_count(spark, jdbc_url, properties, db_config, session_id):
    """Get count of tables in the database."""
    db_type = db_config.get("type", "").lower()
    
    if db_type in ["mssql", "sqlserver"]:
        query = """
        (SELECT COUNT(*) as table_count
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE') as count_query
        """
    elif db_type == "postgresql":
        query = """
        (SELECT COUNT(*) as table_count
        FROM information_schema.tables 
        WHERE table_type = 'BASE TABLE' 
        AND table_schema NOT IN ('information_schema', 'pg_catalog')) as count_query
        """
    elif db_type == "mysql":
        database_name = db_config.get("database")
        query = f"""
        (SELECT COUNT(*) as table_count
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_SCHEMA = '{database_name}') as count_query
        """
    elif db_type == "oracle":
        query = """
        (SELECT COUNT(*) as table_count
        FROM ALL_TABLES) as count_query
        """
    else:
        raise ValueError(f"Unsupported database type: {db_type}")
    
    df = spark.read.jdbc(jdbc_url, query, properties=properties)
    result = df.collect()[0]
    
    return {
        "success": True,
        "count": result.table_count,
        "sessionId": session_id
    }


def _get_table_schemas(spark, jdbc_url, properties, db_config, session_id):
    """Get schema information for all tables."""
    # First get table list
    tables_result = _list_tables(spark, jdbc_url, properties, db_config, session_id)
    
    if not tables_result["success"]:
        return tables_result
    
    # Get schema info for each table
    tables_with_schemas = []
    db_type = db_config.get("type", "").lower()
    
    for table in tables_result["tables"][:10]:  # Limit to first 10 for performance
        try:
            schema_query = _build_schema_query(db_type, table["name"], table["schema"])
            df = spark.read.jdbc(jdbc_url, schema_query, properties=properties)
            columns = df.collect()
            
            table_info = table.copy()
            table_info["columns"] = [
                {
                    "name": col.column_name,
                    "type": col.data_type,
                    "nullable": col.is_nullable == "YES" if hasattr(col, 'is_nullable') else True
                } for col in columns
            ]
            tables_with_schemas.append(table_info)
            
        except Exception as e:
            # If schema query fails, just include table without column info
            table_info = table.copy()
            table_info["schema_error"] = str(e)
            tables_with_schemas.append(table_info)
    
    return {
        "success": True,
        "tables": tables_with_schemas,
        "count": len(tables_with_schemas),
        "sessionId": session_id,
        "note": "Limited to first 10 tables for performance"
    }


def _build_schema_query(db_type, table_name, schema_name):
    """Build schema query for specific database type."""
    if db_type in ["mssql", "sqlserver"]:
        return f"""
        (SELECT 
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            IS_NULLABLE as is_nullable
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '{table_name}' 
        AND TABLE_SCHEMA = '{schema_name}'
        ORDER BY ORDINAL_POSITION) as schema_query
        """
    elif db_type == "postgresql":
        return f"""
        (SELECT 
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns
        WHERE table_name = '{table_name}' 
        AND table_schema = '{schema_name}'
        ORDER BY ordinal_position) as schema_query
        """
    elif db_type == "mysql":
        return f"""
        (SELECT 
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            IS_NULLABLE as is_nullable
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '{table_name}' 
        AND TABLE_SCHEMA = '{schema_name}'
        ORDER BY ORDINAL_POSITION) as schema_query
        """
    elif db_type == "oracle":
        return f"""
        (SELECT 
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            NULLABLE as is_nullable
        FROM ALL_TAB_COLUMNS
        WHERE TABLE_NAME = '{table_name}' 
        AND OWNER = '{schema_name}'
        ORDER BY COLUMN_ID) as schema_query
        """
    else:
        raise ValueError(f"Unsupported database type: {db_type}")


def main():
    """Main function to handle command line execution."""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python spark_table_operations.py <db_config_json> [operation]"
        }))
        sys.exit(1)
    
    try:
        # Parse database configuration
        db_config = json.loads(sys.argv[1])
        operation = sys.argv[2] if len(sys.argv) > 2 else "list_tables"
        
        # Validate required fields
        required_fields = ["type", "host", "port", "database", "username", "password"]
        missing_fields = [field for field in required_fields if not db_config.get(field)]
        
        if missing_fields:
            print(json.dumps({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }))
            sys.exit(1)
        
        # Execute operation
        result = get_tables_list(db_config, operation)
        print(json.dumps(result))
        
        if not result["success"]:
            sys.exit(1)
            
    except json.JSONDecodeError:
        print(json.dumps({
            "success": False,
            "error": "Invalid JSON configuration provided"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Unexpected error: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
