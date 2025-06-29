const { ipcMain } = require('electron')
const DatabaseManager = require('../database/DatabaseManager')
const fileManager = require('./file-manager')
const configManager = require('./config-manager')
const PythonRuntimeService = require('./python-runtime')

class IPCHandlers {
  /**
   * Registers all IPC handlers
   */
  registerAll() {
    console.log('Registering IPC handlers...')
    
    // Database connection handlers
    this.registerDatabaseHandlers()
    
    // File management handlers
    this.registerFileHandlers()
    
    // Configuration management handlers
    this.registerConfigHandlers()
    
    // Spark job handlers (placeholders)
    this.registerSparkHandlers()
    
    // Python Runtime handlers
    this.registerPythonRuntimeHandlers()
    
    console.log('IPC handlers registered successfully')
  }

  /**
   * Registers database-related IPC handlers
   */
  registerDatabaseHandlers() {
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
  }

  /**
   * Registers file management IPC handlers
   */
  registerFileHandlers() {
    ipcMain.handle('save-schema-to-file', async (event, data, filename) => {
      return await fileManager.saveSchemaToFile(data, filename)
    })

    ipcMain.handle('save-schema-to-folder', async (event, data, folderName, filename) => {
      return await fileManager.saveSchemaToFolder(data, folderName, filename)
    })
  }

  /**
   * Registers configuration management IPC handlers
   */
  registerConfigHandlers() {
    ipcMain.handle('save-config', async (event, config) => {
      return await configManager.saveConfig(config)
    })

    ipcMain.handle('get-saved-configs', async (event) => {
      return await configManager.getSavedConfigs()
    })

    ipcMain.handle('delete-config', async (event, configId) => {
      return await configManager.deleteConfig(configId)
    })
  }

  /**
   * Registers Spark job handlers (placeholders for future implementation)
   */
  registerSparkHandlers() {
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
  }

  /**
   * Registers Python Runtime IPC handlers
   */
  registerPythonRuntimeHandlers() {
    const pythonRuntime = new PythonRuntimeService()

    ipcMain.handle('python-runtime:get-info', async () => {
      try {
        return await pythonRuntime.getRuntimeInfo()
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('python-runtime:setup', async (event, force = false) => {
      try {
        const progressHandler = (data) => {
          event.sender.send('python-runtime:setup-progress', data)
        }

        pythonRuntime.on('setup-output', progressHandler)

        const result = await pythonRuntime.setupRuntime(force)

        pythonRuntime.off('setup-output', progressHandler)

        return result
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('python-runtime:install-packages', async (event, force = false) => {
      try {
        const progressHandler = (data) => {
          event.sender.send('python-runtime:install-progress', data)
        }

        pythonRuntime.on('install-output', progressHandler)

        const result = await pythonRuntime.installPythonPackages(force)

        pythonRuntime.off('install-output', progressHandler)

        return result
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('python-runtime:schema-comparison', async (event, configData) => {
      try {
        const outputHandler = (data) => {
          event.sender.send('python-runtime:script-output', { 
            script: 'schema-comparison',
            ...data 
          })
        }

        pythonRuntime.on('output', outputHandler)

        const result = await pythonRuntime.runSchemaComparison(configData)

        pythonRuntime.off('output', outputHandler)

        return result
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('python-runtime:data-migration', async (event, configData) => {
      try {
        const outputHandler = (data) => {
          event.sender.send('python-runtime:script-output', { 
            script: 'data-migration',
            ...data 
          })
        }

        const progressHandler = (data) => {
          event.sender.send('python-runtime:migration-progress', data)
        }

        pythonRuntime.on('output', outputHandler)

        const result = await pythonRuntime.runDataMigration(configData, progressHandler)

        pythonRuntime.off('output', outputHandler)

        return result
      } catch (error) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('python-runtime:execute-script', async (event, scriptName, args = [], options = {}) => {
      try {
        const outputHandler = (data) => {
          event.sender.send('python-runtime:script-output', { 
            script: scriptName,
            ...data 
          })
        }

        pythonRuntime.on('output', outputHandler)

        const result = await pythonRuntime.executeScript(scriptName, args, options)

        pythonRuntime.off('output', outputHandler)

        return result
      } catch (error) {
        return { success: false, error: error.message }
      }
    })
  }
}

const ipcHandlers = new IPCHandlers()

// Functions expected by main.js
function setupHandlers() {
  ipcHandlers.registerAll()
}

async function initializePythonRuntime() {
  try {
    const pythonRuntime = new PythonRuntimeService()
    await pythonRuntime.initialize()
    console.log('Python runtime initialized successfully')
  } catch (error) {
    console.error('Failed to initialize Python runtime:', error)
    throw error
  }
}

module.exports = {
  setupHandlers,
  initializePythonRuntime,
  ipcHandlers
}
