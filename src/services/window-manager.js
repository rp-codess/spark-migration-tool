const { BrowserWindow } = require('electron')
const path = require('path')

class WindowManager {
  constructor() {
    this.mainWindow = null
  }

  /**
   * Creates the main application window
   */
  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload.js')
      }
    })

    this.loadContent()
    return this.mainWindow
  }

  /**
   * Loads content into the main window (dev server or built files)
   */
  loadContent() {
    const { app } = require('electron')
    const isDev = !app.isPackaged
    
    if (isDev) {
      this.loadDevServer()
    } else {
      this.loadBuiltFiles()
    }
  }

  /**
   * Attempts to load content from development server
   */
  loadDevServer() {
    // Try different ports for dev server
    const devPorts = [5173, 5174, 5175, 3000]
    let currentPortIndex = 0
    
    const tryNextPort = () => {
      if (currentPortIndex < devPorts.length) {
        const port = devPorts[currentPortIndex]
        console.log(`Trying port ${port}...`)
        
        this.mainWindow.loadURL(`http://localhost:${port}`)
          .then(() => {
            console.log(`Dev server found on port ${port}`)
            this.mainWindow.webContents.openDevTools()
          })
          .catch(() => {
            console.log(`Port ${port} not available, trying next...`)
            currentPortIndex++
            if (currentPortIndex < devPorts.length) {
              tryNextPort()
            } else {
              // If no dev server available, show error
              console.log('No dev server found on any port')
              this.mainWindow.loadURL('data:text/html,<h1>Please start the dev server first with: yarn dev</h1>')
            }
          })
      }
    }
    
    tryNextPort()
  }

  /**
   * Loads built files for production
   */
  loadBuiltFiles() {
    this.mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  /**
   * Gets the main window instance
   */
  getMainWindow() {
    return this.mainWindow
  }
}

module.exports = new WindowManager()
