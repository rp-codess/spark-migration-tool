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
    
    // Create SparkMigrationTool subdirectory
    const toolDirectory = path.join(documentsPath, 'SparkMigrationTool')
    await fs.promises.mkdir(toolDirectory, { recursive: true })
    
    const filePath = path.join(toolDirectory, filename)
    console.log('Saving file to:', filePath)
    
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
    console.log('File saved successfully')
    
    return { success: true, filePath }
  } catch (error) {
    console.error('Error saving file:', error)
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
