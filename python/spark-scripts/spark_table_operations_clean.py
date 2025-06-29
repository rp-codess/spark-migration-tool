"""
Spark Table Operations Wrapper
Provides clean output for table operations by suppressing Java warnings.
"""

import sys
import os
import json
import subprocess
from pathlib import Path


def run_spark_table_operations(db_config, operation="list_tables"):
    """
    Run Spark table operations with clean output (suppressed warnings).
    
    Args:
        db_config: Database configuration dictionary
        operation: Type of operation to perform
        
    Returns:
        dict: Operation result
    """
    script_dir = Path(__file__).parent
    script_path = script_dir / "spark_table_operations.py"
    
    # Prepare command
    cmd = [
        sys.executable, 
        str(script_path), 
        json.dumps(db_config),
        operation
    ]
    
    try:
        # Run with stderr suppressed to hide Java warnings
        if os.name == 'nt':  # Windows
            # On Windows, use subprocess.DEVNULL to suppress stderr
            result = subprocess.run(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.DEVNULL,
                text=True
            )
        else:
            # On Unix-like systems
            result = subprocess.run(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.DEVNULL,
                text=True
            )
        
        # Parse the JSON output
        if result.stdout.strip():
            return json.loads(result.stdout.strip())
        else:
            return {
                "success": False,
                "error": "No output received from table operations script"
            }
            
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Table operation timed out"
        }
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Invalid JSON response: {e}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Wrapper execution failed: {str(e)}"
        }


def main():
    """Main function for command-line usage."""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python spark_table_operations_clean.py <db_config_json> [operation]"
        }))
        sys.exit(1)
    
    try:
        # Parse arguments
        db_config = json.loads(sys.argv[1])
        operation = sys.argv[2] if len(sys.argv) > 2 else "list_tables"
        
        # Run operation
        result = run_spark_table_operations(db_config, operation)
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
