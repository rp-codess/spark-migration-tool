"""
Windows Cleanup Test Script
Tests Spark environment setup and cleanup on Windows.
"""

import sys
import os
import json
import time
from pathlib import Path

# Add spark-scripts to path
sys.path.insert(0, os.path.dirname(__file__))
from spark_environment import setup_spark_environment


def test_spark_setup_and_cleanup():
    """Test Spark environment setup and cleanup multiple times."""
    print("Testing Spark environment setup and cleanup on Windows...")
    
    for i in range(3):
        print(f"\nTest iteration {i + 1}/3:")
        
        spark_env = None
        try:
            # Setup environment
            print("  Setting up Spark environment...")
            spark_env = setup_spark_environment(log_level="ERROR")
            
            # Create Spark session
            print("  Creating Spark session...")
            session_name = f"WindowsTest_{i + 1}_{int(time.time())}"
            spark = spark_env.get_spark_session(session_name)
            
            # Simple operation
            print("  Testing basic Spark operation...")
            df = spark.range(1, 5).toDF("number")
            count = df.count()
            print(f"    Simple operation result: {count} rows")
            
            # Test temp directory
            print("  Checking temp directory...")
            if spark_env._session_temp_dir:
                print(f"    Session temp dir: {spark_env._session_temp_dir}")
                print(f"    Temp dir exists: {spark_env._session_temp_dir.exists()}")
            
            print("  ✅ Test iteration successful")
            
        except Exception as e:
            print(f"  ❌ Test iteration failed: {e}")
            
        finally:
            if spark_env:
                print("  Cleaning up Spark session...")
                try:
                    spark_env.stop_spark_session()
                    print("  ✅ Cleanup completed")
                except Exception as cleanup_error:
                    print(f"  ⚠️ Cleanup warning: {cleanup_error}")
        
        # Small delay between iterations
        time.sleep(1)
    
    print("\n🎉 Windows cleanup test completed!")


def test_fake_db_connection():
    """Test table operations with a fake database config (expected to fail gracefully)."""
    print("\nTesting table operations with fake database config...")
    
    fake_config = {
        "type": "postgresql",
        "host": "fake-host.example.com",
        "port": 5432,
        "database": "fake_database",
        "username": "fake_user",
        "password": "fake_password"
    }
    
    # Import table operations
    from spark_table_operations import get_tables_list
    
    try:
        result = get_tables_list(fake_config, "list_tables")
        
        if result.get("success"):
            if result.get("warning"):
                print(f"  ⚠️ Operation completed with warning: {result['warning']}")
            else:
                print("  ✅ Unexpected success (fake DB should fail)")
        else:
            print(f"  ✅ Expected failure: {result.get('error', 'Unknown error')}")
        
    except Exception as e:
        print(f"  ❌ Unexpected exception: {e}")


if __name__ == "__main__":
    try:
        test_spark_setup_and_cleanup()
        test_fake_db_connection()
        
        print("\n🎉 All tests completed!")
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        sys.exit(1)
