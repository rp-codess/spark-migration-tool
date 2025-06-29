const { contextBridge, ipcRenderer } = require('electron')

console.log('Preload script loading...')

const electronAPI = {
  // Generic invoke method for flexibility
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // Database operations
  connectDatabase: (config) => ipcRenderer.invoke('connect-database', config),
  getTables: () => ipcRenderer.invoke('get-tables'),
  getTableSchema: (tableName, schemaName) => ipcRenderer.invoke('get-table-schema', tableName, schemaName),
  disconnectDatabase: () => ipcRenderer.invoke('disconnect-database'),
  
  // File operations
  saveSchemaToFile: (data, filename) => ipcRenderer.invoke('save-schema-to-file', data, filename),
  saveSchemaToFolder: (data, folderName, filename) => ipcRenderer.invoke('save-schema-to-folder', data, folderName, filename),
  selectFile: () => ipcRenderer.invoke('select-file'),
  
  // Spark operations
  startSparkJob: (jobConfig) => ipcRenderer.invoke('start-spark-job', jobConfig),
  getJobStatus: (jobId) => ipcRenderer.invoke('get-job-status', jobId),
  
  // Spark database operations (new)
  'spark:connect-database': (config) => ipcRenderer.invoke('spark:connect-database', config),
  'spark:get-databases': (sessionId) => ipcRenderer.invoke('spark:get-databases', sessionId),
  'spark:get-tables': (sessionId, config) => ipcRenderer.invoke('spark:get-tables', sessionId, config),
  'spark:export-csv': (data) => ipcRenderer.invoke('spark:export-csv', data),
  'spark:disconnect': (sessionId) => ipcRenderer.invoke('spark:disconnect', sessionId),
  
  // Runtime management operations
  getRuntimeInfo: () => ipcRenderer.invoke('get-runtime-info'),
  checkRuntimeComponents: () => ipcRenderer.invoke('check-runtime-components'),
  setupRuntime: () => ipcRenderer.invoke('setup-runtime'),
  installPythonPackages: () => ipcRenderer.invoke('install-python-packages'),
  executePythonScript: (scriptName, args, options) => ipcRenderer.invoke('execute-python-script', scriptName, args, options),
  
  // Enhanced Python package management
  'python-runtime:install-missing-packages': () => ipcRenderer.invoke('python-runtime:install-missing-packages'),
  'python-runtime:verify-packages': () => ipcRenderer.invoke('python-runtime:verify-packages'),
  
  // New SQL functions
  getTableSQL: (tableName, schemaName) => ipcRenderer.invoke('get-table-sql', tableName, schemaName),
  getTableConstraints: (tableName, schemaName) => ipcRenderer.invoke('get-table-constraints', tableName, schemaName),
  getTableForeignKeys: (tableName, schemaName) => ipcRenderer.invoke('get-table-foreign-keys', tableName, schemaName),
  getTableRowCount: (tableName, schemaName) => ipcRenderer.invoke('get-table-row-count', tableName, schemaName),
  getTableData: (tableName, schemaName, limit) => ipcRenderer.invoke('get-table-data', tableName, schemaName, limit),
  searchTableData: (tableName, schemaName, filters) => ipcRenderer.invoke('search-table-data', tableName, schemaName, filters),
  
  // Configuration management
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getSavedConfigs: () => ipcRenderer.invoke('get-saved-configs'),
  deleteConfig: (configId) => ipcRenderer.invoke('delete-config', configId)
}

console.log('ElectronAPI functions:', Object.keys(electronAPI))
console.log('searchTableData function type:', typeof electronAPI.searchTableData)
console.log('saveSchemaToFolder function:', typeof electronAPI.saveSchemaToFolder)

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

console.log('Preload script loaded successfully')
