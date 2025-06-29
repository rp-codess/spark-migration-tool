"""
Enhanced Database Schema Comparison Tool
Compares sc        try:
            driver_jars = self.runtime.get_driver_jars()
            jar_paths = ','.join(str(jar) for jar in driver_jars)
            
            self.spark = SparkSession.builder \
                .appName("Database Schema Comparison Tool") \
                .config("spark.jars", jar_paths) \
                .config("spark.driver.extraClassPath", jar_paths) \
                .config("spark.executor.extraClassPath", jar_paths) \
                .config("spark.sql.adaptive.enabled", "true") \
                .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
                .config("spark.local.dir", "C:/temp/spark-local") \
                .config("spark.sql.warehouse.dir", "C:/temp/spark-warehouse") \
                .config("spark.driver.bindAddress", "localhost") \
                .config("spark.driver.host", "localhost") \
                .config("spark.eventLog.enabled", "false") \
                .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
                .getOrCreate()
            
            print("✅ Spark session initialized successfully")
            return Trueifferent database systems using PySpark
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Add runtime manager to path
sys.path.insert(0, str(Path(__file__).parent.parent / "bundled-runtime" / "scripts"))

try:
    from runtime_manager import get_runtime_manager
    
    # Initialize runtime
    runtime = get_runtime_manager()
    runtime.setup_environment()
    
    # Now import Spark components
    import findspark
    findspark.init(runtime.get_spark_home())
    
    from pyspark.sql import SparkSession
    from pyspark.sql.functions import col, lit, current_timestamp
    from pyspark.sql.types import StructType, StructField, StringType, IntegerType
    
except ImportError as e:
    print(f"Failed to import required modules: {e}")
    print("Please ensure all runtime components are properly installed.")
    sys.exit(1)

class DatabaseSchemaComparator:
    def __init__(self, config=None):
        self.config = config or {}
        self.spark = None
        self.runtime = get_runtime_manager()
        self.results = {
            'comparison_results': [],
            'summary_stats': {
                'source_tables': 0,
                'target_tables': 0,
                'tables_in_both': 0,
                'tables_only_in_source': 0,
                'tables_only_in_target': 0,
                'tables_with_differences': 0,
                'total_column_differences': 0
            },
            'start_time': None,
            'end_time': None,
            'duration_seconds': 0
        }
    
    def initialize_spark(self):
        """Initialize Spark session with bundled components"""
        try:
            # Get JDBC drivers
            driver_jars = self.runtime.get_driver_jars()
            jar_paths = ','.join(str(jar) for jar in driver_jars)
            
            self.spark = SparkSession.builder \
                .appName("Database Schema Comparison Tool") \
                .config("spark.jars", jar_paths) \
                .config("spark.driver.extraClassPath", jar_paths) \
                .config("spark.executor.extraClassPath", jar_paths) \
                .config("spark.sql.adaptive.enabled", "true") \
                .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
                .getOrCreate()
            
            print("✅ Spark session initialized successfully")
            return True
            
        except Exception as e:
            print(f"❌ Failed to initialize Spark: {e}")
            return False
    
    def test_database_connection(self, db_config):
        """Test database connection"""
        try:
            test_query = self._get_test_query(db_config['type'])
            
            test_df = self.spark.read.jdbc(
                url=db_config['jdbc_url'],
                table=test_query,
                properties=db_config['properties']
            )
            
            result = test_df.collect()[0]
            return True, result
            
        except Exception as e:
            return False, str(e)
    
    def _get_test_query(self, db_type):
        """Get appropriate test query for database type"""
        queries = {
            'sqlserver': "(SELECT @@VERSION as version, DB_NAME() as database_name) AS test",
            'postgresql': "(SELECT current_database() as db_name, version() as pg_version) AS test",
            'mysql': "(SELECT DATABASE() as db_name, VERSION() as version) AS test",
            'oracle': "(SELECT SYS_CONTEXT('USERENV', 'DB_NAME') as db_name, BANNER as version FROM V$VERSION WHERE ROWNUM = 1) AS test"
        }
        return queries.get(db_type, "(SELECT 1 as test_value) AS test")
    
    def get_schema_info(self, db_config):
        """Get schema information from database"""
        db_type = db_config['type'].lower()
        
        if db_type == 'sqlserver':
            return self._get_sqlserver_schema(db_config)
        elif db_type == 'postgresql':
            return self._get_postgresql_schema(db_config)
        elif db_type == 'mysql':
            return self._get_mysql_schema(db_config)
        elif db_type == 'oracle':
            return self._get_oracle_schema(db_config)
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
    
    def _get_sqlserver_schema(self, db_config):
        """Get SQL Server schema information"""
        schema_query = """
        (SELECT 
            t.TABLE_NAME,
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.IS_NULLABLE,
            c.COLUMN_DEFAULT,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.NUMERIC_PRECISION,
            c.NUMERIC_SCALE,
            c.ORDINAL_POSITION,
            CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'YES' ELSE 'NO' END as IS_PRIMARY_KEY
        FROM INFORMATION_SCHEMA.TABLES t
        LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
        LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc ON t.TABLE_NAME = tc.TABLE_NAME AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk ON tc.CONSTRAINT_NAME = pk.CONSTRAINT_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
        WHERE t.TABLE_TYPE = 'BASE TABLE'
        AND t.TABLE_SCHEMA = 'dbo'
        ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION) AS schema_info
        """
        
        return self.spark.read.jdbc(
            url=db_config['jdbc_url'],
            table=schema_query,
            properties=db_config['properties']
        ).collect()
    
    def _get_postgresql_schema(self, db_config):
        """Get PostgreSQL schema information"""
        schema_query = """
        (SELECT 
            t.table_name,
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            c.character_maximum_length,
            c.numeric_precision,
            c.numeric_scale,
            c.ordinal_position,
            CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END as is_primary_key
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
        LEFT JOIN information_schema.table_constraints tc ON t.table_name = tc.table_name AND tc.constraint_type = 'PRIMARY KEY'
        LEFT JOIN information_schema.key_column_usage pk ON tc.constraint_name = pk.constraint_name AND c.column_name = pk.column_name
        WHERE t.table_type = 'BASE TABLE'
        AND t.table_schema = 'public'
        ORDER BY t.table_name, c.ordinal_position) AS schema_info
        """
        
        return self.spark.read.jdbc(
            url=db_config['jdbc_url'],
            table=schema_query,
            properties=db_config['properties']
        ).collect()
    
    def _get_mysql_schema(self, db_config):
        """Get MySQL schema information"""
        schema_query = f"""
        (SELECT 
            t.TABLE_NAME,
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.IS_NULLABLE,
            c.COLUMN_DEFAULT,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.NUMERIC_PRECISION,
            c.NUMERIC_SCALE,
            c.ORDINAL_POSITION,
            CASE WHEN k.COLUMN_NAME IS NOT NULL THEN 'YES' ELSE 'NO' END as IS_PRIMARY_KEY
        FROM INFORMATION_SCHEMA.TABLES t
        LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
        LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k ON c.TABLE_NAME = k.TABLE_NAME AND c.COLUMN_NAME = k.COLUMN_NAME AND k.CONSTRAINT_NAME = 'PRIMARY'
        WHERE t.TABLE_TYPE = 'BASE TABLE'
        AND t.TABLE_SCHEMA = '{db_config.get("database", "")}'
        ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION) AS schema_info
        """
        
        return self.spark.read.jdbc(
            url=db_config['jdbc_url'],
            table=schema_query,
            properties=db_config['properties']
        ).collect()
    
    def compare_schemas(self, source_config, target_config, comparison_config=None):
        """Compare schemas between two databases"""
        self.results['start_time'] = datetime.now()
        
        if not self.initialize_spark():
            return self.results
        
        try:
            print("=== Database Schema Comparison Tool ===")
            print(f"Started at: {self.results['start_time']}")
            
            # Test connections
            print("\n=== Testing Database Connections ===")
            
            source_connected, source_info = self.test_database_connection(source_config)
            if not source_connected:
                raise Exception(f"Source database connection failed: {source_info}")
            print(f"✅ Source {source_config['type']} Connection Successful")
            
            target_connected, target_info = self.test_database_connection(target_config)
            if not target_connected:
                raise Exception(f"Target database connection failed: {target_info}")
            print(f"✅ Target {target_config['type']} Connection Successful")
            
            # Get schema information
            print(f"\n=== Retrieving Schema Information ===")
            
            print(f"Getting {source_config['type']} schema...")
            source_schema_data = self.get_schema_info(source_config)
            source_tables = self._organize_schema_data(source_schema_data, source_config['type'])
            
            print(f"Getting {target_config['type']} schema...")
            target_schema_data = self.get_schema_info(target_config)
            target_tables = self._organize_schema_data(target_schema_data, target_config['type'])
            
            # Apply filters if specified
            if comparison_config:
                source_tables = self._apply_filters(source_tables, comparison_config)
                target_tables = self._apply_filters(target_tables, comparison_config)
            
            # Perform comparison
            self._perform_comparison(source_tables, target_tables, source_config['type'], target_config['type'])
            
            # Generate report
            self._generate_report(source_config, target_config)
            
        except Exception as e:
            print(f"❌ Schema comparison failed: {e}")
            self.results['error'] = str(e)
        
        finally:
            if self.spark:
                self.spark.stop()
            
            self.results['end_time'] = datetime.now()
            if self.results['start_time']:
                self.results['duration_seconds'] = (self.results['end_time'] - self.results['start_time']).total_seconds()
        
        return self.results
    
    def _organize_schema_data(self, schema_data, db_type):
        """Organize schema data into structured format"""
        tables = {}
        
        for row in schema_data:
            # Handle different column name cases based on database type
            if db_type.lower() == 'sqlserver':
                table_name = row.TABLE_NAME.lower() if hasattr(row, 'TABLE_NAME') else None
                column_name = row.COLUMN_NAME.lower() if hasattr(row, 'COLUMN_NAME') else None
            else:
                table_name = row.table_name.lower() if hasattr(row, 'table_name') else None
                column_name = row.column_name.lower() if hasattr(row, 'column_name') else None
            
            if not table_name:
                continue
                
            if table_name not in tables:
                tables[table_name] = {"columns": {}}
            
            if column_name:
                # Normalize column information based on database type
                if db_type.lower() == 'sqlserver':
                    tables[table_name]["columns"][column_name] = {
                        "data_type": self._normalize_sqlserver_datatype(row),
                        "is_nullable": row.IS_NULLABLE,
                        "column_default": row.COLUMN_DEFAULT,
                        "ordinal_position": row.ORDINAL_POSITION,
                        "is_primary_key": row.IS_PRIMARY_KEY
                    }
                else:
                    tables[table_name]["columns"][column_name] = {
                        "data_type": self._normalize_postgresql_datatype(row),
                        "is_nullable": row.is_nullable,
                        "column_default": row.column_default,
                        "ordinal_position": row.ordinal_position,
                        "is_primary_key": row.is_primary_key
                    }
        
        return tables
    
    def _normalize_sqlserver_datatype(self, row):
        """Normalize SQL Server data types"""
        data_type = row.DATA_TYPE.lower()
        
        if data_type in ['varchar', 'nvarchar', 'char', 'nchar']:
            if row.CHARACTER_MAXIMUM_LENGTH == -1:
                return f"{data_type}(MAX)"
            elif row.CHARACTER_MAXIMUM_LENGTH:
                return f"{data_type}({row.CHARACTER_MAXIMUM_LENGTH})"
        elif data_type in ['decimal', 'numeric']:
            if row.NUMERIC_PRECISION and row.NUMERIC_SCALE is not None:
                return f"{data_type}({row.NUMERIC_PRECISION},{row.NUMERIC_SCALE})"
            elif row.NUMERIC_PRECISION:
                return f"{data_type}({row.NUMERIC_PRECISION})"
        elif data_type == 'float' and row.NUMERIC_PRECISION:
            return f"{data_type}({row.NUMERIC_PRECISION})"
        
        return data_type
    
    def _normalize_postgresql_datatype(self, row):
        """Normalize PostgreSQL data types"""
        data_type = row.data_type.lower()
        
        if data_type in ['character varying', 'varchar']:
            if row.character_maximum_length:
                return f"varchar({row.character_maximum_length})"
        elif data_type == 'character':
            if row.character_maximum_length:
                return f"char({row.character_maximum_length})"
        elif data_type in ['numeric', 'decimal']:
            if row.numeric_precision and row.numeric_scale is not None:
                return f"numeric({row.numeric_precision},{row.numeric_scale})"
            elif row.numeric_precision:
                return f"numeric({row.numeric_precision})"
        elif data_type == 'double precision':
            return 'float8'
        elif data_type == 'real':
            return 'float4'
        
        return data_type
    
    def _apply_filters(self, tables, config):
        """Apply filtering based on configuration"""
        filtered_tables = {}
        
        for table_name, table_info in tables.items():
            # Skip system tables if configured
            if config.get('exclude_system_tables', True) and table_name.startswith('sys'):
                continue
            
            # Skip excluded tables
            exclude_tables = [t.lower() for t in config.get('exclude_tables', [])]
            if table_name in exclude_tables:
                continue
            
            # Include only specific tables if specified
            specific_tables = [t.lower() for t in config.get('specific_tables', [])]
            if specific_tables and table_name not in specific_tables:
                continue
            
            filtered_tables[table_name] = table_info
        
        return filtered_tables
    
    def _perform_comparison(self, source_tables, target_tables, source_type, target_type):
        """Perform the actual schema comparison"""
        stats = self.results['summary_stats']
        
        stats['source_tables'] = len(source_tables)
        stats['target_tables'] = len(target_tables)
        
        all_tables = set(source_tables.keys()) | set(target_tables.keys())
        tables_in_both = set(source_tables.keys()) & set(target_tables.keys())
        tables_only_in_source = set(source_tables.keys()) - set(target_tables.keys())
        tables_only_in_target = set(target_tables.keys()) - set(source_tables.keys())
        
        stats['tables_in_both'] = len(tables_in_both)
        stats['tables_only_in_source'] = len(tables_only_in_source)
        stats['tables_only_in_target'] = len(tables_only_in_target)
        
        # Compare tables
        for table in sorted(all_tables):
            if table in tables_only_in_source:
                self.results['comparison_results'].append({
                    "table_name": table,
                    "comparison_type": "TABLE_MISSING_IN_TARGET",
                    "column_name": "N/A",
                    "difference_type": "TABLE_NOT_EXISTS",
                    "source_info": "EXISTS",
                    "target_info": "MISSING",
                    "severity": "HIGH",
                    "description": f"Table '{table}' exists in {source_type} but not in {target_type}"
                })
                
            elif table in tables_only_in_target:
                self.results['comparison_results'].append({
                    "table_name": table,
                    "comparison_type": "TABLE_MISSING_IN_SOURCE",
                    "column_name": "N/A",
                    "difference_type": "TABLE_NOT_EXISTS",
                    "source_info": "MISSING",
                    "target_info": "EXISTS",
                    "severity": "HIGH",
                    "description": f"Table '{table}' exists in {target_type} but not in {source_type}"
                })
                
            else:
                # Compare columns for tables that exist in both
                self._compare_table_columns(table, source_tables[table], target_tables[table])
    
    def _compare_table_columns(self, table_name, source_table, target_table):
        """Compare columns between two tables"""
        source_cols = set(source_table["columns"].keys())
        target_cols = set(target_table["columns"].keys())
        
        columns_in_both = source_cols & target_cols
        columns_only_in_source = source_cols - target_cols
        columns_only_in_target = target_cols - source_cols
        
        table_has_differences = False
        
        # Check for missing columns
        for col in columns_only_in_source:
            table_has_differences = True
            self.results['summary_stats']['total_column_differences'] += 1
            col_info = source_table["columns"][col]
            self.results['comparison_results'].append({
                "table_name": table_name,
                "comparison_type": "COLUMN_COMPARISON",
                "column_name": col,
                "difference_type": "COLUMN_MISSING_IN_TARGET",
                "source_info": f"Type: {col_info['data_type']}, Nullable: {col_info['is_nullable']}",
                "target_info": "MISSING",
                "severity": "HIGH",
                "description": f"Column exists in source but missing in target"
            })
        
        for col in columns_only_in_target:
            table_has_differences = True
            self.results['summary_stats']['total_column_differences'] += 1
            col_info = target_table["columns"][col]
            self.results['comparison_results'].append({
                "table_name": table_name,
                "comparison_type": "COLUMN_COMPARISON",
                "column_name": col,
                "difference_type": "COLUMN_MISSING_IN_SOURCE",
                "source_info": "MISSING",
                "target_info": f"Type: {col_info['data_type']}, Nullable: {col_info['is_nullable']}",
                "severity": "HIGH",
                "description": f"Column exists in target but missing in source"
            })
        
        # Check for differences in common columns
        for col in columns_in_both:
            source_col = source_table["columns"][col]
            target_col = target_table["columns"][col]
            
            # Check data type differences
            if source_col["data_type"] != target_col["data_type"]:
                table_has_differences = True
                self.results['summary_stats']['total_column_differences'] += 1
                self.results['comparison_results'].append({
                    "table_name": table_name,
                    "comparison_type": "COLUMN_COMPARISON",
                    "column_name": col,
                    "difference_type": "DATA_TYPE_MISMATCH",
                    "source_info": source_col["data_type"],
                    "target_info": target_col["data_type"],
                    "severity": "MEDIUM",
                    "description": f"Data type mismatch between databases"
                })
            
            # Check nullable differences
            if source_col["is_nullable"] != target_col["is_nullable"]:
                table_has_differences = True
                self.results['summary_stats']['total_column_differences'] += 1
                self.results['comparison_results'].append({
                    "table_name": table_name,
                    "comparison_type": "COLUMN_COMPARISON",
                    "column_name": col,
                    "difference_type": "NULLABLE_MISMATCH",
                    "source_info": source_col["is_nullable"],
                    "target_info": target_col["is_nullable"],
                    "severity": "LOW",
                    "description": f"Nullable constraint difference between databases"
                })
            
            # Check primary key differences
            if source_col["is_primary_key"] != target_col["is_primary_key"]:
                table_has_differences = True
                self.results['summary_stats']['total_column_differences'] += 1
                self.results['comparison_results'].append({
                    "table_name": table_name,
                    "comparison_type": "COLUMN_COMPARISON",
                    "column_name": col,
                    "difference_type": "PRIMARY_KEY_MISMATCH",
                    "source_info": source_col["is_primary_key"],
                    "target_info": target_col["is_primary_key"],
                    "severity": "HIGH",
                    "description": f"Primary key constraint difference between databases"
                })
        
        if table_has_differences:
            self.results['summary_stats']['tables_with_differences'] += 1
    
    def _generate_report(self, source_config, target_config):
        """Generate comparison report"""
        print(f"\n=== Schema Comparison Results ===")
        stats = self.results['summary_stats']
        
        print(f"Source ({source_config['type']}): {stats['source_tables']} tables")
        print(f"Target ({target_config['type']}): {stats['target_tables']} tables")
        print(f"Tables in both: {stats['tables_in_both']}")
        print(f"Tables only in source: {stats['tables_only_in_source']}")
        print(f"Tables only in target: {stats['tables_only_in_target']}")
        print(f"Tables with differences: {stats['tables_with_differences']}")
        print(f"Total differences found: {stats['total_column_differences']}")
        
        if stats['total_column_differences'] == 0:
            print("\n🎉 No schema differences found! Databases are in sync.")
        else:
            high_severity = len([r for r in self.results['comparison_results'] if r['severity'] == 'HIGH'])
            medium_severity = len([r for r in self.results['comparison_results'] if r['severity'] == 'MEDIUM'])
            low_severity = len([r for r in self.results['comparison_results'] if r['severity'] == 'LOW'])
            
            print(f"\n⚠️ Found {stats['total_column_differences']} schema differences:")
            print(f"   • {high_severity} High Severity")
            print(f"   • {medium_severity} Medium Severity")
            print(f"   • {low_severity} Low Severity")

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python schema_comparison.py <config_file.json>")
        sys.exit(1)
    
    config_file = sys.argv[1]
    
    if not os.path.exists(config_file):
        print(f"Configuration file not found: {config_file}")
        sys.exit(1)
    
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        comparator = DatabaseSchemaComparator()
        results = comparator.compare_schemas(
            config['source_database'],
            config['target_database'],
            config.get('comparison_options', {})
        )
        
        # Save results
        output_file = f"schema_comparison_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nResults saved to: {output_file}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
