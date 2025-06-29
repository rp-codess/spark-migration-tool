"""
Spark Database Connection Script
Tests database connectivity using Spark JDBC drivers.
"""

import sys
import os
import json
from pathlib import Path

# Add spark-scripts to path
sys.path.insert(0, os.path.dirname(__file__))
from spark_environment import setup_spark_environment


def test_spark_connection(db_config):
    """
    Test database connection using Spark JDBC.
    
    Args:
        db_config: Database configuration dictionary
        
    Returns:
        dict: Connection test result
    """
    spark_env = None
    
    try:
        # Setup Spark environment with minimal logging
        spark_env = setup_spark_environment(log_level="ERROR")
        
        # Get Spark session with unique name
        session_id = f"connection_test_{db_config.get('database', 'unknown')}_{os.getpid()}"
        
        # Additional config for faster connection testing
        additional_config = {
            "spark.sql.adaptive.enabled": "false",  # Disable adaptive query execution for faster startup
            "spark.serializer": "org.apache.spark.serializer.KryoSerializer",
            "spark.kryo.unsafe": "true",
            "spark.sql.execution.arrow.pyspark.enabled": "false"
        }
        
        spark = spark_env.get_spark_session(session_id, additional_config)
        
        # Test connection with timeout handling
        result = spark_env.test_connection(db_config)
        
        # Add additional session info
        if result["success"]:
            result.update({
                "sessionId": session_id,
                "sparkVersion": spark.version,
                "javaHome": os.environ.get("JAVA_HOME"),
                "sparkHome": os.environ.get("SPARK_HOME"),
                "availableDrivers": list(spark_env.get_jdbc_drivers().keys())
            })
        else:
            # Clean up error message for better readability
            error_msg = result.get("error", "Unknown error")
            if "java.nio.file.NoSuchFileException" in error_msg:
                result["error"] = "Connection failed: Database server unreachable or credentials invalid"
            elif "Connection refused" in error_msg:
                result["error"] = "Connection failed: Database server is not running or not accessible"
            elif "Login failed" in error_msg:
                result["error"] = "Connection failed: Invalid username or password"
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        
        # Simplify common error messages
        if "java.nio.file.NoSuchFileException" in error_msg:
            error_msg = "Spark cleanup issue (non-critical) - connection test completed"
        elif "Connection refused" in error_msg:
            error_msg = "Database server is not running or not accessible"
        elif "No suitable driver" in error_msg:
            error_msg = "Database driver not found or not compatible"
        
        return {
            "success": False,
            "error": f"Connection test failed: {error_msg}"
        }
    
    finally:
        if spark_env:
            # Stop with better error handling
            try:
                spark_env.stop_spark_session()
            except Exception as cleanup_error:
                # Don't let cleanup errors mask the main result
                pass


def get_databases(session_id):
    """
    Get list of databases from the Spark session.
    
    Args:
        session_id: Spark session ID
        
    Returns:
        dict: Database list result
    """
    try:
        # For most SQL databases, this is a simple query
        # Note: This is a basic implementation - some databases may need custom queries
        databases = ["default"]  # Default database always exists
        
        # For SQL Server and other databases, we can try to get actual database names
        # This is a simplified version - in practice, we'd use the active Spark session
        # to query the database catalog
        
        return {
            "success": True,
            "databases": databases
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to get databases: {str(e)}"
        }


def main():
    """Main function to handle command line execution."""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python spark_connection.py <operation> [args...]"
        }))
        sys.exit(1)
    
    operation = sys.argv[1]
    
    try:
        if operation == "get_databases":
            if len(sys.argv) != 3:
                print(json.dumps({
                    "success": False,
                    "error": "Usage: python spark_connection.py get_databases <session_id>"
                }))
                sys.exit(1)
            
            session_id = sys.argv[2]
            result = get_databases(session_id)
            print(json.dumps(result))
            
        else:
            # Default operation - connection test
            if len(sys.argv) != 2:
                print(json.dumps({
                    "success": False,
                    "error": "Usage: python spark_connection.py <db_config_json>"
                }))
                sys.exit(1)
            
            # Parse database configuration
            db_config = json.loads(operation)  # operation is actually db_config_json in this case
            
            # Validate required fields
            required_fields = ["type", "host", "port", "database", "username", "password"]
            missing_fields = [field for field in required_fields if not db_config.get(field)]
            
            if missing_fields:
                print(json.dumps({
                    "success": False,
                    "error": f"Missing required fields: {', '.join(missing_fields)}"
                }))
                sys.exit(1)
            
            # Test connection
            result = test_spark_connection(db_config)
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
