import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import ThemeProvider from './components/ui/ThemeProvider'
import ErrorBoundary from './components/ErrorBoundary'
import Router, { Page } from './components/Router'
import ConnectionPage from './components/ConnectionPage'
import DatabaseDashboard from './components/DatabaseDashboard'
import SparkRuntimeManager from './components/SparkRuntimeManager'
import SparkTableExport from './components/SparkTableExport'
// import performanceMonitor, { optimizeForSlowDevices } from './utils/performanceMonitor'
import './styles/globals.css'

// Suppress Ant Design React 19 compatibility warning
if (typeof console !== 'undefined') {
  const originalWarn = console.warn
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('[antd: compatible]')) {
      return // Suppress this specific warning
    }
    originalWarn.apply(console, args)
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState('connection')
  const [dbConfig, setDbConfig] = useState(null)

  // Initialize optimizations
  useEffect(() => {
    // Basic optimizations without heavy monitoring
    if (typeof window !== 'undefined') {
      // Reduce animation duration for better performance
      document.documentElement.style.setProperty('--animation-duration', '0.15s')
    }
  }, [])

  const handleConnect = useCallback((config) => {
    setDbConfig(config)
    setCurrentPage('dashboard')
  }, [])

  const handleDisconnect = useCallback(async () => {
    try {
      await window.electronAPI.disconnectDatabase()
    } catch (error) {
      console.error('Disconnect error:', error)
    }
    setDbConfig(null)
    setCurrentPage('connection')
  }, [])

  const handleNavigateToRuntime = useCallback(() => {
    setCurrentPage('runtime')
  }, [])

  const handleNavigateToConnection = useCallback(() => {
    setCurrentPage('connection')
  }, [])

  const handleNavigateToSpark = useCallback(() => {
    setCurrentPage('spark-export')
  }, [])

  // Memoize components to prevent unnecessary re-renders
  const connectionPage = useMemo(() => (
    <ConnectionPage 
      onConnect={handleConnect} 
      onNavigateToRuntime={handleNavigateToRuntime}
      onNavigateToSpark={handleNavigateToSpark}
    />
  ), [handleConnect, handleNavigateToRuntime, handleNavigateToSpark])

  const dashboardPage = useMemo(() => (
    <DatabaseDashboard config={dbConfig} onDisconnect={handleDisconnect} />
  ), [dbConfig, handleDisconnect])

  const runtimePage = useMemo(() => (
    <div>
      <div style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
        <button 
          onClick={handleNavigateToConnection}
          style={{
            padding: '0.5rem 1rem',
            background: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          ← Back to Connection
        </button>
        <button 
          onClick={handleNavigateToSpark}
          style={{
            padding: '0.5rem 1rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🚀 Spark Export
        </button>
      </div>
      <SparkRuntimeManager />
    </div>
  ), [handleNavigateToConnection, handleNavigateToSpark])

  const sparkExportPage = useMemo(() => (
    <div>
      <div style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
        <button 
          onClick={handleNavigateToConnection}
          style={{
            padding: '0.5rem 1rem',
            background: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          ← Back to Connection
        </button>
        <button 
          onClick={() => setCurrentPage('runtime')}
          style={{
            padding: '0.5rem 1rem',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔧 Runtime Manager
        </button>
      </div>
      <SparkTableExport />
    </div>
  ), [handleNavigateToConnection])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="app">
          <Router currentPage={currentPage}>
            <Page name="connection">
              {connectionPage}
            </Page>
            <Page name="dashboard">
              {dashboardPage}
            </Page>
            <Page name="runtime">
              {runtimePage}
            </Page>
            <Page name="spark-export">
              {sparkExportPage}
            </Page>
          </Router>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App />)
