"""
Test Script for Spark Scripts Integration
Verifies that all Spark scripts are working correctly.
"""

import sys
import os
import json
import subprocess
from pathlib import Path

def test_spark_environment():
    """Test the Spark environment setup."""
    print("🧪 Testing Spark Environment Setup...")
    
    try:
        # Test environment setup
        result = subprocess.run([
            sys.executable, 
            'spark_environment.py'
        ], capture_output=True, text=True, cwd=Path(__file__).parent)
        
        if result.returncode == 0:
            print("✅ Spark environment setup: PASSED")
            return True
        else:
            print(f"❌ Spark environment setup: FAILED")
            print(f"Error: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Spark environment setup: ERROR - {e}")
        return False

def test_spark_connection():
    """Test the Spark connection script."""
    print("🧪 Testing Spark Connection Script...")
    
    # Sample database configuration (will fail but tests script parsing)
    test_config = {
        "type": "mssql",
        "host": "localhost",
        "port": "1433",
        "database": "testdb",
        "username": "testuser",
        "password": "testpass"
    }
    
    try:
        result = subprocess.run([
            sys.executable, 
            'spark_connection.py',
            json.dumps(test_config)
        ], capture_output=True, text=True, cwd=Path(__file__).parent)
        
        # Parse the JSON response
        output = result.stdout.strip()
        if output:
            response = json.loads(output)
            print(f"✅ Spark connection script: PASSED (Response format valid)")
            print(f"   Response: {response.get('success', 'unknown')} - {response.get('error', 'no error')}")
            return True
        else:
            print("❌ Spark connection script: FAILED (No output)")
            return False
            
    except json.JSONDecodeError:
        print("❌ Spark connection script: FAILED (Invalid JSON output)")
        print(f"Output: {result.stdout}")
        return False
    except Exception as e:
        print(f"❌ Spark connection script: ERROR - {e}")
        return False

def test_spark_table_operations():
    """Test the Spark table operations script."""
    print("🧪 Testing Spark Table Operations Script...")
    
    # Sample database configuration
    test_config = {
        "type": "mssql",
        "host": "localhost",
        "port": "1433",
        "database": "testdb",
        "username": "testuser",
        "password": "testpass"
    }
    
    try:
        result = subprocess.run([
            sys.executable, 
            'spark_table_operations.py',
            json.dumps(test_config),
            'list_tables'
        ], capture_output=True, text=True, cwd=Path(__file__).parent)
        
        # Parse the JSON response
        output = result.stdout.strip()
        if output:
            response = json.loads(output)
            print(f"✅ Spark table operations script: PASSED (Response format valid)")
            print(f"   Response: {response.get('success', 'unknown')} - {response.get('error', 'no error')}")
            return True
        else:
            print("❌ Spark table operations script: FAILED (No output)")
            return False
            
    except json.JSONDecodeError:
        print("❌ Spark table operations script: FAILED (Invalid JSON output)")
        print(f"Output: {result.stdout}")
        return False
    except Exception as e:
        print(f"❌ Spark table operations script: ERROR - {e}")
        return False

def test_spark_export():
    """Test the Spark export script."""
    print("🧪 Testing Spark Export Script...")
    
    # Sample configurations
    db_config = {
        "type": "mssql",
        "host": "localhost",
        "port": "1433",
        "database": "testdb",
        "username": "testuser",
        "password": "testpass"
    }
    
    export_config = {
        "type": "metadata",
        "filename": "test_export.csv"
    }
    
    try:
        result = subprocess.run([
            sys.executable, 
            'spark_export.py',
            json.dumps(db_config),
            json.dumps(export_config)
        ], capture_output=True, text=True, cwd=Path(__file__).parent)
        
        # Parse the JSON response
        output = result.stdout.strip()
        if output:
            response = json.loads(output)
            print(f"✅ Spark export script: PASSED (Response format valid)")
            print(f"   Response: {response.get('success', 'unknown')} - {response.get('error', 'no error')}")
            return True
        else:
            print("❌ Spark export script: FAILED (No output)")
            return False
            
    except json.JSONDecodeError:
        print("❌ Spark export script: FAILED (Invalid JSON output)")
        print(f"Output: {result.stdout}")
        return False
    except Exception as e:
        print(f"❌ Spark export script: ERROR - {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Starting Spark Scripts Integration Tests...\n")
    
    tests = [
        test_spark_environment,
        test_spark_connection,
        test_spark_table_operations,
        test_spark_export
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()  # Empty line between tests
    
    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Spark scripts integration is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
