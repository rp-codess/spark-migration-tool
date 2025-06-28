const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const DatabaseManager = require('./database/DatabaseManager')

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

// IPC Handlers
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

// Additional handlers for Spark operations (placeholders)
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

console.log('IPC handlers registered successfully')

app.whenReady().then(() => {
  console.log('App is ready, creating window...')
  createWindow()
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
