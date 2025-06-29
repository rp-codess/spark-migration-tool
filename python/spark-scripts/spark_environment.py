"""
Spark Environment Setup Utility
Provides centralized environment configuration for all Spark scripts in the Migration Tool.
"""

import sys
import os
import json
from pathlib import Path
import glob
import time
import shutil


class SparkEnvironment:
    """Manages Spark environment setup and configuration for the Migration Tool."""
    
    def __init__(self, log_level="WARN"):
        self.log_level = log_level
        self.bundle_root = self._get_bundle_root()
        self.spark_home = None
        self.java_home = None
        self.drivers_path = None
        self.python_home = None
        self.spark_session = None
        self._session_temp_dir = None
        
    def _get_bundle_root(self):
        """Get the bundled runtime root directory."""
        script_dir = Path(__file__).parent
        return script_dir.parent.parent / "bundled-runtime"
    
    def setup_environment(self):
        """Setup all required environment variables and paths."""
        # Set up component paths
        self.spark_home = self.bundle_root / "spark"
        self.java_home = self._find_java_home()
        self.drivers_path = self.bundle_root / "drivers"
        self.python_home = self.bundle_root / "python"
        
        # Add bundled Python site-packages to path
        python_site_packages = self.python_home / "Lib" / "site-packages"
        if str(python_site_packages) not in sys.path:
            sys.path.insert(0, str(python_site_packages))
        
        # Set environment variables
        os.environ["SPARK_HOME"] = str(self.spark_home)
        os.environ["JAVA_HOME"] = str(self.java_home)
        os.environ["PYTHONPATH"] = os.pathsep.join([
            str(self.spark_home / "python"),
            str(self.spark_home / "python" / "lib" / "pyspark.zip"),
            str(python_site_packages)
        ])
        
        # Set Hadoop home to avoid warnings
        os.environ["HADOOP_HOME"] = str(self.spark_home)
        os.environ["HADOOP_CONF_DIR"] = str(self.spark_home / "conf")
        
        # Add Hadoop bin to PATH for Windows
        hadoop_bin = self.spark_home / "bin"
        current_path = os.environ.get("PATH", "")
        if str(hadoop_bin) not in current_path:
            os.environ["PATH"] = str(hadoop_bin) + os.pathsep + current_path
    
    def _cleanup_old_temp_dirs(self, temp_base):
        """Clean up old Spark temporary directories."""
        try:
            import time
            current_time = time.time()
            # Remove directories older than 1 hour
            for item in temp_base.glob("session_*"):
                if item.is_dir():
                    try:
                        # Check if directory is old enough to clean up
                        dir_time = item.stat().st_mtime
                        if current_time - dir_time > 3600:  # 1 hour
                            shutil.rmtree(item, ignore_errors=True)
                    except Exception:
                        # If we can't check or remove, skip it
                        continue
        except Exception:
            # Ignore all cleanup errors
            pass

    def _find_java_home(self):
        """Find Java installation in bundled runtime."""
        java_dir = self.bundle_root / "java"
        java_subdirs = list(java_dir.glob("*"))
        if java_subdirs:
            return java_subdirs[0]
        else:
            raise RuntimeError("Java not found in bundled runtime")
    
    def get_jdbc_drivers(self):
        """Get all available JDBC drivers."""
        drivers = {}
        if self.drivers_path.exists():
            for jar_file in self.drivers_path.glob("*.jar"):
                if "mssql-jdbc" in jar_file.name:
                    drivers["sqlserver"] = str(jar_file)
                elif "mysql-connector" in jar_file.name:
                    drivers["mysql"] = str(jar_file)
                elif "postgresql" in jar_file.name:
                    drivers["postgresql"] = str(jar_file)
                elif "ojdbc" in jar_file.name:
                    drivers["oracle"] = str(jar_file)
        return drivers
    
    def get_spark_config(self, app_name="SparkMigrationTool", additional_config=None):
        """Get optimized Spark configuration for the Migration Tool."""
        from pyspark import SparkConf
        
        # Get JDBC drivers
        jdbc_drivers = self.get_jdbc_drivers()
        all_jars = ",".join(jdbc_drivers.values())
        
        conf = SparkConf()
        conf.setAppName(app_name)
        conf.setMaster("local[*]")
        
        # JDBC drivers
        if all_jars:
            conf.set("spark.jars", all_jars)
        
        # Memory and performance settings
        conf.set("spark.driver.memory", "1g")
        conf.set("spark.executor.memory", "1g")
        conf.set("spark.sql.adaptive.enabled", "true")
        conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
        
        # Windows-specific configurations
        conf.set("spark.driver.host", "localhost")
        conf.set("spark.driver.bindAddress", "localhost")
        
        # Combine Java options for better Windows compatibility and cleanup suppression
        driver_java_opts = [
            "-Djava.net.preferIPv4Stack=true",
            "-Dlog4j.logger.org.apache.spark.util.ShutdownHookManager=OFF",
            "-Dlog4j.logger.org.apache.spark.network.util.JavaUtils=OFF"
        ]
        executor_java_opts = [
            "-Djava.net.preferIPv4Stack=true",
            "-Dlog4j.logger.org.apache.spark.util.ShutdownHookManager=OFF"
        ]
        
        conf.set("spark.driver.extraJavaOptions", " ".join(driver_java_opts))
        conf.set("spark.executor.extraJavaOptions", " ".join(executor_java_opts))
        
        # Disable UI to avoid port conflicts
        conf.set("spark.ui.enabled", "false")
        
        # Windows-specific cleanup and temp directory settings
        conf.set("spark.cleaner.referenceTracking.blocking", "false")
        conf.set("spark.cleaner.referenceTracking.blocking.shuffle", "false")
        conf.set("spark.cleaner.periodicGC.interval", "1h")
        
        # Disable problematic cleanup for Windows
        conf.set("spark.worker.cleanup.enabled", "false")
        conf.set("spark.shuffle.service.enabled", "false")
        conf.set("spark.serializer.objectStreamReset", "100")
        
        # More aggressive Windows temp directory settings
        temp_dir = self.bundle_root / "temp" / "spark"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        # Clean up old temp directories before starting
        self._cleanup_old_temp_dirs(temp_dir)
        
        # Use forward slashes and create unique temp subdirectory
        import time
        import random
        session_id = f"session_{int(time.time())}_{random.randint(1000, 9999)}"
        session_temp = temp_dir / session_id
        session_temp.mkdir(parents=True, exist_ok=True)
        
        base_temp = str(session_temp).replace("\\", "/")
        conf.set("spark.local.dir", base_temp)
        conf.set("spark.sql.warehouse.dir", f"{base_temp}/warehouse")
        
        # Store session temp for cleanup
        self._session_temp_dir = session_temp
        
        # Additional Windows compatibility settings
        conf.set("spark.sql.streaming.checkpointLocation", f"{base_temp}/checkpoints")
        conf.set("spark.eventLog.enabled", "false")  # Disable event logging to avoid file conflicts
        conf.set("spark.history.fs.logDirectory", f"{base_temp}/history")
        
        # Set shorter session timeout to prevent hanging processes
        conf.set("spark.sql.execution.arrow.maxRecordsPerBatch", "1000")
        conf.set("spark.network.timeout", "60s")
        conf.set("spark.executor.heartbeatInterval", "5s")
        
        # Disable Arrow for compatibility
        conf.set("spark.sql.execution.arrow.pyspark.enabled", "false")
        
        # Windows-specific file handling
        conf.set("spark.sql.files.ignoreCorruptFiles", "true")
        conf.set("spark.sql.adaptive.localShuffleReader.enabled", "false")
        conf.set("spark.io.compression.codec", "snappy")
        
        # Force immediate cleanup on session stop
        conf.set("spark.sql.streaming.forceDeleteTempCheckpointLocation", "true")
        
        # Disable Spark's aggressive shutdown cleanup that causes Windows issues
        conf.set("spark.cleaner.referenceTracking.cleanCheckpoints", "false")
        conf.set("spark.sql.streaming.stopGracefullyOnShutdown", "false")
        
        # Add any additional configuration
        if additional_config:
            for key, value in additional_config.items():
                conf.set(key, value)
        
        return conf
    
    def get_spark_session(self, app_name="SparkMigrationTool", additional_config=None):
        """Get a configured Spark session."""
        if self.spark_session is not None:
            return self.spark_session
        
        try:
            # Import PySpark
            from pyspark.sql import SparkSession
            
            # Get configuration
            conf = self.get_spark_config(app_name, additional_config)
            
            # Create session
            self.spark_session = SparkSession.builder.config(conf=conf).getOrCreate()
            self.spark_session.sparkContext.setLogLevel(self.log_level)
            
            return self.spark_session
            
        except ImportError as e:
            raise RuntimeError(f"PySpark import failed: {e}")
        except Exception as e:
            raise RuntimeError(f"Failed to create Spark session: {e}")
    
    def stop_spark_session(self):
        """Stop the current Spark session with proper cleanup."""
        if self.spark_session:
            try:
                # Stop Spark session gracefully
                self.spark_session.stop()
                
                # Additional cleanup for Windows
                import time
                time.sleep(2)  # Give Spark more time to cleanup
                
                # Force garbage collection
                import gc
                gc.collect()
                
                # Clean up session-specific temp directory
                if self._session_temp_dir and self._session_temp_dir.exists():
                    self._cleanup_session_temp()
                        
            except Exception as e:
                # Log the error but don't raise - cleanup should not fail the operation
                print(f"Warning: Spark session cleanup had issues: {e}", file=sys.stderr)
            finally:
                self.spark_session = None
                self._session_temp_dir = None

    def _cleanup_session_temp(self):
        """Clean up the current session's temp directory."""
        if not self._session_temp_dir:
            return
            
        try:
            # Wait a bit more for Windows file handles to be released
            import time
            time.sleep(1)
            
            # Try to remove files first, then directories
            for item in self._session_temp_dir.rglob("*"):
                if item.is_file():
                    try:
                        item.unlink(missing_ok=True)
                    except Exception:
                        pass
            
            # Then try to remove directories
            for item in sorted(self._session_temp_dir.rglob("*"), key=lambda p: len(str(p)), reverse=True):
                if item.is_dir():
                    try:
                        item.rmdir()
                    except Exception:
                        pass
            
            # Finally try to remove the session directory itself
            try:
                self._session_temp_dir.rmdir()
            except Exception:
                # If we can't remove it, just ignore - it will be cleaned up later
                pass
                
        except Exception:
            # Ignore all cleanup errors - they're not critical for functionality
            pass
    
    def get_jdbc_url(self, db_config):
        """Generate JDBC URL for database configuration."""
        db_type = db_config.get("type", "").lower()
        host = db_config.get("host")
        port = db_config.get("port")
        database = db_config.get("database")
        
        if db_type in ["mssql", "sqlserver"]:
            return f"jdbc:sqlserver://{host}:{port};databaseName={database};encrypt=true;trustServerCertificate=true"
        elif db_type == "postgresql":
            return f"jdbc:postgresql://{host}:{port}/{database}"
        elif db_type == "mysql":
            return f"jdbc:mysql://{host}:{port}/{database}"
        elif db_type == "oracle":
            return f"jdbc:oracle:thin:@{host}:{port}:{database}"
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
    
    def get_jdbc_properties(self, db_config):
        """Get JDBC connection properties for database configuration."""
        db_type = db_config.get("type", "").lower()
        username = db_config.get("username")
        password = db_config.get("password")
        
        properties = {
            "user": username,
            "password": password
        }
        
        if db_type in ["mssql", "sqlserver"]:
            properties["driver"] = "com.microsoft.sqlserver.jdbc.SQLServerDriver"
        elif db_type == "postgresql":
            properties["driver"] = "org.postgresql.Driver"
        elif db_type == "mysql":
            properties["driver"] = "com.mysql.cj.jdbc.Driver"
        elif db_type == "oracle":
            properties["driver"] = "oracle.jdbc.driver.OracleDriver"
        else:
            raise ValueError(f"Unsupported database type: {db_type}")
        
        return properties
    
    def test_connection(self, db_config):
        """Test database connection using Spark JDBC."""
        try:
            spark = self.get_spark_session(f"ConnectionTest_{db_config.get('database', 'unknown')}")
            
            jdbc_url = self.get_jdbc_url(db_config)
            properties = self.get_jdbc_properties(db_config)
            
            # Simple test query
            test_query = self._get_test_query(db_config.get("type"))
            df = spark.read.jdbc(jdbc_url, test_query, properties=properties)
            result = df.collect()
            
            return {
                "success": True,
                "message": "Connection successful",
                "test_result": len(result) > 0
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_test_query(self, db_type):
        """Get appropriate test query for database type."""
        db_type = db_type.lower()
        if db_type in ["mssql", "sqlserver"]:
            return "(SELECT TOP 1 1 as test) as test_query"
        elif db_type == "postgresql":
            return "(SELECT 1 as test LIMIT 1) as test_query"
        elif db_type == "mysql":
            return "(SELECT 1 as test LIMIT 1) as test_query"
        elif db_type == "oracle":
            return "(SELECT 1 as test FROM dual WHERE ROWNUM <= 1) as test_query"
        else:
            return "(SELECT 1 as test) as test_query"


def setup_spark_environment(log_level="WARN"):
    """
    Convenience function to setup Spark environment.
    
    Args:
        log_level: Spark logging level (FATAL, ERROR, WARN, INFO, DEBUG)
    
    Returns:
        SparkEnvironment: Configured environment instance
    """
    env = SparkEnvironment(log_level)
    env.setup_environment()
    return env


# Example usage
if __name__ == "__main__":
    # Test the environment setup
    try:
        env = setup_spark_environment()
        print("Environment setup successful!")
        print(f"Spark Home: {env.spark_home}")
        print(f"Java Home: {env.java_home}")
        print(f"Available drivers: {env.get_jdbc_drivers()}")
        
        # Test Spark session creation
        spark = env.get_spark_session("EnvironmentTest")
        print(f"Spark version: {spark.version}")
        env.stop_spark_session()
        
    except Exception as e:
        print(f"Environment setup failed: {e}")
        sys.exit(1)
