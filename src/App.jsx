import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import ThemeProvider from './components/ui/ThemeProvider'
import Router, { Page } from './components/Router'
import ConnectionPage from './components/ConnectionPage'
import DatabaseDashboard from './components/DatabaseDashboard'
import './styles/globals.css'

function App() {
  const [currentPage, setCurrentPage] = useState('connection')
  const [dbConfig, setDbConfig] = useState(null)

  const handleConnect = (config) => {
    setDbConfig(config)
    setCurrentPage('dashboard')
  }

  const handleDisconnect = async () => {
    try {
      await window.electronAPI.disconnectDatabase()
    } catch (error) {
      console.error('Disconnect error:', error)
    }
    setDbConfig(null)
    setCurrentPage('connection')
  }

  return (
    <ThemeProvider>
      <div className="app animate-fadeIn">
        <Router currentPage={currentPage}>
          <Page name="connection">
            <ConnectionPage onConnect={handleConnect} />
          </Page>
          <Page name="dashboard">
            <DatabaseDashboard config={dbConfig} onDisconnect={handleDisconnect} />
          </Page>
        </Router>
      </div>
    </ThemeProvider>
  )
}

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App />)
