"""
Hybrid Table Operations Script
Uses direct database connection when possible, falls back to Spark when needed.
"""

import sys
import os
import json
from pathlib import Path

# Add spark-scripts to path
sys.path.insert(0, os.path.dirname(__file__))


def try_direct_connection(db_config):
    """Try direct database connection for faster table listing."""
    try:
        db_type = db_config.get("type", "").lower()
        
        if db_type in ["mssql", "sqlserver"]:
            return _try_mssql_direct(db_config)
        elif db_type == "postgresql":
            return _try_postgresql_direct(db_config)
        elif db_type == "mysql":
            return _try_mysql_direct(db_config)
        else:
            # No direct connection available, use Spark
            return None
            
    except Exception:
        # If direct connection fails, fall back to Spark
        return None


def _try_mssql_direct(db_config):
    """Try direct SQL Server connection using pyodbc."""
    try:
        import pyodbc
        
        # Build connection string
        conn_str = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={db_config['host']},{db_config['port']};"
            f"DATABASE={db_config['database']};"
            f"UID={db_config['username']};"
            f"PWD={db_config['password']};"
            f"Encrypt=yes;TrustServerCertificate=yes;Connection Timeout=10"
        )
        
        conn = pyodbc.connect(conn_str, timeout=10)
        cursor = conn.cursor()
        
        query = """
        SELECT 
            COALESCE(TABLE_SCHEMA, 'dbo') as schema_name,
            TABLE_NAME as table_name,
            TABLE_TYPE as table_type
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        tables = []
        for row in rows:
            tables.append({
                "schema": row.schema_name if row.schema_name else "dbo",
                "name": row.table_name,
                "type": row.table_type
            })
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "tables": tables,
            "count": len(tables),
            "method": "direct_pyodbc"
        }
        
    except ImportError:
        # pyodbc not available
        return None
    except Exception:
        # Connection failed
        return None


def _try_postgresql_direct(db_config):
    """Try direct PostgreSQL connection using psycopg2."""
    try:
        import psycopg2
        
        conn = psycopg2.connect(
            host=db_config['host'],
            port=db_config['port'],
            database=db_config['database'],
            user=db_config['username'],
            password=db_config['password'],
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        
        query = """
        SELECT 
            table_schema as schema_name,
            table_name,
            table_type
        FROM information_schema.tables 
        WHERE table_type = 'BASE TABLE' 
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        tables = []
        for row in rows:
            tables.append({
                "schema": row[0],
                "name": row[1],
                "type": row[2]
            })
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "tables": tables,
            "count": len(tables),
            "method": "direct_psycopg2"
        }
        
    except ImportError:
        # psycopg2 not available
        return None
    except Exception:
        # Connection failed
        return None


def _try_mysql_direct(db_config):
    """Try direct MySQL connection using pymysql."""
    try:
        import pymysql
        
        conn = pymysql.connect(
            host=db_config['host'],
            port=int(db_config['port']),
            user=db_config['username'],
            password=db_config['password'],
            database=db_config['database'],
            connect_timeout=10
        )
        
        cursor = conn.cursor()
        
        query = """
        SELECT 
            TABLE_SCHEMA as schema_name,
            TABLE_NAME as table_name,
            TABLE_TYPE as table_type
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_SCHEMA = %s
        ORDER BY TABLE_SCHEMA, TABLE_NAME
        """
        
        cursor.execute(query, (db_config['database'],))
        rows = cursor.fetchall()
        
        tables = []
        for row in rows:
            tables.append({
                "schema": row[0],
                "name": row[1],
                "type": row[2]
            })
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "tables": tables,
            "count": len(tables),
            "method": "direct_pymysql"
        }
        
    except ImportError:
        # pymysql not available
        return None
    except Exception:
        # Connection failed
        return None


def get_tables_hybrid(db_config, operation="list_tables"):
    """
    Get tables using hybrid approach: direct connection first, then Spark fallback.
    """
    # Try direct connection first (faster and more reliable)
    if operation == "list_tables":
        direct_result = try_direct_connection(db_config)
        if direct_result:
            return direct_result
    
    # Fall back to Spark method
    try:
        from spark_table_operations import get_tables_list
        result = get_tables_list(db_config, operation)
        
        # Update method info to indicate fallback was used
        if result.get("success"):
            result["method"] = f"spark_fallback_{result.get('method', 'unknown')}"
            
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Both direct and Spark methods failed: {str(e)}"
        }


def main():
    """Main function to handle command line execution."""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python hybrid_table_operations.py <db_config_json> [operation]"
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
        result = get_tables_hybrid(db_config, operation)
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
