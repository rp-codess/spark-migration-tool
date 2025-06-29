"""
Custom Migration Template
Use this template to create custom Spark-based migration scripts.
"""

import sys
import os
import json
from pathlib import Path
from datetime import datetime

# Add spark-scripts to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from spark_environment import setup_spark_environment


def custom_migration(source_config, target_config, migration_config):
    """
    Perform custom data migration between databases.
    
    Args:
        source_config: Source database configuration
        target_config: Target database configuration
        migration_config: Migration-specific configuration
        
    Returns:
        dict: Migration result
    """
    spark_env = None
    
    try:
        # Setup Spark environment
        spark_env = setup_spark_environment()
        
        # Get Spark session
        session_id = f"migration_{source_config.get('database')}_{target_config.get('database')}_{os.getpid()}"
        spark = spark_env.get_spark_session(session_id)
        
        # Get connection details
        source_jdbc_url = spark_env.get_jdbc_url(source_config)
        source_properties = spark_env.get_jdbc_properties(source_config)
        
        target_jdbc_url = spark_env.get_jdbc_url(target_config)
        target_properties = spark_env.get_jdbc_properties(target_config)
        
        # Migration logic starts here
        results = []
        tables_to_migrate = migration_config.get("tables", [])
        
        for table_config in tables_to_migrate:
            table_result = _migrate_table(
                spark, 
                source_jdbc_url, source_properties,
                target_jdbc_url, target_properties,
                table_config
            )
            results.append(table_result)
        
        # Calculate summary
        successful_tables = [r for r in results if r["success"]]
        failed_tables = [r for r in results if not r["success"]]
        
        return {
            "success": len(failed_tables) == 0,
            "sessionId": session_id,
            "summary": {
                "total_tables": len(results),
                "successful": len(successful_tables),
                "failed": len(failed_tables),
                "total_rows_migrated": sum(r.get("rows_migrated", 0) for r in successful_tables)
            },
            "details": results,
            "completed_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Migration failed: {str(e)}"
        }
    
    finally:
        if spark_env:
            spark_env.stop_spark_session()


def _migrate_table(spark, source_jdbc_url, source_properties, target_jdbc_url, target_properties, table_config):
    """Migrate a single table."""
    try:
        source_table = table_config.get("source_table")
        target_table = table_config.get("target_table", source_table)
        source_schema = table_config.get("source_schema", "dbo")
        target_schema = table_config.get("target_schema", "public")
        
        # Read from source
        source_query = f"(SELECT * FROM {source_schema}.{source_table}) as source_data"
        df = spark.read.jdbc(source_jdbc_url, source_query, properties=source_properties)
        
        # Apply transformations if specified
        transformations = table_config.get("transformations", [])
        for transform in transformations:
            df = _apply_transformation(df, transform)
        
        # Write to target
        df.write \
          .jdbc(target_jdbc_url, f"{target_schema}.{target_table}", 
                mode="overwrite", properties=target_properties)
        
        return {
            "success": True,
            "source_table": f"{source_schema}.{source_table}",
            "target_table": f"{target_schema}.{target_table}",
            "rows_migrated": df.count()
        }
        
    except Exception as e:
        return {
            "success": False,
            "source_table": f"{source_schema}.{source_table}",
            "target_table": f"{target_schema}.{target_table}",
            "error": str(e)
        }


def _apply_transformation(df, transform):
    """Apply data transformation to DataFrame."""
    transform_type = transform.get("type")
    
    if transform_type == "rename_column":
        old_name = transform.get("old_name")
        new_name = transform.get("new_name")
        return df.withColumnRenamed(old_name, new_name)
        
    elif transform_type == "filter_rows":
        condition = transform.get("condition")
        return df.filter(condition)
        
    elif transform_type == "add_column":
        column_name = transform.get("column_name")
        column_value = transform.get("column_value")
        from pyspark.sql.functions import lit
        return df.withColumn(column_name, lit(column_value))
        
    elif transform_type == "cast_column":
        column_name = transform.get("column_name")
        data_type = transform.get("data_type")
        return df.withColumn(column_name, df[column_name].cast(data_type))
        
    else:
        # Unknown transformation, return unchanged
        return df


def main():
    """Main function for command line execution."""
    if len(sys.argv) != 4:
        print(json.dumps({
            "success": False,
            "error": "Usage: python custom_migration.py <source_config_json> <target_config_json> <migration_config_json>"
        }))
        sys.exit(1)
    
    try:
        # Parse configurations
        source_config = json.loads(sys.argv[1])
        target_config = json.loads(sys.argv[2])
        migration_config = json.loads(sys.argv[3])
        
        # Execute migration
        result = custom_migration(source_config, target_config, migration_config)
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


# Example configuration for testing
if __name__ == "__main__":
    if len(sys.argv) == 1:
        # Print example configuration
        example_migration_config = {
            "tables": [
                {
                    "source_table": "users",
                    "target_table": "users",
                    "source_schema": "dbo",
                    "target_schema": "public",
                    "transformations": [
                        {
                            "type": "rename_column",
                            "old_name": "user_id",
                            "new_name": "id"
                        },
                        {
                            "type": "add_column",
                            "column_name": "migrated_at",
                            "column_value": "2024-01-01"
                        }
                    ]
                }
            ]
        }
        
        print("Example migration configuration:")
        print(json.dumps(example_migration_config, indent=2))
    else:
        main()
