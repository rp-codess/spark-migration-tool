import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import ThemeProvider from './components/ui/ThemeProvider'
import ErrorBoundary from './components/ErrorBoundary'
import Router, { Page } from './components/Router'
import ConnectionPage from './components/ConnectionPage'
import DatabaseDashboard from './components/DatabaseDashboard'
// import performanceMonitor, { optimizeForSlowDevices } from './utils/performanceMonitor'
import './styles/globals.css'

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

  // Memoize components to prevent unnecessary re-renders
  const connectionPage = useMemo(() => (
    <ConnectionPage onConnect={handleConnect} />
  ), [handleConnect])

  const dashboardPage = useMemo(() => (
    <DatabaseDashboard config={dbConfig} onDisconnect={handleDisconnect} />
  ), [dbConfig, handleDisconnect])

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
          </Router>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App />)
