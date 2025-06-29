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
  // State
  const [savedConnections, setSavedConnections] = useState([])
  const [selectedConnection, setSelectedConnection] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [sparkSession, setSparkSession] = useState(propSparkSession)
  const [sparkStatus, setSparkStatus] = useState(propSparkStatus || 'inactive')
  const [databases, setDatabases] = useState([])
  const [selectedDatabase, setSelectedDatabase] = useState(null)
  const [tables, setTables] = useState([])
  const [isLoadingTables, setIsLoadingTables] = useState(false)
  const [logs, setLogs] = useState([])
  const [isConsoleVisible, setIsConsoleVisible] = useState(true)

  const addLog = useCallback((message, type = 'info', level = null) => {
    const newLog = {
      timestamp: Date.now(),
      message,
      type,
      level: level || type.toUpperCase()
    }
    setLogs(prev => [...prev, newLog])
    
    if (addConsoleMessage) {
      addConsoleMessage(message, type.toUpperCase())
    }
  }, [addConsoleMessage])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // Load saved connections on mount
  useEffect(() => {
    loadSavedConnections()
    addLog('Spark Explorer Pro initialized', 'info')
  }, [])

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
      const sparkResult = await window.electronAPI.invoke('spark:connect-database', connection)

      if (sparkResult.success) {
        setSparkSession(sparkResult.session)
        setSparkStatus('active')
        setIsConnected(true)
        setSelectedConnection(connection)
        addLog(`Connected to ${connection.name} successfully!`, 'success')
        
        // ALSO establish a regular database connection for DatabaseDashboard
        try {
          addLog('Establishing regular database connection...', 'info')
          const regularDbResult = await window.electronAPI.invoke('connect-database', connection)
          if (regularDbResult.success) {
            addLog('Regular database connection established successfully', 'success')
          } else {
            addLog(`Regular DB connection warning: ${regularDbResult.message}`, 'warning')
          }
        } catch (dbError) {
          addLog(`Regular DB connection warning: ${dbError.message}`, 'warning')
        }
        
        if (onSparkSessionChange) {
          onSparkSessionChange(sparkResult.session)
        }
        if (onConnect) {
          onConnect(connection)
        }
        
        await loadDatabases(sparkResult.session)
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

  const loadDatabases = async (session = sparkSession) => {
    if (!session) {
      addLog('Cannot load databases: No session available', 'error')
      return
    }

    try {
      addLog('Loading databases...', 'info')
      addLog(`Using session: ${JSON.stringify(session)}`, 'info')
      
      const sessionId = session.sessionId || session
      const result = await window.electronAPI.invoke('spark:get-databases', sessionId)
      
      addLog(`Database query result: ${JSON.stringify(result)}`, 'info')
      
      if (result.success) {
        setDatabases(result.databases || [])
        addLog(`Found ${result.databases?.length || 0} databases`, 'success')
        
        if (result.databases?.length > 0) {
          setSelectedDatabase(result.databases[0])
          await loadTables(result.databases[0], session)
        }
      } else {
        addLog(`Failed to load databases: ${result.message}`, 'error')
      }
    } catch (error) {
      addLog(`Error loading databases: ${error.message}`, 'error')
    }
  }

  const loadTables = async (database, session = sparkSession) => {
    if (!session || !database) {
      addLog(`Cannot load tables: Missing session (${!!session}) or database (${!!database})`, 'error')
      return
    }

    setIsLoadingTables(true)
    try {
      addLog(`Loading tables from ${database}...`, 'info')
      
      const sessionId = session.sessionId || session
      addLog(`Using session ID: ${sessionId} for database: ${database}`, 'info')
      
      const result = await window.electronAPI.invoke('spark:get-tables', sessionId, { database })
      
      addLog(`Tables query result: ${JSON.stringify(result)}`, 'info')
      
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

  const getStatusIcon = () => {
    const iconStyle = { width: '16px', height: '16px' }
    switch (sparkStatus) {
      case 'active':
        return <CheckCircleIcon style={{ ...iconStyle, color: '#22c55e' }} />
      case 'starting':
        return <ArrowPathIcon style={{ ...iconStyle, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
      case 'error':
        return <ExclamationTriangleIcon style={{ ...iconStyle, color: '#ef4444' }} />
      default:
        return <CloudIcon style={{ ...iconStyle, color: '#94a3b8' }} />
    }
  }

  const getStatusText = () => {
    switch (sparkStatus) {
      case 'active': return 'Connected'
      case 'starting': return 'Connecting...'
      case 'error': return 'Connection Error'
      default: return 'Not Connected'
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ServerIcon style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
          <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0' }}>
            Spark Explorer Pro
          </h1>
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
            cursor: 'pointer'
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
            backgroundColor: isConnected ? '#3b82f6' : '#94a3b8',
            color: 'white',
            border: '1px solid ' + (isConnected ? '#3b82f6' : '#94a3b8'),
            borderRadius: '6px',
            fontSize: '14px',
            cursor: isConnected ? 'pointer' : 'not-allowed',
            opacity: isConnected ? '1' : '0.6'
          }}
          onClick={() => {
            if (isConnected && selectedConnection && onNavigateToDatabaseExplorer) {
              onNavigateToDatabaseExplorer()
            } else {
              addLog('Please connect to a database first', 'warning')
            }
          }}
          disabled={!isConnected}
        >
          <CircleStackIcon style={{ width: '14px', height: '14px' }} />
          Database Explorer
        </button>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#f1f5f9',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#64748b'
          }}>
            <InformationCircleIcon style={{ width: '14px', height: '14px' }} />
            Tables: {tables.length}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: '1', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: '320px',
          backgroundColor: 'white',
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto'
        }}>
          {/* Connection Panel */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e2e8f0'
          }}>
            <h3 style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              <CircleStackIcon style={{ width: '16px', height: '16px' }} />
              Database Connection
            </h3>
            
            {!isConnected ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {savedConnections.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', padding: '20px' }}>
                    No saved connections found
                  </p>
                ) : (
                  savedConnections.map((conn, index) => (
                    <div 
                      key={index} 
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      onClick={() => connectToDatabase(conn)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: '500', color: '#1e293b', fontSize: '14px' }}>
                          {conn.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                          {conn.type}
                        </span>
                      </div>
                      <PlayIcon style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #d1fae5',
                  borderRadius: '6px'
                }}>
                  <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '14px' }}>
                    {selectedConnection?.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {selectedConnection?.type}
                  </div>
                </div>
                <button 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setIsConnected(false)
                    setSparkSession(null)
                    setSelectedConnection(null)
                    setSparkStatus('inactive')
                    setDatabases([])
                    setTables([])
                  }}
                >
                  <StopIcon style={{ width: '14px', height: '14px' }} />
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Database Explorer */}
          {isConnected && (
            <div style={{ padding: '16px', flex: '1', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  <TableCellsIcon style={{ width: '16px', height: '16px' }} />
                  Database Explorer
                </h3>
              </div>

              {/* Get Tables Button */}
              {selectedDatabase && (
                <button 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginBottom: '12px',
                    opacity: isLoadingTables ? '0.6' : '1'
                  }}
                  onClick={() => loadTables(selectedDatabase, sparkSession)}
                  disabled={isLoadingTables}
                >
                  <ArrowPathIcon style={{
                    width: '14px', 
                    height: '14px',
                    animation: isLoadingTables ? 'spin 1s linear infinite' : 'none'
                  }} />
                  {isLoadingTables ? 'Loading...' : 'Get Tables'}
                </button>
              )}

              {/* Tables List */}
              <div style={{ flex: '1', overflowY: 'auto' }}>
                {isLoadingTables ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px',
                    color: '#64748b',
                    fontSize: '14px'
                  }}>
                    <ArrowPathIcon style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                    Loading tables...
                  </div>
                ) : tables.length === 0 ? (
                  <p style={{
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '14px',
                    padding: '20px'
                  }}>
                    No tables found
                  </p>
                ) : (
                  tables.map(table => (
                    <div key={table} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 10px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      marginBottom: '4px',
                      cursor: 'pointer'
                    }}>
                      <TableCellsIcon style={{ width: '14px', height: '14px', color: '#3b82f6' }} />
                      <span style={{
                        flex: '1',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151'
                      }}>
                        {table}
                      </span>
                      <button 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#64748b'
                        }}
                        title="Preview data"
                      >
                        <EyeIcon style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Panel */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            flex: '1',
            overflowY: 'auto',
            backgroundColor: 'white',
            padding: '20px'
          }}>
            {!isConnected ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <CloudIcon style={{ width: '64px', height: '64px', marginBottom: '16px' }} />
                <h2 style={{ fontSize: '20px', color: '#374151', margin: '0 0 8px 0' }}>
                  Welcome to Spark Explorer Pro
                </h2>
                <p style={{ fontSize: '14px', margin: '0' }}>
                  Connect to a database to start exploring your data with Apache Spark
                </p>
              </div>
            ) : (
              <div>
                <h3>Connected to {selectedConnection?.name}</h3>
                <p>Database: {selectedDatabase}</p>
                <p>Tables found: {tables.length}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Console */}
      {isConsoleVisible && (
        <div style={{
          height: '200px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: 'white'
        }}>
          <Console 
            logs={logs}
            onClear={clearLogs}
            title="Spark Explorer Console"
          />
        </div>
      )}

      {/* Add keyframes for spin animation */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

export default SparkExplorerPro
