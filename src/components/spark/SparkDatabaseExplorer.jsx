import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import Console from '../shared/Console'
import './SparkDatabaseExplorer.css'

const SparkDatabaseExplorer = () => {
  const [savedConnections, setSavedConnections] = useState([])
  const [selectedConnection, setSelectedConnection] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [sparkSession, setSparkSession] = useState(null)
  const [tables, setTables] = useState([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [expandedTables, setExpandedTables] = useState(new Set())
  const [tableSchemas, setTableSchemas] = useState({})
  const [logs, setLogs] = useState([])
  const [isConsoleVisible, setIsConsoleVisible] = useState(true)

  // Load saved connections on component mount
  useEffect(() => {
    loadSavedConnections()
  }, [])

  const addLog = useCallback((message, type = 'info', level = null) => {
    const newLog = {
      timestamp: Date.now(),
      message,
      type,
      level: level || type.toUpperCase()
    }
    setLogs(prev => [...prev, newLog])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // Make clearLogs available globally for Console component
  useEffect(() => {
    window.clearConsoleLogs = clearLogs
    return () => {
      delete window.clearConsoleLogs
    }
  }, [clearLogs])

  const loadSavedConnections = async () => {
    try {
      addLog('Loading saved connections...', 'info')
      const result = await window.electronAPI.invoke('get-saved-configs')
      if (result.success) {
        setSavedConnections(result.configs)
        addLog(`✅ Loaded ${result.configs.length} saved connections`, 'success')
      } else {
        addLog('❌ Failed to load saved connections', 'error')
      }
    } catch (error) {
      addLog(`❌ Error loading connections: ${error.message}`, 'error')
    }
  }

  const connectToDatabase = async (connection) => {
    if (!connection) return

    setIsConnecting(true)
    setSelectedConnection(connection)
    addLog(`🚀 Starting Spark connection verification...`, 'info')
    addLog(`📋 Using connection: ${connection.name} (${connection.type})`, 'info')

    try {
      // First verify Python environment
      addLog('🐍 Checking Python environment and packages...', 'info')
      const verifyResult = await window.electronAPI.invoke('python-runtime:verify-packages')
      
      if (verifyResult.success && verifyResult.all_installed) {
        addLog('✅ All required packages are already installed', 'success')
      } else {
        addLog('⚠️ Installing missing Python packages...', 'warning')
        const installResult = await window.electronAPI.invoke('python-runtime:install-missing-packages')
        if (installResult.success) {
          addLog('✅ Python packages installed successfully', 'success')
        } else {
          throw new Error(`Package installation failed: ${installResult.error}`)
        }
      }

      // Connect using Spark
      addLog('📊 Initializing Spark session with JDBC driver...', 'info')
      const connectResult = await window.electronAPI.invoke('spark:connect-database', connection)
      
      if (connectResult.success) {
        addLog('✅ Spark connection established successfully!', 'success')
        addLog(`📋 Session ID: ${connectResult.sessionId}`, 'info')
        addLog(`⚡ Spark Version: ${connectResult.sparkVersion}`, 'info')
        addLog(`☕ Java Home: ${connectResult.javaHome}`, 'info')
        addLog(`🏠 Spark Home: ${connectResult.sparkHome}`, 'info')
        
        setIsConnected(true)
        setSparkSession(connectResult)
        
        // Automatically load tables
        await loadTables(connectResult.sessionId, connection)
      } else {
        throw new Error(connectResult.error)
      }
    } catch (error) {
      addLog(`❌ Connection failed: ${error.message}`, 'error')
      setIsConnected(false)
      setSparkSession(null)
    } finally {
      setIsConnecting(false)
    }
  }

  const loadTables = async (sessionId, connection) => {
    setIsLoadingTables(true)
    addLog('📋 Fetching table list using Spark SQL...', 'info')

    try {
      const result = await window.electronAPI.invoke('spark:get-tables', sessionId, connection)
      
      if (result.success) {
        setTables(result.tables || [])
        addLog(`✅ Found ${result.tables?.length || 0} tables`, 'success')
        addLog(`📊 Method: ${result.method}`, 'info')
        
        if (result.warning) {
          addLog(`⚠️ ${result.warning}`, 'warning')
        }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      addLog(`❌ Failed to get tables: ${error.message}`, 'error')
    } finally {
      setIsLoadingTables(false)
    }
  }

  const toggleTableExpansion = async (tableName, schemaName) => {
    const tableKey = `${schemaName}.${tableName}`
    const newExpanded = new Set(expandedTables)
    
    if (newExpanded.has(tableKey)) {
      newExpanded.delete(tableKey)
    } else {
      newExpanded.add(tableKey)
      
      // Load table schema if not already loaded
      if (!tableSchemas[tableKey]) {
        await loadTableSchema(tableName, schemaName)
      }
    }
    
    setExpandedTables(newExpanded)
  }

  const loadTableSchema = async (tableName, schemaName) => {
    const tableKey = `${schemaName}.${tableName}`
    addLog(`📋 Loading schema for ${tableKey}...`, 'info')

    try {
      const result = await window.electronAPI.invoke('get-table-schema', tableName, schemaName)
      
      if (result.success) {
        setTableSchemas(prev => ({
          ...prev,
          [tableKey]: result.schema
        }))
        addLog(`✅ Schema loaded for ${tableKey}`, 'success')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      addLog(`❌ Failed to load schema for ${tableKey}: ${error.message}`, 'error')
    }
  }

  const disconnectFromDatabase = async () => {
    if (sparkSession) {
      addLog('🔌 Disconnecting Spark session...', 'info')
      try {
        await window.electronAPI.invoke('spark:disconnect', sparkSession.sessionId)
        addLog('✅ Disconnected successfully', 'success')
      } catch (error) {
        addLog(`⚠️ Disconnect warning: ${error.message}`, 'warning')
      }
    }
    
    setIsConnected(false)
    setSparkSession(null)
    setSelectedConnection(null)
    setTables([])
    setTableSchemas({})
    setExpandedTables(new Set())
  }

  const refreshTables = async () => {
    if (sparkSession && selectedConnection) {
      await loadTables(sparkSession.sessionId, selectedConnection)
    }
  }

  return (
    <div className="spark-database-explorer">
      <div className="explorer-main">
        <div className="explorer-header">
          <h2>Spark Database Explorer</h2>
          <p>Connect to databases using Apache Spark and explore table structures</p>
        </div>

        {!isConnected ? (
          <div className="connection-section">
            <h3>Select a Database Connection</h3>
            <div className="connections-grid">
              {savedConnections.map((connection) => (
                <div
                  key={connection.id}
                  className={`connection-card ${selectedConnection?.id === connection.id ? 'selected' : ''}`}
                  onClick={() => !isConnecting && connectToDatabase(connection)}
                >
                  <div className="connection-type">
                    {connection.type.toUpperCase()}
                  </div>
                  <div className="connection-name">{connection.name}</div>
                  <div className="connection-details">
                    {connection.host}:{connection.port} / {connection.database}
                  </div>
                  {isConnecting && selectedConnection?.id === connection.id && (
                    <div className="connection-loading">Connecting...</div>
                  )}
                </div>
              ))}
            </div>
            
            {savedConnections.length === 0 && (
              <div className="no-connections">
                <p>No saved connections found.</p>
                <p>Create a connection in the Database Connection page first.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="explorer-content">
            <div className="connection-info">
              <div className="connection-status">
                <span className="status-indicator connected"></span>
                <span>Connected to: <strong>{selectedConnection?.name}</strong></span>
                <span className="session-id">Session: {sparkSession?.sessionId}</span>
              </div>
              <div className="connection-actions">
                <button 
                  onClick={refreshTables}
                  disabled={isLoadingTables}
                  className="refresh-btn"
                >
                  {isLoadingTables ? 'Loading...' : 'Refresh Tables'}
                </button>
                <button 
                  onClick={disconnectFromDatabase}
                  className="disconnect-btn"
                >
                  Disconnect
                </button>
              </div>
            </div>

            <div className="tables-section">
              <h3>Database Tables ({tables.length})</h3>
              
              {isLoadingTables ? (
                <div className="loading-tables">
                  <div className="spinner"></div>
                  <span>Loading tables...</span>
                </div>
              ) : (
                <div className="tables-list">
                  {tables.map((table) => {
                    const tableKey = `${table.schema}.${table.name}`
                    const isExpanded = expandedTables.has(tableKey)
                    const schema = tableSchemas[tableKey]
                    
                    return (
                      <div key={tableKey} className="table-item">
                        <div 
                          className="table-header"
                          onClick={() => toggleTableExpansion(table.name, table.schema)}
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="expand-icon" />
                          ) : (
                            <ChevronRightIcon className="expand-icon" />
                          )}
                          <span className="table-name">{table.name}</span>
                          <span className="table-schema">({table.schema})</span>
                          <span className="table-type">{table.type}</span>
                        </div>
                        
                        {isExpanded && (
                          <div className="table-details">
                            {schema ? (
                              <div className="schema-columns">
                                {schema.map((column, index) => (
                                  <div key={index} className="column-row">
                                    <span className="column-name">{column.name}</span>
                                    <span className="column-type">{column.type}</span>
                                    <span className="column-nullable">
                                      {column.nullable ? 'NULL' : 'NOT NULL'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="loading-schema">Loading schema...</div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  
                  {tables.length === 0 && (
                    <div className="no-tables">
                      No tables found in this database.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Console
        logs={logs}
        isVisible={isConsoleVisible}
        onToggle={setIsConsoleVisible}
        title="Spark Output"
        height="250px"
        allowClear={true}
      />
    </div>
  )
}

export default SparkDatabaseExplorer
