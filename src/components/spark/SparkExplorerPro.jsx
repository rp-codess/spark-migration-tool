import React, { useState, useEffect, useCallback } from 'react'
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  PlayIcon, 
  StopIcon, 
  CircleStackIcon,
  TableCellsIcon,
  EyeIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CloudIcon,
  ServerIcon,
  Cog6ToothIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import Console from '../shared/Console'
import './SparkExplorerPro.css'

const SparkExplorerPro = ({ 
  dbConfig,
  sparkSession: propSparkSession,
  sparkStatus: propSparkStatus,
  onSparkSessionChange,
  onNavigateToDatabaseExplorer,
  onBackToConnection,
  onConnect,
  addConsoleMessage
}) => {
  // Connection and Spark state
  const [savedConnections, setSavedConnections] = useState([])
  const [selectedConnection, setSelectedConnection] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [sparkSession, setSparkSession] = useState(propSparkSession)
  const [sparkStatus, setSparkStatus] = useState(propSparkStatus || 'inactive') // inactive, starting, active, error
  
  // Database exploration state
  const [databases, setDatabases] = useState([])
  const [selectedDatabase, setSelectedDatabase] = useState(null)
  const [tables, setTables] = useState([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [expandedItems, setExpandedItems] = useState(new Set())
  const [tableSchemas, setTableSchemas] = useState({})
  const [tablePreview, setTablePreview] = useState({})
  
  // UI state
  const [logs, setLogs] = useState([])
  const [isConsoleVisible, setIsConsoleVisible] = useState(true)
  const [activeTab, setActiveTab] = useState('explorer') // explorer, monitor, settings
  const [searchTerm, setSearchTerm] = useState('')

  // Load saved connections on component mount
  useEffect(() => {
    loadSavedConnections()
    addLog('Spark Explorer Pro initialized', 'info')
  }, [])

  // Sync with parent props
  useEffect(() => {
    if (propSparkSession) {
      setSparkSession(propSparkSession)
      setIsConnected(true)
      setSparkStatus('active')
    }
  }, [propSparkSession])

  useEffect(() => {
    if (propSparkStatus) {
      setSparkStatus(propSparkStatus)
    }
  }, [propSparkStatus])

  // Set initial connection from dbConfig
  useEffect(() => {
    if (dbConfig && !selectedConnection) {
      setSelectedConnection(dbConfig)
      if (dbConfig.connected) {
        setIsConnected(true)
        setSparkStatus('active')
      }
    }
  }, [dbConfig, selectedConnection])

  const addLog = useCallback((message, type = 'info', level = null) => {
    const newLog = {
      timestamp: Date.now(),
      message,
      type,
      level: level || type.toUpperCase()
    }
    setLogs(prev => [...prev, newLog])
    
    // Also send to parent console if available
    if (addConsoleMessage) {
      addConsoleMessage(message, type.toUpperCase())
    }
  }, [addConsoleMessage])

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
        setSavedConnections(result.configs || [])
        addLog(`Loaded ${result.configs?.length || 0} saved connections`, 'success')
      } else {
        addLog(`Failed to load connections: ${result.message}`, 'error')
      }
    } catch (error) {
      addLog(`Error loading connections: ${error.message}`, 'error')
    }
  }

  const connectToDatabase = async (connection) => {
    if (!connection) return

    setIsConnecting(true)
    setSparkStatus('starting')
    addLog(`Connecting to ${connection.name} (${connection.type})...`, 'info')

    try {
      // Connect to database using Spark
      const sparkResult = await window.electronAPI.invoke('spark:connect-database', connection)

      if (sparkResult.success) {
        setSparkSession(sparkResult.session)
        setSparkStatus('active')
        setIsConnected(true)
        setSelectedConnection(connection)
        addLog(`Connected to ${connection.name} successfully!`, 'success')
        
        // Notify parent component
        if (onSparkSessionChange) {
          onSparkSessionChange(sparkResult.session)
        }
        if (onConnect) {
          onConnect(connection)
        }
        
        // Load databases
        await loadDatabases()
      } else {
        throw new Error(sparkResult.message || 'Failed to start Spark session')
      }
    } catch (error) {
      addLog(`Connection failed: ${error.message}`, 'error')
      setSparkStatus('error')
      setIsConnected(false)
      setSparkSession(null)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectFromDatabase = async () => {
    if (!sparkSession) return

    try {
      addLog('Disconnecting from database...', 'info')
      await window.electronAPI.invoke('spark:disconnect', sparkSession.sessionId)
      
      setIsConnected(false)
      setSparkSession(null)
      setSelectedConnection(null)
      setSparkStatus('inactive')
      setDatabases([])
      setTables([])
      setSelectedDatabase(null)
      setTableSchemas({})
      setTablePreview({})
      setExpandedItems(new Set())
      
      addLog('Disconnected successfully', 'success')
    } catch (error) {
      addLog(`Error during disconnect: ${error.message}`, 'error')
    }
  }

  const loadDatabases = async () => {
    if (!sparkSession) return

    try {
      addLog('Loading databases...', 'info')
      const result = await window.electronAPI.invoke('spark:get-databases', sparkSession.sessionId)
      
      if (result.success) {
        setDatabases(result.databases || [])
        addLog(`Found ${result.databases?.length || 0} databases`, 'success')
        
        // Auto-select first database if available
        if (result.databases?.length > 0) {
          setSelectedDatabase(result.databases[0])
          await loadTables(result.databases[0])
        }
      } else {
        addLog(`Failed to load databases: ${result.message}`, 'error')
      }
    } catch (error) {
      addLog(`Error loading databases: ${error.message}`, 'error')
    }
  }

  const loadTables = async (database) => {
    if (!sparkSession || !database) return

    setIsLoadingTables(true)
    try {
      addLog(`Loading tables from ${database}...`, 'info')
      const result = await window.electronAPI.invoke('spark:get-tables', sparkSession.sessionId, { database })
      
      if (result.success) {
        setTables(result.tables || [])
        addLog(`Found ${result.tables?.length || 0} tables in ${database}`, 'success')
      } else {
        addLog(`Failed to load tables: ${result.message}`, 'error')
      }
    } catch (error) {
      addLog(`Error loading tables: ${error.message}`, 'error')
    } finally {
      setIsLoadingTables(false)
    }
  }

  const loadTableSchema = async (tableName) => {
    if (!sparkSession || !selectedDatabase) return

    try {
      addLog(`Loading schema for ${tableName}...`, 'info')
      const result = await window.electronAPI.invoke('spark:get-table-schema', {
        sessionId: sparkSession.sessionId,
        database: selectedDatabase,
        table: tableName
      })
      
      if (result.success) {
        setTableSchemas(prev => ({
          ...prev,
          [tableName]: result.schema
        }))
        addLog(`Schema loaded for ${tableName}`, 'success')
      } else {
        addLog(`Failed to load schema for ${tableName}: ${result.message}`, 'error')
      }
    } catch (error) {
      addLog(`Error loading schema for ${tableName}: ${error.message}`, 'error')
    }
  }

  const previewTable = async (tableName) => {
    if (!sparkSession || !selectedDatabase) return

    try {
      addLog(`Loading preview for ${tableName}...`, 'info')
      const result = await window.electronAPI.invoke('spark:preview-table', {
        sessionId: sparkSession.sessionId,
        database: selectedDatabase,
        table: tableName,
        limit: 10
      })
      
      if (result.success) {
        setTablePreview(prev => ({
          ...prev,
          [tableName]: result.data
        }))
        addLog(`Preview loaded for ${tableName}`, 'success')
      } else {
        addLog(`Failed to load preview for ${tableName}: ${result.message}`, 'error')
      }
    } catch (error) {
      addLog(`Error loading preview for ${tableName}: ${error.message}`, 'error')
    }
  }

  const toggleExpanded = (item) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(item)) {
      newExpanded.delete(item)
    } else {
      newExpanded.add(item)
      
      // Load data when expanding
      if (tables.includes(item)) {
        loadTableSchema(item)
      }
    }
    setExpandedItems(newExpanded)
  }

  const filteredTables = tables.filter(table => 
    table.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusIcon = () => {
    switch (sparkStatus) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'starting':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      default:
        return <CloudIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (sparkStatus) {
      case 'active':
        return 'Connected'
      case 'starting':
        return 'Connecting...'
      case 'error':
        return 'Connection Error'
      default:
        return 'Not Connected'
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <ServerIcon style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
          <h1 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1e293b',
            margin: '0'
          }}>Spark Explorer Pro</h1>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px'
        }}>
          {getStatusIcon()}
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: sparkStatus === 'active' ? '#059669' : 
                   sparkStatus === 'starting' ? '#0284c7' : 
                   sparkStatus === 'error' ? '#dc2626' : '#64748b'
          }}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 20px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            color: '#64748b',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => onBackToConnection && onBackToConnection()}
        >
          <ArrowLeftIcon style={{ width: '14px', height: '14px' }} />
          Back to Connections
        </button>
        
        <button 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => onNavigateToDatabaseExplorer && onNavigateToDatabaseExplorer()}
        >
          <CircleStackIcon className="w-4 h-4" />
          Database Explorer
        </button>
        
        {selectedDatabase && (
          <button 
            className="nav-button get-tables-btn"
            onClick={() => loadTables(selectedDatabase)}
            disabled={isLoadingTables}
          >
            <TableCellsIcon className="w-4 h-4" />
            {isLoadingTables ? 'Loading...' : 'Get Tables'}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="explorer-content">
        {/* Sidebar */}
        <div className="explorer-sidebar">
          {/* Connection Panel */}
          <div className="connection-panel">
            <h3>
              <CircleStackIcon className="w-5 h-5" />
              Database Connection
            </h3>
            
            {!isConnected ? (
              <div className="connection-list">
                {savedConnections.length === 0 ? (
                  <p className="no-connections">No saved connections found</p>
                ) : (
                  savedConnections.map((conn, index) => (
                    <div 
                      key={index} 
                      className="connection-item"
                      onClick={() => connectToDatabase(conn)}
                    >
                      <div className="connection-info">
                        <span className="connection-name">{conn.name}</span>
                        <span className="connection-type">{conn.type}</span>
                      </div>
                      <PlayIcon className="w-4 h-4 text-blue-500" />
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="active-connection">
                <div className="connection-details">
                  <span className="connection-name">{selectedConnection?.name}</span>
                  <span className="connection-type">{selectedConnection?.type}</span>
                </div>
                <button 
                  className="disconnect-btn"
                  onClick={disconnectFromDatabase}
                >
                  <StopIcon className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Database Explorer */}
          {isConnected && (
            <div className="database-explorer">
              <div className="explorer-header-section">
                <h3>
                  <TableCellsIcon className="w-5 h-5" />
                  Database Explorer
                </h3>
                
                {databases.length > 1 && (
                  <select 
                    value={selectedDatabase || ''}
                    onChange={(e) => {
                      setSelectedDatabase(e.target.value)
                      loadTables(e.target.value)
                    }}
                    className="database-select"
                  >
                    {databases.map(db => (
                      <option key={db} value={db}>{db}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Get Tables Button */}
              {selectedDatabase && (
                <button 
                  className="get-tables-btn"
                  onClick={() => loadTables(selectedDatabase)}
                  disabled={isLoadingTables}
                >
                  <ArrowPathIcon className={`w-4 h-4 ${isLoadingTables ? 'animate-spin' : ''}`} />
                  {isLoadingTables ? 'Loading...' : 'Get Tables'}
                </button>
              )}

              {/* Search */}
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search tables..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Tables List */}
              <div className="tables-list">
                {isLoadingTables ? (
                  <div className="loading-indicator">
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Loading tables...
                  </div>
                ) : filteredTables.length === 0 ? (
                  <p className="no-tables">No tables found</p>
                ) : (
                  filteredTables.map(table => (
                    <div key={table} className="table-item">
                      <div 
                        className="table-header"
                        onClick={() => toggleExpanded(table)}
                      >
                        {expandedItems.has(table) ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4" />
                        )}
                        <TableCellsIcon className="w-4 h-4 text-blue-500" />
                        <span className="table-name">{table}</span>
                        <button 
                          className="preview-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            previewTable(table)
                          }}
                          title="Preview data"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {expandedItems.has(table) && (
                        <div className="table-details">
                          {tableSchemas[table] ? (
                            <div className="schema-info">
                              <h4>Schema:</h4>
                              <div className="schema-columns">
                                {tableSchemas[table].map((col, index) => (
                                  <div key={index} className="column-info">
                                    <span className="column-name">{col.name}</span>
                                    <span className="column-type">{col.type}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="loading-schema">Loading schema...</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Panel */}
        <div className="explorer-main">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('explorer')}
            >
              <CircleStackIcon className="w-4 h-4" />
              Explorer
            </button>
            <button 
              className={`tab ${activeTab === 'monitor' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitor')}
            >
              <InformationCircleIcon className="w-4 h-4" />
              Monitor
            </button>
            <button 
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'explorer' && (
              <div className="explorer-tab">
                {!isConnected ? (
                  <div className="welcome-screen">
                    <CloudIcon className="w-16 h-16 text-gray-300 mb-4" />
                    <h2>Welcome to Spark Explorer Pro</h2>
                    <p>Connect to a database to start exploring your data with Apache Spark</p>
                  </div>
                ) : (
                  <div className="data-explorer">
                    {/* Table Previews */}
                    {Object.entries(tablePreview).map(([tableName, data]) => (
                      <div key={tableName} className="table-preview-card">
                        <h3>{tableName} Preview</h3>
                        {data && data.length > 0 ? (
                          <div className="preview-table">
                            <table>
                              <thead>
                                <tr>
                                  {Object.keys(data[0]).map(col => (
                                    <th key={col}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {data.map((row, index) => (
                                  <tr key={index}>
                                    {Object.values(row).map((value, i) => (
                                      <td key={i}>{String(value)}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p>No data available</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'monitor' && (
              <div className="monitor-tab">
                <h3>Spark Session Monitor</h3>
                <div className="session-info">
                  <div className="info-card">
                    <h4>Session Status</h4>
                    <div className="status-display">
                      {getStatusIcon()}
                      <span>{getStatusText()}</span>
                    </div>
                  </div>
                  
                  {selectedConnection && (
                    <div className="info-card">
                      <h4>Connection Details</h4>
                      <div className="connection-details-display">
                        <p><strong>Name:</strong> {selectedConnection.name}</p>
                        <p><strong>Type:</strong> {selectedConnection.type}</p>
                        <p><strong>Host:</strong> {selectedConnection.host}</p>
                        <p><strong>Database:</strong> {selectedDatabase}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="settings-tab">
                <h3>Spark Configuration</h3>
                <div className="settings-section">
                  <h4>Console Settings</h4>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isConsoleVisible}
                      onChange={(e) => setIsConsoleVisible(e.target.checked)}
                    />
                    Show Console
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Console */}
      {isConsoleVisible && (
        <div className="console-container">
          <Console 
            logs={logs}
            onClear={clearLogs}
            title="Spark Explorer Console"
          />
        </div>
      )}
    </div>
  )
}

export default SparkExplorerPro
