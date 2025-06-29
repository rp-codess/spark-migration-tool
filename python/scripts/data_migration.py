"""
Enhanced Data Migration Tool
Performs data migration between different database systems using PySpark
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
    from pyspark.sql.functions import col, lit, current_timestamp, md5, concat_ws
    from pyspark.sql.types import StructType, StructField, StringType, IntegerType, LongType
    
except ImportError as e:
    print(f"Failed to import required modules: {e}")
    print("Please ensure all runtime components are properly installed.")
    sys.exit(1)

class DataMigrationTool:
    def __init__(self, config=None):
        self.config = config or {}
        self.spark = None
        self.runtime = get_runtime_manager()
        self.migration_results = {
            'tables_migrated': 0,
            'total_rows_migrated': 0,
            'failed_tables': [],
            'successful_tables': [],
            'start_time': None,
            'end_time': None,
            'duration_seconds': 0,
            'migration_log': []
        }
    
    def initialize_spark(self):
        """Initialize Spark session with optimized settings for data migration"""
        try:
            # Get JDBC drivers
            driver_jars = self.runtime.get_driver_jars()
            jar_paths = ','.join(str(jar) for jar in driver_jars)
            
            self.spark = SparkSession.builder \
                .appName("Data Migration Tool") \
                .config("spark.jars", jar_paths) \
                .config("spark.driver.extraClassPath", jar_paths) \
                .config("spark.executor.extraClassPath", jar_paths) \
                .config("spark.sql.adaptive.enabled", "true") \
                .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
                .config("spark.sql.adaptive.skewJoin.enabled", "true") \
                .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
                .config("spark.driver.memory", "4g") \
                .config("spark.driver.maxResultSize", "2g") \
                .config("spark.sql.shuffle.partitions", "200") \
                .config("spark.local.dir", "C:/temp/spark-local") \
                .config("spark.sql.warehouse.dir", "C:/temp/spark-warehouse") \
                .config("spark.driver.bindAddress", "localhost") \
                .config("spark.driver.host", "localhost") \
                .config("spark.eventLog.enabled", "false") \
                .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
                .getOrCreate()
            
            print("✅ Spark session initialized for data migration")
            return True
            
        except Exception as e:
            print(f"❌ Failed to initialize Spark: {e}")
            return False
    
    def test_connections(self, source_config, target_config):
        """Test both source and target database connections"""
        print("=== Testing Database Connections ===")
        
        # Test source connection
        try:
            source_test_query = self._get_test_query(source_config['type'])
            source_df = self.spark.read.jdbc(
                url=source_config['jdbc_url'],
                table=source_test_query,
                properties=source_config['properties']
            )
            source_result = source_df.collect()[0]
            print(f"✅ Source {source_config['type']} connection successful")
            
        except Exception as e:
            print(f"❌ Source database connection failed: {e}")
            return False
        
        # Test target connection
        try:
            target_test_query = self._get_test_query(target_config['type'])
            target_df = self.spark.read.jdbc(
                url=target_config['jdbc_url'],
                table=target_test_query,
                properties=target_config['properties']
            )
            target_result = target_df.collect()[0]
            print(f"✅ Target {target_config['type']} connection successful")
            
        except Exception as e:
            print(f"❌ Target database connection failed: {e}")
            return False
        
        return True
    
    def _get_test_query(self, db_type):
        """Get appropriate test query for database type"""
        queries = {
            'sqlserver': "(SELECT @@VERSION as version, DB_NAME() as database_name) AS test",
            'postgresql': "(SELECT current_database() as db_name, version() as pg_version) AS test",
            'mysql': "(SELECT DATABASE() as db_name, VERSION() as version) AS test",
            'oracle': "(SELECT SYS_CONTEXT('USERENV', 'DB_NAME') as db_name, BANNER as version FROM V$VERSION WHERE ROWNUM = 1) AS test"
        }
        return queries.get(db_type, "(SELECT 1 as test_value) AS test")
    
    def get_table_list(self, db_config, filters=None):
        """Get list of tables to migrate"""
        db_type = db_config['type'].lower()
        
        if db_type == 'sqlserver':
            query = """
            (SELECT TABLE_NAME 
             FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_TYPE = 'BASE TABLE' 
             AND TABLE_SCHEMA = 'dbo') AS tables
            """
        elif db_type == 'postgresql':
            query = """
            (SELECT table_name 
             FROM information_schema.tables 
             WHERE table_type = 'BASE TABLE' 
             AND table_schema = 'public') AS tables
            """
        elif db_type == 'mysql':
            schema = db_config.get('database', '')
            query = f"""
            (SELECT TABLE_NAME 
             FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_TYPE = 'BASE TABLE' 
             AND TABLE_SCHEMA = '{schema}') AS tables
            """
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
        
        try:
            df = self.spark.read.jdbc(
                url=db_config['jdbc_url'],
                table=query,
                properties=db_config['properties']
            )
            
            tables = [row[0] for row in df.collect()]
            
            # Apply filters if provided
            if filters:
                exclude_tables = [t.lower() for t in filters.get('exclude_tables', [])]
                include_tables = [t.lower() for t in filters.get('include_tables', [])]
                
                filtered_tables = []
                for table in tables:
                    table_lower = table.lower()
                    
                    # Skip excluded tables
                    if table_lower in exclude_tables:
                        continue
                    
                    # If include list is specified, only include those tables
                    if include_tables and table_lower not in include_tables:
                        continue
                    
                    # Skip system tables if configured
                    if filters.get('exclude_system_tables', True) and table_lower.startswith('sys'):
                        continue
                    
                    filtered_tables.append(table)
                
                return filtered_tables
            
            return tables
            
        except Exception as e:
            print(f"❌ Failed to get table list: {e}")
            return []
    
    def get_table_row_count(self, db_config, table_name):
        """Get row count for a table"""
        try:
            df = self.spark.read.jdbc(
                url=db_config['jdbc_url'],
                table=table_name,
                properties=db_config['properties']
            )
            return df.count()
        except Exception as e:
            print(f"Warning: Could not get row count for {table_name}: {e}")
            return 0
    
    def migrate_table(self, source_config, target_config, table_name, migration_options=None):
        """Migrate a single table from source to target"""
        options = migration_options or {}
        
        try:
            print(f"\n--- Migrating table: {table_name} ---")
            
            # Get source row count
            source_count = self.get_table_row_count(source_config, table_name)
            print(f"Source table row count: {source_count:,}")
            
            if source_count == 0:
                print("⚠️ Source table is empty, skipping migration")
                return {'success': True, 'rows_migrated': 0, 'message': 'Table is empty'}
            
            # Read from source with optimizations
            read_options = {
                'numPartitions': options.get('read_partitions', min(10, max(1, source_count // 100000))),
                'fetchsize': options.get('fetch_size', 10000)
            }
            
            # Add partitioning if specified
            if options.get('partition_column'):
                read_options['partitionColumn'] = options['partition_column']
                read_options['lowerBound'] = options.get('lower_bound', 1)
                read_options['upperBound'] = options.get('upper_bound', source_count)
            
            print(f"Reading data with options: {read_options}")
            
            source_df = self.spark.read.jdbc(
                url=source_config['jdbc_url'],
                table=table_name,
                properties={**source_config['properties'], **read_options}
            )
            
            # Apply transformations if specified
            if options.get('transformations'):
                source_df = self._apply_transformations(source_df, options['transformations'])
            
            # Add migration metadata if requested
            if options.get('add_migration_metadata', False):
                source_df = source_df.withColumn('migration_timestamp', current_timestamp())
                source_df = source_df.withColumn('migration_batch_id', lit(datetime.now().strftime('%Y%m%d_%H%M%S')))
            
            # Write to target with optimizations
            write_mode = options.get('write_mode', 'overwrite')  # overwrite, append, ignore
            batch_size = options.get('batch_size', 10000)
            
            print(f"Writing data in {write_mode} mode with batch size: {batch_size}")
            
            source_df.write \
                .mode(write_mode) \
                .option('batchsize', batch_size) \
                .option('truncate', 'true' if write_mode == 'overwrite' else 'false') \
                .jdbc(
                    url=target_config['jdbc_url'],
                    table=table_name,
                    properties=target_config['properties']
                )
            
            # Verify migration
            target_count = self.get_table_row_count(target_config, table_name)
            print(f"Target table row count: {target_count:,}")
            
            if target_count == source_count:
                print(f"✅ Migration successful: {target_count:,} rows")
                return {'success': True, 'rows_migrated': target_count, 'message': 'Migration completed successfully'}
            else:
                print(f"⚠️ Row count mismatch: Source={source_count:,}, Target={target_count:,}")
                return {'success': False, 'rows_migrated': target_count, 'message': f'Row count mismatch: {source_count} -> {target_count}'}
            
        except Exception as e:
            error_msg = f"Migration failed for {table_name}: {str(e)}"
            print(f"❌ {error_msg}")
            return {'success': False, 'rows_migrated': 0, 'message': error_msg}
    
    def _apply_transformations(self, df, transformations):
        """Apply data transformations during migration"""
        for transform in transformations:
            transform_type = transform.get('type')
            
            if transform_type == 'rename_column':
                df = df.withColumnRenamed(transform['old_name'], transform['new_name'])
                
            elif transform_type == 'add_column':
                df = df.withColumn(transform['column_name'], lit(transform['value']))
                
            elif transform_type == 'drop_column':
                df = df.drop(transform['column_name'])
                
            elif transform_type == 'cast_column':
                df = df.withColumn(transform['column_name'], 
                                 col(transform['column_name']).cast(transform['data_type']))
                
            elif transform_type == 'filter_rows':
                df = df.filter(transform['condition'])
                
            elif transform_type == 'add_row_hash':
                # Add a hash column for data integrity verification
                hash_columns = transform.get('columns', df.columns)
                df = df.withColumn('row_hash', md5(concat_ws('|', *hash_columns)))
        
        return df
    
    def migrate_data(self, source_config, target_config, migration_config=None):
        """Perform complete data migration"""
        self.migration_results['start_time'] = datetime.now()
        
        if not self.initialize_spark():
            return self.migration_results
        
        try:
            print("=== Data Migration Tool ===")
            print(f"Started at: {self.migration_results['start_time']}")
            
            # Test connections
            if not self.test_connections(source_config, target_config):
                raise Exception("Database connection test failed")
            
            # Get tables to migrate
            tables = self.get_table_list(source_config, migration_config.get('table_filters'))
            print(f"\nTables to migrate: {len(tables)}")
            for table in tables:
                print(f"  • {table}")
            
            if not tables:
                print("⚠️ No tables found to migrate")
                return self.migration_results
            
            # Migrate each table
            print(f"\n=== Starting Migration of {len(tables)} Tables ===")
            
            for i, table in enumerate(tables, 1):
                print(f"\n[{i}/{len(tables)}] Processing: {table}")
                
                result = self.migrate_table(
                    source_config, 
                    target_config, 
                    table, 
                    migration_config.get('migration_options', {})
                )
                
                # Log results
                log_entry = {
                    'table_name': table,
                    'timestamp': datetime.now().isoformat(),
                    'success': result['success'],
                    'rows_migrated': result['rows_migrated'],
                    'message': result['message']
                }
                
                self.migration_results['migration_log'].append(log_entry)
                
                if result['success']:
                    self.migration_results['successful_tables'].append(table)
                    self.migration_results['total_rows_migrated'] += result['rows_migrated']
                else:
                    self.migration_results['failed_tables'].append({
                        'table': table,
                        'error': result['message']
                    })
                
                self.migration_results['tables_migrated'] = len(self.migration_results['successful_tables'])
            
            # Generate final report
            self._generate_migration_report()
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            self.migration_results['error'] = str(e)
        
        finally:
            if self.spark:
                self.spark.stop()
            
            self.migration_results['end_time'] = datetime.now()
            if self.migration_results['start_time']:
                duration = self.migration_results['end_time'] - self.migration_results['start_time']
                self.migration_results['duration_seconds'] = duration.total_seconds()
        
        return self.migration_results
    
    def _generate_migration_report(self):
        """Generate migration summary report"""
        print(f"\n=== Migration Summary Report ===")
        
        results = self.migration_results
        success_rate = (results['tables_migrated'] / (results['tables_migrated'] + len(results['failed_tables']))) * 100 if (results['tables_migrated'] + len(results['failed_tables'])) > 0 else 0
        
        print(f"📊 Migration Statistics:")
        print(f"   • Total tables processed: {results['tables_migrated'] + len(results['failed_tables'])}")
        print(f"   • Successfully migrated: {results['tables_migrated']}")
        print(f"   • Failed migrations: {len(results['failed_tables'])}")
        print(f"   • Success rate: {success_rate:.1f}%")
        print(f"   • Total rows migrated: {results['total_rows_migrated']:,}")
        
        if results['failed_tables']:
            print(f"\n❌ Failed Tables:")
            for failed in results['failed_tables']:
                print(f"   • {failed['table']}: {failed['error']}")
        
        if results['successful_tables']:
            print(f"\n✅ Successfully Migrated Tables:")
            for table in results['successful_tables']:
                print(f"   • {table}")

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python data_migration.py <config_file.json>")
        sys.exit(1)
    
    config_file = sys.argv[1]
    
    if not os.path.exists(config_file):
        print(f"Configuration file not found: {config_file}")
        sys.exit(1)
    
    try:
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        migrator = DataMigrationTool()
        results = migrator.migrate_data(
            config['source_database'],
            config['target_database'],
            config.get('migration_config', {})
        )
        
        # Save results
        output_file = f"migration_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\nDetailed results saved to: {output_file}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
