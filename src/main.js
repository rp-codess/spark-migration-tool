const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const DatabaseManager = require('./database/DatabaseManager')
const { initializePythonRuntime } = require('./services/ipc-handlers')
const windowManager = require('./services/window-manager')

// Simple encryption/decryption for passwords
const ENCRYPTION_KEY = crypto.createHash('sha256').update('spark-migration-tool-secret-key-2024').digest()
const algorithm = 'aes-256-cbc'

function encrypt(text) {
  if (!text) return ''
  try {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, ENCRYPTION_KEY, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    return text // Return original text if encryption fails
  }
}

function decrypt(text) {
  if (!text) return ''
  try {
    const textParts = text.split(':')
    if (textParts.length < 2) return text // Return as-is if not encrypted format
    
    const iv = Buffer.from(textParts.shift(), 'hex')
    const encryptedText = textParts.join(':')
    const decipher = crypto.createDecipheriv(algorithm, ENCRYPTION_KEY, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return text // Return original text if decryption fails
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // Always try to load from dev server first, fallback to built files
  const isDev = !app.isPackaged
  
  if (isDev) {
    // Try different ports for dev server
    const devPorts = [5173, 5174, 5175, 3000]
    let currentPortIndex = 0
    
    const tryNextPort = () => {
      if (currentPortIndex < devPorts.length) {
        const port = devPorts[currentPortIndex]
        console.log(`Trying port ${port}...`)
        
        mainWindow.loadURL(`http://localhost:${port}`)
          .then(() => {
            console.log(`Dev server found on port ${port}`)
            mainWindow.webContents.openDevTools()
          })
          .catch(() => {
            console.log(`Port ${port} not available, trying next...`)
            currentPortIndex++
            if (currentPortIndex < devPorts.length) {
              tryNextPort()
            } else {
              // If no dev server available, show error
              console.log('No dev server found on any port')
              mainWindow.loadURL('data:text/html,<h1>Please start the dev server first with: yarn dev</h1>')
            }
          })
      }
    }
    
    tryNextPort()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Register IPC handlers before app is ready
console.log('Registering IPC handlers...')

// Database IPC Handlers
ipcMain.handle('connect-database', async (event, config) => {
  console.log('connect-database handler called')
  try {
    return await DatabaseManager.connect(config)
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-tables', async (event) => {
  console.log('get-tables handler called')
  try {
    const tables = await DatabaseManager.getTables()
    return { success: true, tables }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-table-schema', async (event, tableName, schemaName) => {
  console.log('get-table-schema handler called')
  try {
    const schema = await DatabaseManager.getTableSchema(tableName, schemaName)
    return { success: true, schema }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('disconnect-database', async (event) => {
  console.log('disconnect-database handler called')
  try {
    DatabaseManager.disconnect()
    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-table-sql', async (event, tableName, schemaName) => {
  console.log('get-table-sql handler called for:', tableName, schemaName)
  try {
    const sql = await DatabaseManager.getTableSQL(tableName, schemaName)
    return { success: true, sql }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-table-constraints', async (event, tableName, schemaName) => {
  console.log('get-table-constraints handler called for:', tableName, schemaName)
  try {
    const constraints = await DatabaseManager.getTableConstraints(tableName, schemaName)
    return { success: true, constraints }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-table-foreign-keys', async (event, tableName, schemaName) => {
  console.log('get-table-foreign-keys handler called for:', tableName, schemaName)
  try {
    const foreignKeys = await DatabaseManager.getTableForeignKeys(tableName, schemaName)
    return { success: true, foreignKeys }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-table-row-count', async (event, tableName, schemaName) => {
  console.log('get-table-row-count handler called for:', tableName, schemaName)
  try {
    const count = await DatabaseManager.getTableRowCount(tableName, schemaName)
    return { success: true, count }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-table-data', async (event, tableName, schemaName, limit = 100) => {
  console.log('get-table-data handler called for:', tableName, schemaName, 'limit:', limit)
  try {
    const data = await DatabaseManager.getTableData(tableName, schemaName, limit)
    return { success: true, data }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('search-table-data', async (event, tableName, schemaName, filters) => {
  console.log('search-table-data handler called for:', tableName, schemaName, 'filters:', filters)
  try {
    const data = await DatabaseManager.searchTableData(tableName, schemaName, filters)
    return { success: true, data }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

// File management handlers
ipcMain.handle('save-schema-to-file', async (event, data, filename) => {
  console.log('save-schema-to-file handler called with filename:', filename)
  try {
    // Ensure Documents directory exists
    const documentsPath = path.join(os.homedir(), 'Documents')
    console.log('Documents path:', documentsPath)
    
    // Create SparkMigrationTool subdirectory
    const toolDirectory = path.join(documentsPath, 'SparkMigrationTool')
    console.log('Tool directory:', toolDirectory)
    await fs.promises.mkdir(toolDirectory, { recursive: true })
    
    // Handle folder structure in filename - normalize path separators
    const normalizedFilename = filename.replace(/\//g, path.sep)
    const fullFilePath = path.join(toolDirectory, normalizedFilename)
    const fileDirectory = path.dirname(fullFilePath)
    
    console.log('Normalized filename:', normalizedFilename)
    console.log('Full file path:', fullFilePath)
    console.log('File directory:', fileDirectory)
    
    // Always create the directory structure
    console.log('Creating directory structure:', fileDirectory)
    await fs.promises.mkdir(fileDirectory, { recursive: true })
    
    // Determine if data is JSON or plain text (SQL)
    let fileContent
    if (typeof data === 'string') {
      // It's already a string (SQL content)
      fileContent = data
    } else {
      // It's an object (JSON content)
      fileContent = JSON.stringify(data, null, 2)
    }
    
    console.log('Writing file to:', fullFilePath)
    await fs.promises.writeFile(fullFilePath, fileContent, 'utf8')
    console.log('File saved successfully')
    
    // Verify file exists
    const fileExists = await fs.promises.access(fullFilePath).then(() => true).catch(() => false)
    console.log('File exists after write:', fileExists)
    
    return { success: true, filePath: fullFilePath }
  } catch (error) {
    console.error('Error saving file:', error)
    return { success: false, message: error.message }
  }
})

ipcMain.handle('save-schema-to-folder', async (event, data, folderName, filename) => {
  console.log('save-schema-to-folder handler called with folder:', folderName, 'filename:', filename)
  try {
    // Ensure Documents directory exists
    const documentsPath = path.join(os.homedir(), 'Documents')
    
    // Create SparkMigrationTool subdirectory
    const toolDirectory = path.join(documentsPath, 'SparkMigrationTool')
    await fs.promises.mkdir(toolDirectory, { recursive: true })
    
    // Create specific folder for this download
    const schemaFolderPath = path.join(toolDirectory, folderName)
    await fs.promises.mkdir(schemaFolderPath, { recursive: true })
    
    const filePath = path.join(schemaFolderPath, filename)
    console.log('Saving file to:', filePath)
    
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
    console.log('File saved successfully')
    
    return { success: true, filePath }
  } catch (error) {
    console.error('Error saving file:', error)
    return { success: false, message: error.message }
  }
})

// Configuration management handlers
ipcMain.handle('save-config', async (event, config) => {
  console.log('save-config handler called')
  try {
    const configsPath = path.join(os.homedir(), 'Documents', 'SparkMigrationTool', 'configs.json')
    
    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(configsPath), { recursive: true })
    
    // Load existing configs
    let configs = []
    try {
      const existingData = await fs.promises.readFile(configsPath, 'utf8')
      configs = JSON.parse(existingData)
    } catch (err) {
      // File doesn't exist, start with empty array
    }
    
    // Add new config with unique ID and encrypt password if present
    const newConfig = {
      ...config,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      password: config.password ? encrypt(config.password) : ''
    }
    
    configs.push(newConfig)
    
    // Save back to file
    await fs.promises.writeFile(configsPath, JSON.stringify(configs, null, 2), 'utf8')
    
    return { success: true }
  } catch (error) {
    console.error('Error saving config:', error)
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-saved-configs', async (event) => {
  console.log('get-saved-configs handler called')
  try {
    const configsPath = path.join(os.homedir(), 'Documents', 'SparkMigrationTool', 'configs.json')
    
    try {
      const data = await fs.promises.readFile(configsPath, 'utf8')
      const configs = JSON.parse(data)
      
      // Decrypt passwords for configs that have them
      const decryptedConfigs = configs.map(config => ({
        ...config,
        password: config.password ? decrypt(config.password) : ''
      }))
      
      return { success: true, configs: decryptedConfigs }
    } catch (err) {
      // File doesn't exist
      return { success: true, configs: [] }
    }
  } catch (error) {
    console.error('Error loading configs:', error)
    return { success: false, message: error.message }
  }
})

ipcMain.handle('delete-config', async (event, configId) => {
  console.log('delete-config handler called for:', configId)
  try {
    const configsPath = path.join(os.homedir(), 'Documents', 'SparkMigrationTool', 'configs.json')
    
    // Load existing configs
    let configs = []
    try {
      const existingData = await fs.promises.readFile(configsPath, 'utf8')
      configs = JSON.parse(existingData)
    } catch (err) {
      return { success: false, message: 'No configurations found' }
    }
    
    // Remove config with matching ID
    configs = configs.filter(config => config.id !== configId)
    
    // Save back to file
    await fs.promises.writeFile(configsPath, JSON.stringify(configs, null, 2), 'utf8')
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting config:', error)
    return { success: false, message: error.message }
  }
})

// Spark job handlers (placeholders)
ipcMain.handle('start-spark-job', async (event, jobConfig) => {
  console.log('start-spark-job handler called')
  return { success: false, message: 'Spark job functionality not implemented yet' }
})

ipcMain.handle('get-job-status', async (event, jobId) => {
  console.log('get-job-status handler called')
  return { success: false, message: 'Job status functionality not implemented yet' }
})

ipcMain.handle('select-file', async (event) => {
  console.log('select-file handler called')
  return { success: false, message: 'File selection functionality not implemented yet' }
})

// Runtime management handlers
ipcMain.handle('python-runtime:get-info', async (event) => {
  try {
    console.log('Getting Python runtime info...')
    const fs = require('fs')
    const path = require('path')
    
    const runtimeDir = path.join(__dirname, '..', 'bundled-runtime')
    const pythonDir = path.join(runtimeDir, 'python')
    const javaDir = path.join(runtimeDir, 'java')
    const sparkDir = path.join(runtimeDir, 'spark')
    const driversDir = path.join(runtimeDir, 'drivers')
    const configFile = path.join(runtimeDir, 'config', 'runtime.env')
    
    const info = {
      python: {
        installed: fs.existsSync(path.join(pythonDir, 'python.exe')),
        path: pythonDir,
        version: null
      },
      java: {
        installed: fs.existsSync(javaDir) && fs.readdirSync(javaDir).length > 0,
        path: javaDir,
        version: null
      },
      spark: {
        installed: fs.existsSync(path.join(sparkDir, 'bin')),
        path: sparkDir,
        version: null
      },
      drivers: {
        installed: fs.existsSync(driversDir) && fs.readdirSync(driversDir).filter(f => f.endsWith('.jar')).length > 0,
        path: driversDir,
        count: fs.existsSync(driversDir) ? fs.readdirSync(driversDir).filter(f => f.endsWith('.jar')).length : 0
      },
      config: {
        exists: fs.existsSync(configFile),
        path: configFile
      }
    }
    
    // Try to get Python version if installed
    if (info.python.installed) {
      try {
        const { execSync } = require('child_process')
        const pythonExe = path.join(pythonDir, 'python.exe')
        const versionOutput = execSync(`"${pythonExe}" --version`, { encoding: 'utf8', timeout: 5000 })
        info.python.version = versionOutput.trim()
      } catch (error) {
        console.log('Could not get Python version:', error.message)
      }
    }
    
    console.log('Runtime info:', info)
    
    // Calculate derived properties
    const allComponentsInstalled = info.python.installed && info.java.installed && info.spark.installed && info.drivers.installed
    const runtimeValid = allComponentsInstalled && info.config.exists
    
    const runtimeResult = {
      info: {
        ...info,
        runtimeValid,
        initialized: runtimeValid,
        pythonHome: info.python.path,
        javaHome: info.java.path,
        sparkHome: info.spark.path,
        driversPath: info.drivers.path
      }
    }
    
    return { success: true, ...runtimeResult }
  } catch (error) {
    console.error('Error getting runtime info:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('python-runtime:setup', async (event, force = false) => {
  try {
    console.log('Setting up Python runtime...')
    const { spawn } = require('child_process')
    const path = require('path')
    
    const scriptPath = path.join(__dirname, '..', 'bundled-runtime', 'scripts', 'setup-runtime.ps1')
    
    return new Promise((resolve, reject) => {
      const process = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
        cwd: path.join(__dirname, '..')
      })
      
      let output = ''
      let errors = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
        console.log('Setup output:', data.toString())
      })
      
      process.stderr.on('data', (data) => {
        errors += data.toString()
        console.error('Setup error:', data.toString())
      })
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output, message: 'Runtime setup completed successfully' })
        } else {
          reject(new Error(`Setup failed with code ${code}: ${errors}`))
        }
      })
      
      process.on('error', (error) => {
        reject(error)
      })
    })
  } catch (error) {
    console.error('Error setting up runtime:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('python-runtime:install-packages', async (event, force = false) => {
  try {
    console.log('Installing Python packages...')
    const { spawn } = require('child_process')
    const path = require('path')
    
    const scriptPath = path.join(__dirname, '..', 'bundled-runtime', 'scripts', 'install-python-packages.ps1')
    
    return new Promise((resolve, reject) => {
      const process = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
        cwd: path.join(__dirname, '..')
      })
      
      let output = ''
      let errors = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
        console.log('Install output:', data.toString())
      })
      
      process.stderr.on('data', (data) => {
        errors += data.toString()
        console.error('Install error:', data.toString())
      })
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output, message: 'Python packages installed successfully' })
        } else {
          reject(new Error(`Package installation failed with code ${code}: ${errors}`))
        }
      })
      
      process.on('error', (error) => {
        reject(error)
      })
    })
  } catch (error) {
    console.error('Error installing packages:', error)
    return { success: false, error: error.message }
  }
})

// Auto-installation of missing Python packages
ipcMain.handle('python-runtime:install-missing-packages', async (event) => {
  try {
    console.log('Checking and installing missing Python packages...')
    const { spawn } = require('child_process')
    const path = require('path')
    
    const pythonExe = path.join(__dirname, '..', 'bundled-runtime', 'python', 'python.exe')
    const requirementsFile = path.join(__dirname, '..', 'python', 'requirements-spark.txt')
    
    // Check if requirements file exists
    if (!fs.existsSync(requirementsFile)) {
      return { success: false, error: 'Spark requirements file not found' }
    }
    
    // Install packages using bundled Python pip
    return new Promise((resolve, reject) => {
      const process = spawn(pythonExe, ['-m', 'pip', 'install', '-r', requirementsFile, '--upgrade'], {
        cwd: path.join(__dirname, '..')
      })
      
      let output = ''
      let errors = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
        console.log('Package install output:', data.toString())
      })
      
      process.stderr.on('data', (data) => {
        errors += data.toString()
        console.error('Package install error:', data.toString())
      })
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ 
            success: true, 
            output, 
            message: 'All Python packages installed successfully',
            installedPackages: output.match(/Successfully installed .+/g) || []
          })
        } else {
          reject(new Error(`Package installation failed with code ${code}: ${errors}`))
        }
      })
      
      process.on('error', (error) => {
        reject(error)
      })
    })
    
  } catch (error) {
    console.error('Error installing packages:', error)
    return { success: false, error: error.message }
  }
})

// Verify Python environment and packages
ipcMain.handle('python-runtime:verify-packages', async (event) => {
  try {
    console.log('Verifying Python packages...')
    const { spawn } = require('child_process')
    const path = require('path')
    
    const pythonExe = path.join(__dirname, '..', 'bundled-runtime', 'python', 'python.exe')
    
    // Script to check for required packages
    const checkScript = `
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
`
    
    // Write and execute the verification script
    const tempDir = path.join(__dirname, '..', 'temp')
    await fs.promises.mkdir(tempDir, { recursive: true })
    const scriptPath = path.join(tempDir, 'verify_packages.py')
    await fs.promises.writeFile(scriptPath, checkScript)
    
    return new Promise((resolve, reject) => {
      const process = spawn(pythonExe, [scriptPath], {
        cwd: path.join(__dirname, '..')
      })
      
      let output = ''
      let errors = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      process.stderr.on('data', (data) => {
        errors += data.toString()
      })
      
      process.on('close', (code) => {
        // Clean up temp file
        fs.promises.unlink(scriptPath).catch(() => {})
        
        if (code === 0 && output.trim()) {
          try {
            const result = JSON.parse(output.trim())
            resolve(result)
          } catch (parseError) {
            reject(new Error(`Failed to parse verification output: ${output}`))
          }
        } else {
          reject(new Error(`Package verification failed (code ${code}): ${errors || output}`))
        }
      })
      
      process.on('error', (error) => {
        reject(error)
      })
    })
    
  } catch (error) {
    console.error('Error verifying packages:', error)
    return { success: false, error: error.message }
  }
})

console.log('IPC handlers registered successfully')

app.whenReady().then(async () => {
  console.log('App is ready, creating window...')
  
  // Initialize Python runtime in background
  initializePythonRuntime().catch(console.error)
  
  // Create main window
  windowManager.createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Spark-specific database operations
ipcMain.handle('spark:connect-database', async (event, config) => {
  try {
    console.log('Spark: Connecting to database...', config.name)
    const { spawn } = require('child_process')
    const path = require('path')
    
    // Create a unique session ID
    const sessionId = `spark_session_${Date.now()}`
    
    // Prepare Spark connection script
    const sparkScript = `
import sys
import os
import json

# Set up paths for bundled runtime
bundle_root = r"${path.join(__dirname, '..', 'bundled-runtime').replace(/\\/g, '\\\\')}"
spark_home = os.path.join(bundle_root, "spark")
drivers_path = os.path.join(bundle_root, "drivers")
java_home = os.path.join(bundle_root, "java")
python_home = os.path.join(bundle_root, "python")

# Add bundled Python site-packages to path
python_site_packages = os.path.join(python_home, "Lib", "site-packages")
if python_site_packages not in sys.path:
    sys.path.insert(0, python_site_packages)

# Set environment variables
os.environ["SPARK_HOME"] = spark_home
os.environ["PYTHONPATH"] = os.pathsep.join([
    os.path.join(spark_home, "python"),
    os.path.join(spark_home, "python", "lib", "pyspark.zip"),
    os.path.join(spark_home, "python", "lib", "py4j-*.zip"),
    python_site_packages
])

# Find Java executable
import glob
java_dirs = glob.glob(os.path.join(java_home, "*"))
if java_dirs:
    java_bin = os.path.join(java_dirs[0], "bin", "java.exe")
    os.environ["JAVA_HOME"] = java_dirs[0]
    print(f"Java found: {java_dirs[0]}")
else:
    print(json.dumps({"success": False, "error": "Java not found in bundled runtime"}))
    sys.exit(1)

# Find SQL Server JDBC driver
mssql_jar = None
for file in os.listdir(drivers_path):
    if file.startswith("mssql-jdbc") and file.endswith(".jar"):
        mssql_jar = os.path.join(drivers_path, file)
        break

if not mssql_jar:
    print(json.dumps({"success": False, "error": "SQL Server JDBC driver not found"}))
    sys.exit(1)

print(f"Using JDBC driver: {mssql_jar}")

try:
    # Import PySpark
    from pyspark.sql import SparkSession
    from pyspark import SparkConf
    
    # Create Spark configuration
    conf = SparkConf()
    conf.setAppName("SparkMigrationTool_${sessionId}")
    conf.set("spark.jars", mssql_jar)
    conf.set("spark.sql.adaptive.enabled", "true")
    conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
    conf.set("spark.driver.memory", "1g")
    conf.set("spark.executor.memory", "1g")
    conf.set("spark.sql.execution.arrow.pyspark.enabled", "false")  # Disable Arrow for compatibility
    
    # Windows-specific Spark configurations to fix hostname issues
    conf.set("spark.driver.host", "localhost")
    conf.set("spark.driver.bindAddress", "localhost")
    conf.set("spark.master", "local[*]")
    conf.set("spark.executor.extraJavaOptions", "-Djava.net.preferIPv4Stack=true")
    conf.set("spark.driver.extraJavaOptions", "-Djava.net.preferIPv4Stack=true")
    
    # Disable problematic Spark UI to avoid port conflicts
    conf.set("spark.ui.enabled", "false")
    
    # Disable automatic cleanup that causes Windows issues
    conf.set("spark.cleaner.referenceTracking.blocking", "false")
    conf.set("spark.cleaner.referenceTracking.blocking.shuffle", "false")
    conf.set("spark.cleaner.periodicGC.interval", "30min")
    
    # Simplified temp directory configuration
    conf.set("spark.local.dir", bundle_root.replace("\\\\", "/") + "/temp/spark")
    conf.set("spark.sql.warehouse.dir", bundle_root.replace("\\\\", "/") + "/temp/spark/warehouse")
    
    # Set Hadoop home directory to avoid warnings (required for Windows)
    hadoop_home = spark_home
    os.environ["HADOOP_HOME"] = hadoop_home
    os.environ["HADOOP_CONF_DIR"] = os.path.join(hadoop_home, "conf")
    
    # Ensure Hadoop bin directory is in PATH for Windows
    hadoop_bin = os.path.join(hadoop_home, "bin")
    current_path = os.environ.get("PATH", "")
    if hadoop_bin not in current_path:
        os.environ["PATH"] = hadoop_bin + os.pathsep + current_path
    
    # Create Spark session
    spark = SparkSession.builder.config(conf=conf).getOrCreate()
    
    # Test connection with SQL Server
    jdbc_url = "jdbc:sqlserver://${config.host}:${config.port};databaseName=${config.database};encrypt=true;trustServerCertificate=true"
    connection_properties = {
        "user": "${config.username}",
        "password": "${config.password}",
        "driver": "com.microsoft.sqlserver.jdbc.SQLServerDriver"
    }
    
    # Test connection by reading from INFORMATION_SCHEMA.TABLES
    test_query = "(SELECT TOP 1 TABLE_NAME FROM INFORMATION_SCHEMA.TABLES) AS test"
    test_df = spark.read.jdbc(jdbc_url, test_query, properties=connection_properties)
    test_count = test_df.count()
    
    print(json.dumps({
        "success": True, 
        "sessionId": "${sessionId}",
        "message": "Spark connection established successfully",
        "sparkVersion": spark.version,
        "testCount": test_count,
        "javaHome": os.environ.get("JAVA_HOME"),
        "sparkHome": os.environ.get("SPARK_HOME")
    }))
    
except ImportError as e:
    print(json.dumps({"success": False, "error": f"PySpark import failed: {str(e)}"}))
    sys.exit(1)
except Exception as e:
    print(json.dumps({"success": False, "error": f"Spark connection failed: {str(e)}"}))
    sys.exit(1)
finally:
    if 'spark' in locals():
        spark.stop()
`

    // Write the script to a temporary file
    const tempDir = path.join(__dirname, '..', 'temp')
    await fs.promises.mkdir(tempDir, { recursive: true })
    const scriptPath = path.join(tempDir, `spark_connect_${sessionId}.py`)
    await fs.promises.writeFile(scriptPath, sparkScript)
    
    // Execute the script with bundled Python
    const pythonExe = path.join(__dirname, '..', 'bundled-runtime', 'python', 'python.exe')
    
    return new Promise((resolve, reject) => {
      const process = spawn(pythonExe, [scriptPath], {
        cwd: path.join(__dirname, '..')
      })
      
      let output = ''
      let errors = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      process.stderr.on('data', (data) => {
        errors += data.toString()
      })
      
      process.on('close', (code) => {
        // Clean up temp file
        fs.promises.unlink(scriptPath).catch(() => {})
        
        if (code === 0 && output.trim()) {
          try {
            // Extract JSON from output (filter out debug messages)
            const lines = output.trim().split('\n')
            const jsonLine = lines.find(line => line.trim().startsWith('{'))
            
            if (jsonLine) {
              const result = JSON.parse(jsonLine.trim())
              resolve(result)
            } else {
              reject(new Error(`No JSON output found in Spark response: ${output}`))
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Spark output: ${output}`))
          }
        } else {
          reject(new Error(`Spark connection failed (code ${code}): ${errors || output}`))
        }
      })
      
      process.on('error', (error) => {
        reject(error)
      })
    })
    
  } catch (error) {
    console.error('Error connecting with Spark:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('spark:get-tables', async (event, sessionId, config) => {
  try {
    console.log('Spark: Getting tables for session:', sessionId)
    const { spawn } = require('child_process')
    const path = require('path')
    
    // Prepare Spark table listing script - simplified version
    const sparkScript = `
import sys
import os
import json
from pathlib import Path

# Add the bundled runtime to Python path
bundle_root = r"${path.join(__dirname, '..', 'bundled-runtime').replace(/\\/g, '\\\\')}"
sys.path.insert(0, os.path.join(bundle_root, "scripts"))

try:
    # Import runtime manager
    from runtime_manager import get_runtime_manager
    
    # Initialize runtime
    runtime = get_runtime_manager()
    runtime.setup_environment()
    
    # Import findspark and initialize
    import findspark
    findspark.init(runtime.get_spark_home())
    
    from pyspark.sql import SparkSession
    
    # Get existing Spark session or create a minimal one
    spark = SparkSession.builder \\
        .appName("TableQuery_${sessionId}") \\
        .config("spark.driver.host", "localhost") \\
        .config("spark.driver.bindAddress", "localhost") \\
        .config("spark.ui.enabled", "false") \\
        .config("spark.local.dir", "C:/temp/spark-local") \\
        .config("spark.sql.warehouse.dir", "C:/temp/spark-warehouse") \\
        .getOrCreate()
    
    spark.sparkContext.setLogLevel("ERROR")
    
    # Database connection parameters
    jdbc_url = "jdbc:sqlserver://${config.host}:${config.port};databaseName=${config.database};encrypt=true;trustServerCertificate=true"
    connection_properties = {
        "user": "${config.username}",
        "password": "${config.password}",
        "driver": "com.microsoft.sqlserver.jdbc.SQLServerDriver"
    }
    
    # Simple query to get all tables
    tables_query = """(
        SELECT 
            ISNULL(TABLE_SCHEMA, 'dbo') as schema_name,
            TABLE_NAME as table_name,
            'BASE TABLE' as table_type
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_SCHEMA, TABLE_NAME
    ) AS tables"""
    
    # Execute query
    tables_df = spark.read.jdbc(jdbc_url, tables_query, properties=connection_properties)
    tables_list = tables_df.collect()
    
    tables = []
    for row in tables_list:
        tables.append({
            "schema": row.schema_name if row.schema_name else "dbo",
            "name": row.table_name,
            "type": "BASE TABLE"
        })
    
    result = {
        "success": True, 
        "tables": tables,
        "count": len(tables),
        "sparkVersion": spark.version
    }
    
    print(json.dumps(result))
    
except Exception as e:
    error_result = {"success": False, "error": f"Error: {str(e)}"}
    print(json.dumps(error_result))
    sys.exit(1)
`

    // Write and execute the script
    const tempDir = path.join(__dirname, '..', 'temp')
    await fs.promises.mkdir(tempDir, { recursive: true })
    const scriptPath = path.join(tempDir, `spark_tables_${sessionId}.py`)
    await fs.promises.writeFile(scriptPath, sparkScript)
    
    const pythonExe = path.join(__dirname, '..', 'bundled-runtime', 'python', 'python.exe')
    
    return new Promise((resolve, reject) => {
      const process = spawn(pythonExe, [scriptPath], {
        cwd: path.join(__dirname, '..')
      })
      
      let output = ''
      let errors = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      process.stderr.on('data', (data) => {
        errors += data.toString()
      })
      
      process.on('close', (code) => {
        // Clean up temp file
        fs.promises.unlink(scriptPath).catch(() => {})
        
        if (code === 0 && output.trim()) {
          try {
            // Extract JSON from output (filter out debug messages)
            const lines = output.trim().split('\n')
            const jsonLine = lines.find(line => line.trim().startsWith('{'))
            
            if (jsonLine) {
              const result = JSON.parse(jsonLine.trim())
              resolve(result)
            } else {
              reject(new Error(`No JSON output found in Spark response: ${output}`))
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse Spark output: ${output}`))
          }
        } else {
          reject(new Error(`Spark table query failed (code ${code}): ${errors || output}`))
        }
      })
      
      process.on('error', (error) => {
        reject(error)
      })
    })
    
  } catch (error) {
    console.error('Error getting tables with Spark:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('spark:export-csv', async (event, { sessionId, filename, content, metadata }) => {
  try {
    console.log('Spark: Exporting CSV for session:', sessionId)
    
    // Ensure Documents directory exists
    const documentsPath = path.join(os.homedir(), 'Documents')
    const toolDirectory = path.join(documentsPath, 'SparkMigrationTool')
    const exportsDirectory = path.join(toolDirectory, 'SparkExports')
    await fs.promises.mkdir(exportsDirectory, { recursive: true })
    
    const filePath = path.join(exportsDirectory, filename)
    
    // Add metadata header to CSV
    const metadataHeader = `# Spark Migration Tool Export
# Database: ${metadata.database}
# Host: ${metadata.host}
# Table Count: ${metadata.tableCount}
# Exported: ${metadata.exportedAt}
# Session: ${sessionId}
#
`
    const fullContent = metadataHeader + content
    
    await fs.promises.writeFile(filePath, fullContent, 'utf8')
    
    console.log('CSV exported successfully to:', filePath)
    return { success: true, filePath }
    
  } catch (error) {
    console.error('Error exporting CSV:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('spark:disconnect', async (event, sessionId) => {
  try {
    console.log('Spark: Disconnecting session:', sessionId)
    // For now, just return success as Spark sessions are short-lived in our scripts
    return { success: true }
  } catch (error) {
    console.error('Error disconnecting Spark:', error)
    return { success: false, error: error.message }
  }
})
