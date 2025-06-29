"""
Simple Spark Configuration Test
Tests if Spark can initialize properly with correct Windows paths
"""

import os
import sys
from pathlib import Path

# Add runtime manager to path
sys.path.insert(0, str(Path(__file__).parent / "bundled-runtime" / "scripts"))

try:
    from runtime_manager import get_runtime_manager
    
    # Initialize runtime
    runtime = get_runtime_manager()
    runtime.setup_environment()
    
    print("Environment variables set:")
    for key in ['HADOOP_HOME', 'SPARK_LOCAL_DIRS', 'TMPDIR', 'TMP', 'TEMP']:
        print(f"  {key}={os.environ.get(key, 'NOT SET')}")
    
    # Now import Spark components
    import findspark
    findspark.init(runtime.get_spark_home())
    
    from pyspark.sql import SparkSession
    
    print("\n🔄 Creating Spark session with Windows-optimized configuration...")
    
    spark = SparkSession.builder \
        .appName("Spark Configuration Test") \
        .config("spark.local.dir", "C:/temp/spark-local") \
        .config("spark.sql.warehouse.dir", "C:/temp/spark-warehouse") \
        .config("spark.driver.bindAddress", "localhost") \
        .config("spark.driver.host", "localhost") \
        .config("spark.eventLog.enabled", "false") \
        .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
        .config("spark.sql.adaptive.enabled", "true") \
        .getOrCreate()
    
    print("✅ Spark session created successfully!")
    
    # Test basic SQL operation
    print("\n🔄 Testing basic SQL operations...")
    df = spark.sql("SELECT 1 as test_column")
    result = df.collect()
    print(f"✅ SQL test successful: {result[0]['test_column']}")
    
    # Show tables (this was the failing operation)
    print("\n🔄 Testing SHOW TABLES command...")
    tables_df = spark.sql("SHOW TABLES")
    tables = tables_df.collect()
    print(f"✅ SHOW TABLES successful: Found {len(tables)} tables")
    
    spark.stop()
    print("\n✅ All tests passed! Spark configuration is working correctly.")
    
except Exception as e:
    print(f"\n❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
