const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  connectDatabase: (config) => ipcRenderer.invoke('connect-database', config),
  getTables: () => ipcRenderer.invoke('get-tables'),
  getTableSchema: (tableName, schemaName) => ipcRenderer.invoke('get-table-schema', tableName, schemaName),
  disconnectDatabase: () => ipcRenderer.invoke('disconnect-database'),
  
  // Spark operations
  startSparkJob: (jobConfig) => ipcRenderer.invoke('start-spark-job', jobConfig),
  getJobStatus: (jobId) => ipcRenderer.invoke('get-job-status', jobId),
  
  // File operations
  selectFile: () => ipcRenderer.invoke('select-file'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config)
})
