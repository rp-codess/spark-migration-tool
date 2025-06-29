"""
Spark Export Script
Handles CSV export of table metadata and data using Spark.
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime

# Add spark-scripts to path
sys.path.insert(0, os.path.dirname(__file__))
from spark_environment import setup_spark_environment


def export_table_metadata(db_config, export_config):
    """
    Export table metadata to CSV format.
    
    Args:
        db_config: Database configuration dictionary
        export_config: Export configuration dictionary
        
    Returns:
        dict: Export result with CSV content
    """
    spark_env = None
    
    try:
        # Setup Spark environment
        spark_env = setup_spark_environment()
        
        # Get Spark session
        session_id = f"export_{db_config.get('database', 'unknown')}_{os.getpid()}"
        spark = spark_env.get_spark_session(session_id)
        
        # Get table list
        from spark_table_operations import _list_tables
        
        jdbc_url = spark_env.get_jdbc_url(db_config)
        properties = spark_env.get_jdbc_properties(db_config)
        
        tables_result = _list_tables(spark, jdbc_url, properties, db_config, session_id)
        
        if not tables_result["success"]:
            return tables_result
        
        # Generate CSV content
        csv_content = _generate_csv_content(tables_result["tables"], export_config)
        
        # Generate metadata
        metadata = {
            "database": db_config.get("database"),
            "host": db_config.get("host"),
            "tableCount": len(tables_result["tables"]),
            "exportedAt": datetime.now().isoformat(),
            "sessionId": session_id
        }
        
        return {
            "success": True,
            "content": csv_content,
            "metadata": metadata,
            "sessionId": session_id
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Export failed: {str(e)}"
        }
    
    finally:
        if spark_env:
            spark_env.stop_spark_session()


def _generate_csv_content(tables, export_config):
    """Generate CSV content from table list."""
    # CSV headers
    headers = ["Schema", "Table Name", "Table Type", "Row Count", "Export Status"]
    csv_lines = [",".join(headers)]
    
    # Add table rows
    for table in tables:
        row = [
            table.get("schema", ""),
            table.get("name", ""),
            table.get("type", ""),
            str(table.get("row_count", "N/A")),
            "Exported" if table.get("exported", False) else "Metadata Only"
        ]
        # Escape commas in values
        escaped_row = [f'"{value}"' if "," in str(value) else str(value) for value in row]
        csv_lines.append(",".join(escaped_row))
    
    return "\\n".join(csv_lines)


def export_table_data(db_config, export_config):
    """
    Export actual table data (limited sample) to CSV.
    
    Args:
        db_config: Database configuration dictionary
        export_config: Export configuration with table selection
        
    Returns:
        dict: Export result with data CSV content
    """
    spark_env = None
    
    try:
        # Setup Spark environment
        spark_env = setup_spark_environment()
        
        # Get Spark session
        session_id = f"data_export_{db_config.get('database', 'unknown')}_{os.getpid()}"
        spark = spark_env.get_spark_session(session_id)
        
        # Get JDBC connection details
        jdbc_url = spark_env.get_jdbc_url(db_config)
        properties = spark_env.get_jdbc_properties(db_config)
        
        # Get table to export
        table_name = export_config.get("table_name")
        schema_name = export_config.get("schema_name", "dbo")
        limit = export_config.get("limit", 1000)
        
        if not table_name:
            return {
                "success": False,
                "error": "No table specified for data export"
            }
        
        # Build table query
        full_table_name = f"{schema_name}.{table_name}"
        query = f"(SELECT * FROM {full_table_name} LIMIT {limit}) as data_export"
        
        # Read data
        df = spark.read.jdbc(jdbc_url, query, properties=properties)
        rows = df.collect()
        
        # Convert to CSV
        if rows:
            # Get column names
            columns = df.columns
            csv_lines = [",".join(columns)]
            
            # Add data rows
            for row in rows:
                values = [str(row[col]) if row[col] is not None else "" for col in columns]
                escaped_values = [f'"{value}"' if "," in value else value for value in values]
                csv_lines.append(",".join(escaped_values))
            
            csv_content = "\\n".join(csv_lines)
        else:
            csv_content = "No data found"
        
        metadata = {
            "table": f"{schema_name}.{table_name}",
            "database": db_config.get("database"),
            "host": db_config.get("host"),
            "rowCount": len(rows),
            "exportedAt": datetime.now().isoformat(),
            "sessionId": session_id
        }
        
        return {
            "success": True,
            "content": csv_content,
            "metadata": metadata,
            "sessionId": session_id
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Data export failed: {str(e)}"
        }
    
    finally:
        if spark_env:
            spark_env.stop_spark_session()


def main():
    """Main function to handle command line execution."""
    if len(sys.argv) != 3:
        print(json.dumps({
            "success": False,
            "error": "Usage: python spark_export.py <db_config_json> <export_config_json>"
        }))
        sys.exit(1)
    
    try:
        # Parse configurations
        db_config = json.loads(sys.argv[1])
        export_config = json.loads(sys.argv[2])
        
        # Validate required fields
        required_fields = ["type", "host", "port", "database", "username", "password"]
        missing_fields = [field for field in required_fields if not db_config.get(field)]
        
        if missing_fields:
            print(json.dumps({
                "success": False,
                "error": f"Missing required fields: {', '.join(missing_fields)}"
            }))
            sys.exit(1)
        
        # Determine export type
        export_type = export_config.get("type", "metadata")
        
        if export_type == "metadata":
            result = export_table_metadata(db_config, export_config)
        elif export_type == "data":
            result = export_table_data(db_config, export_config)
        else:
            result = {
                "success": False,
                "error": f"Unknown export type: {export_type}"
            }
        
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
