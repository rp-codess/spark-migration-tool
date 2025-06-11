import React from 'react'
import { createRoot } from 'react-dom/client'
import ConnectionSetup from './components/ConnectionSetup'
import DatabaseExplorer from './components/DatabaseExplorer'
import TableMapping from './components/TableMapping'
import TransferMonitor from './components/TransferMonitor'
import SparkJobManager from './components/SparkJobManager'

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Spark Migration Tool</h1>
      <div style={{ display: 'grid', gap: '20px' }}>
        <ConnectionSetup />
        <DatabaseExplorer />
        <TableMapping />
        <TransferMonitor />
        <SparkJobManager />
      </div>
    </div>
  )
}

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App />)
