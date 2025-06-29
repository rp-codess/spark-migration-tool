import sys
import json

# Only check packages actually needed for SQL Server connectivity with Spark
required_packages = ['pyspark', 'findspark', 'py4j', 'pyodbc', 'PyMySQL', 'pandas', 'numpy', 'sqlalchemy']
installed_packages = {}
missing_packages = []

for package in required_packages:
    try:
        if package == 'PyMySQL':
            __import__('pymysql')  # PyMySQL is imported as pymysql
        else:
            __import__(package)
        installed_packages[package] = True
    except ImportError:
        installed_packages[package] = False
        missing_packages.append(package)

print(json.dumps({
    "success": True,
    "installed_packages": installed_packages,
    "missing_packages": missing_packages,
    "all_installed": len(missing_packages) == 0
}))
