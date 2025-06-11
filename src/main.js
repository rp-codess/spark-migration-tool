const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const DatabaseManager = require('./database/DatabaseManager')

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
    // Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      // If dev server not available, show error
      mainWindow.loadURL('data:text/html,<h1>Please start the dev server first with: yarn dev</h1>')
    })
    mainWindow.webContents.openDevTools()
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

ipcMain.handle('save-config', async (event, config) => {
  console.log('save-config handler called')
  return { success: false, message: 'Config save functionality not implemented yet' }
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
