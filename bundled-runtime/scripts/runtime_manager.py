"""
Runtime Environment Manager for Spark Migration Tool
Handles initialization and configuration of bundled Python, Java, and Spark environments
"""

import os
import sys
import subprocess
import json
from pathlib import Path

class RuntimeManager:
    def __init__(self, app_root=None):
        self.app_root = Path(app_root) if app_root else Path(__file__).parent.parent.parent
        self.runtime_dir = self.app_root / "bundled-runtime"
        self.config_file = self.runtime_dir / "config" / "runtime.env"
        self.environment = {}
        
    def load_config(self):
        """Load runtime configuration from environment file"""
        if not self.config_file.exists():
            raise FileNotFoundError(f"Runtime configuration not found: {self.config_file}")
            
        with open(self.config_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    self.environment[key] = value
                    
        return self.environment
    
    def setup_environment(self):
        """Setup environment variables for Python, Java, and Spark"""
        config = self.load_config()
        
        # Set environment variables
        for key, value in config.items():
            os.environ[key] = value
            
        # Add Python to PATH
        python_dir = Path(config.get('PYTHON_HOME', ''))
        if python_dir.exists():
            current_path = os.environ.get('PATH', '')
            os.environ['PATH'] = f"{python_dir};{current_path}"
            
        # Setup JDBC drivers
        drivers_path = Path(config.get('DRIVERS_PATH', ''))
        if drivers_path.exists():
            driver_jars = list(drivers_path.glob('*.jar'))
            if driver_jars:
                jar_paths = ':'.join(str(jar) for jar in driver_jars)
                os.environ['SPARK_CLASSPATH'] = jar_paths
                
        return True
    
    def get_python_executable(self):
        """Get path to bundled Python executable"""
        config = self.load_config()
        python_exe = config.get('PYTHON_EXE')
        if python_exe and Path(python_exe).exists():
            return python_exe
        raise FileNotFoundError("Bundled Python executable not found")
    
    def get_java_home(self):
        """Get JAVA_HOME path"""
        config = self.load_config()
        java_home = config.get('JAVA_HOME')
        if java_home and Path(java_home).exists():
            return java_home
        raise FileNotFoundError("Bundled Java not found")
    
    def get_spark_home(self):
        """Get SPARK_HOME path"""
        config = self.load_config()
        spark_home = config.get('SPARK_HOME')
        if spark_home and Path(spark_home).exists():
            return spark_home
        raise FileNotFoundError("Bundled Spark not found")
    
    def get_driver_jars(self):
        """Get list of JDBC driver JAR files"""
        config = self.load_config()
        drivers_path = Path(config.get('DRIVERS_PATH', ''))
        if drivers_path.exists():
            return list(drivers_path.glob('*.jar'))
        return []
    
    def verify_runtime(self):
        """Verify that all runtime components are available"""
        issues = []
        
        try:
            self.get_python_executable()
        except FileNotFoundError:
            issues.append("Python executable not found")
            
        try:
            self.get_java_home()
        except FileNotFoundError:
            issues.append("Java runtime not found")
            
        try:
            self.get_spark_home()
        except FileNotFoundError:
            issues.append("Spark not found")
            
        drivers = self.get_driver_jars()
        if not drivers:
            issues.append("No JDBC drivers found")
            
        return len(issues) == 0, issues
    
    def execute_python_script(self, script_path, args=None, cwd=None):
        """Execute a Python script using bundled Python"""
        python_exe = self.get_python_executable()
        cmd = [python_exe, str(script_path)]
        
        if args:
            cmd.extend(args)
            
        # Setup environment
        env = os.environ.copy()
        env.update(self.environment)
        
        try:
            result = subprocess.run(
                cmd,
                cwd=cwd,
                env=env,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            return {
                'success': result.returncode == 0,
                'returncode': result.returncode,
                'stdout': result.stdout,
                'stderr': result.stderr
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'error': 'Script execution timed out',
                'stdout': '',
                'stderr': 'Execution timed out after 5 minutes'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'stdout': '',
                'stderr': str(e)
            }
    
    def get_runtime_info(self):
        """Get information about the runtime environment"""
        try:
            config = self.load_config()
            is_valid, issues = self.verify_runtime()
            
            info = {
                'valid': is_valid,
                'issues': issues,
                'python_home': config.get('PYTHON_HOME'),
                'java_home': config.get('JAVA_HOME'),
                'spark_home': config.get('SPARK_HOME'),
                'drivers_count': len(self.get_driver_jars()),
                'drivers': [jar.name for jar in self.get_driver_jars()]
            }
            
            return info
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e),
                'issues': [f"Failed to load runtime configuration: {e}"]
            }

# Singleton instance
_runtime_manager = None

def get_runtime_manager(app_root=None):
    """Get singleton runtime manager instance"""
    global _runtime_manager
    if _runtime_manager is None:
        _runtime_manager = RuntimeManager(app_root)
    return _runtime_manager
