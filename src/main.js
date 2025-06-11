const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
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

// IPC Handlers
ipcMain.handle('connect-database', async (event, config) => {
  try {
    return await DatabaseManager.connect(config)
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-tables', async (event) => {
  try {
    const tables = await DatabaseManager.getTables()
    return { success: true, tables }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('get-table-schema', async (event, tableName, schemaName) => {
  try {
    const schema = await DatabaseManager.getTableSchema(tableName, schemaName)
    return { success: true, schema }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

ipcMain.handle('disconnect-database', async (event) => {
  try {
    DatabaseManager.disconnect()
    return { success: true }
  } catch (error) {
    return { success: false, message: error.message }
  }
})

app.whenReady().then(createWindow)

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
