import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'

// Import components
import ConnectionPage from './components/ConnectionPage'
import SparkExplorerPro from './components/spark/SparkExplorerProNew'
import SparkTableExport from './components/spark/SparkTableExport'
import SparkRuntimeManager from './components/spark/SparkRuntimeManager'
import DatabaseDashboard from './components/database/DatabaseDashboard'
import TableMapping from './components/TableMapping'
import TransferMonitor from './components/TransferMonitor'
import Console from './components/shared/Console'
import ErrorBoundary from './components/shared/ErrorBoundary'
import ThemeProvider from './components/ui/ThemeProvider'

// Simple Router Component
const Router = ({ currentPage, children }) => {
  return (
    <div className="router">
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.props.name === currentPage) {
          return child.props.children
        }
        return null
      })}
    </div>
  )
}

const Page = ({ name, children }) => children

function App() {
  console.log('App component rendering...')
  
  // State management
  const [currentPage, setCurrentPage] = useState('connection')
  const [dbConfig, setDbConfig] = useState(null)
  const [sparkSession, setSparkSession] = useState(null)
  const [sparkStatus, setSparkStatus] = useState('stopped')
  const [consoleMessages, setConsoleMessages] = useState([])
  const [consoleVisible, setConsoleVisible] = useState(false)

  // Console logging function
  const addConsoleMessage = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setConsoleMessages(prev => [...prev, { message, type, timestamp }])
    // Don't auto-show console, let user decide when to view it
  }, [])

  // Connection handlers
  const handleConnect = useCallback((config) => {
    console.log('Connecting with config:', config)
    setDbConfig(config)
    addConsoleMessage(`Connected to ${config.type} database: ${config.host}:${config.port}`, 'success')
    setCurrentPage('dashboard')
  }, [addConsoleMessage])

  const handleSparkConnect = useCallback((config) => {
    console.log('Spark connection with config:', config)
    
    // Ensure config has all required properties for DatabaseDashboard
    const connectedConfig = { 
      ...config, 
      connected: true, 
      sparkConnected: true,
      // Ensure required properties exist
      type: config.type || 'unknown',
      host: config.host || 'localhost',
      database: config.database || 'unknown',
      port: config.port || '1433'
    }
    
    console.log('Setting dbConfig to:', connectedConfig)
    setDbConfig(connectedConfig)
    addConsoleMessage(`Spark connected to ${config.type || 'unknown'} database: ${config.host || 'localhost'}:${config.port || '1433'}`, 'success')
    // Don't change page - stay on spark-explorer
  }, [addConsoleMessage])

  const handleDisconnect = useCallback(async () => {
    console.log('Disconnecting...')
    try {
      if (window.electronAPI?.disconnectDatabase) {
        await window.electronAPI.disconnectDatabase()
      }
      if (sparkSession) {
        if (window.electronAPI?.stopSparkSession) {
          await window.electronAPI.stopSparkSession()
        }
        setSparkSession(null)
        setSparkStatus('stopped')
      }
      addConsoleMessage('Disconnected from database and stopped Spark session', 'info')
    } catch (error) {
      console.error('Disconnect error:', error)
      addConsoleMessage(`Disconnect error: ${error.message}`, 'error')
    }
    setDbConfig(null)
    setCurrentPage('connection')
  }, [sparkSession, addConsoleMessage])

  // Navigation handlers
  const handleNavigateToSparkExplorer = useCallback(() => {
    console.log('Navigating to Spark Explorer')
    setCurrentPage('spark-explorer')
  }, [])

  const handleNavigateToDatabaseExplorer = useCallback(() => {
    console.log('Navigating to Database Explorer')
    console.log('Current dbConfig:', dbConfig)
    
    // Allow navigation even if dbConfig is incomplete - DatabaseDashboard will handle it
    if (!dbConfig) {
      console.warn('WARNING: dbConfig is null, navigating anyway...')
      addConsoleMessage('Warning: No database connection info available', 'warning')
    }
    
    setCurrentPage('database-explorer')
  }, [dbConfig, addConsoleMessage])

  const handleBackToConnection = useCallback(() => {
    console.log('Going back to connection')
    setCurrentPage('connection')
  }, [])

  const handleNavigateToRuntime = useCallback(() => {
    console.log('Navigating to Spark Runtime Manager')
    setCurrentPage('runtime')
  }, [])

  const handleNavigateToSpark = useCallback(() => {
    console.log('Navigating to Spark Table Export')
    setCurrentPage('spark-table-export')
  }, [])

  // Spark session handlers
  const handleSparkSessionChange = useCallback((session, status) => {
    console.log('Spark session changed:', { session, status })
    setSparkSession(session)
    if (status) {
      setSparkStatus(status)
    }
    if (status === 'running' || status === 'active') {
      addConsoleMessage('Spark session started successfully', 'success')
    } else if (status === 'stopped') {
      addConsoleMessage('Spark session stopped', 'info')
    } else if (status === 'error') {
      addConsoleMessage('Spark session error', 'error')
    }
  }, [addConsoleMessage])

  // Clear console messages
  const clearConsole = useCallback(() => {
    setConsoleMessages([])
  }, [])

  // Toggle console visibility
  const toggleConsole = useCallback(() => {
    setConsoleVisible(prev => !prev)
  }, [])

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="app" style={{ 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          background: '#f5f5f5' 
        }}>
        {/* Main content area */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto',
          height: '100%',
          paddingBottom: consoleVisible ? '0' : '0'
        }}>
          <Router currentPage={currentPage}>
            <Page name="connection">
              <ConnectionPage
                onConnect={handleConnect}
                onNavigateToSparkExplorer={handleNavigateToSparkExplorer}
                onNavigateToRuntime={handleNavigateToRuntime}
                onNavigateToSpark={handleNavigateToSpark}
                addConsoleMessage={addConsoleMessage}
              />
            </Page>
            
            <Page name="dashboard">
              <DatabaseDashboard
                config={dbConfig}
                onDisconnect={handleDisconnect}
                onNavigateToSparkExplorer={handleNavigateToSparkExplorer}
                onBackToConnection={handleBackToConnection}
                addConsoleMessage={addConsoleMessage}
              />
            </Page>
            
            <Page name="spark-explorer">
              <SparkExplorerPro
                dbConfig={dbConfig}
                sparkSession={sparkSession}
                sparkStatus={sparkStatus}
                onSparkSessionChange={handleSparkSessionChange}
                onNavigateToDatabaseExplorer={handleNavigateToDatabaseExplorer}
                onBackToConnection={handleBackToConnection}
                onConnect={handleSparkConnect}
                addConsoleMessage={addConsoleMessage}
              />
            </Page>
            
            <Page name="database-explorer">
              <DatabaseDashboard
                config={dbConfig}
                onDisconnect={handleDisconnect}
                onNavigateToSparkExplorer={handleNavigateToSparkExplorer}
                onBackToSparkExplorer={handleNavigateToSparkExplorer}
                onBackToConnection={handleBackToConnection}
                addConsoleMessage={addConsoleMessage}
                showBackToSpark={true}
              />
            </Page>
            
            <Page name="runtime">
              <SparkRuntimeManager
                onBackToConnection={handleBackToConnection}
                addConsoleMessage={addConsoleMessage}
              />
            </Page>
            
            <Page name="spark-table-export">
              <SparkTableExport
                onBackToConnection={handleBackToConnection}
                addConsoleMessage={addConsoleMessage}
              />
            </Page>
            
            <Page name="table-mapping">
              <TableMapping
                dbConfig={dbConfig}
                onBackToConnection={handleBackToConnection}
                addConsoleMessage={addConsoleMessage}
              />
            </Page>
            
            <Page name="transfer-monitor">
              <TransferMonitor
                onBackToConnection={handleBackToConnection}
                addConsoleMessage={addConsoleMessage}
              />
            </Page>
          </Router>
        </div>

        {/* Console Toggle Button - only show when there are messages */}
        {consoleMessages.length > 0 && (
          <button
            onClick={toggleConsole}
            style={{
              position: 'fixed',
              bottom: consoleVisible ? '220px' : '20px',
              right: '20px',
              zIndex: 1001,
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
            title={consoleVisible ? 'Hide Console' : `Show Console (${consoleMessages.length} messages)`}
          >
            {consoleVisible ? '📤' : '📋'}
            {!consoleVisible && consoleMessages.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#dc3545',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {consoleMessages.length > 9 ? '9+' : consoleMessages.length}
              </span>
            )}
          </button>
        )}

        {/* Console component - only render when visible */}
        {consoleVisible && (
          <Console
            messages={consoleMessages}
            visible={consoleVisible}
            onToggle={toggleConsole}
            onClear={clearConsole}
          />
        )}
      </div>
    </ErrorBoundary>
    </ThemeProvider>
  )
}

console.log('🏗️ Creating React root...')
const container = document.getElementById('root')
console.log('📍 Root container:', container)

if (container) {
  const root = createRoot(container)
  console.log('⚡ Rendering App...')
  root.render(<App />)
  console.log('✅ App rendered successfully!')
} else {
  console.error('❌ Could not find root container!')
}
