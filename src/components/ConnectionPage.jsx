import React, { useState } from 'react'
import { DatabaseOutlined, FolderOpenOutlined, LockOutlined, CloudOutlined, CloseCircleOutlined, CheckCircleOutlined, RocketOutlined } from '@ant-design/icons'
import Button from './ui/Button'
import Loader from './ui/Loader'
import ThemeToggle from './ui/ThemeToggle'
import SavedConnectionsModal from './SavedConnectionsModal'
import ConnectionSaver from './ConnectionSaver'

export default function ConnectionPage({ onConnect, onNavigateToRuntime, onNavigateToSpark }) {
  const [config, setConfig] = useState({
    type: 'mssql',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    schema: '',
    ssl: false,
    sslMode: 'prefer'
  })
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [showSavedConnections, setShowSavedConnections] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const databaseTypes = [
    { value: 'mssql', label: 'Microsoft SQL Server', defaultPort: '1433' },
    { value: 'postgresql', label: 'PostgreSQL', defaultPort: '5432' },
    { value: 'mysql', label: 'MySQL', defaultPort: '3306' },
    { value: 'oracle', label: 'Oracle', defaultPort: '1521' }
  ]

  const handleTypeChange = (type) => {
    const dbType = databaseTypes.find(db => db.value === type)
    setConfig({
      ...config,
      type,
      port: dbType.defaultPort
    })
  }

  const handleConfigChange = (field, value) => {
    const newConfig = { ...config, [field]: value }
    
    if (field === 'host') {
      if (value.includes('.database.windows.net')) {
        newConfig.ssl = true
        newConfig.port = '1433'
      } else if (value.includes('.postgres.database.azure.com')) {
        newConfig.ssl = true
        newConfig.sslMode = 'require'
        newConfig.port = '5432'
      }
    }
    
    setConfig(newConfig)
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError('')
    
    try {
      const result = await window.electronAPI.connectDatabase(config)
      if (result.success) {
        onConnect(config)
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setConnecting(false)
    }
  }

  const handleLoadConnection = (loadedConfig) => {
    // Properly set all config fields including defaults
    setConfig({
      type: loadedConfig.type || 'mssql',
      host: loadedConfig.host || '',
      port: loadedConfig.port || '',
      database: loadedConfig.database || '',
      username: loadedConfig.username || '',
      password: loadedConfig.password || '',
      schema: loadedConfig.schema || '',
      ssl: loadedConfig.ssl || false,
      sslMode: loadedConfig.sslMode || 'prefer'
    })
    setError('') // Clear any existing errors
    // Show success message
    setSuccessMessage(`Loaded connection: ${loadedConfig.name || loadedConfig.host}`)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const handleSaveSuccess = (message) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const pageStyles = {
    minHeight: '100vh',
    background: 'var(--gradient-primary)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 20px',
    position: 'relative'
  }

  const cardStyles = {
    background: 'var(--bg-primary)',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: 'var(--shadow-lg)',
    maxWidth: '600px',
    width: '100%',
    position: 'relative',
    marginTop: '20px'
  }

  const inputStyles = {
    width: '100%',
    padding: '12px',
    border: '2px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    transition: 'border-color 0.2s ease'
  }

  return (
    <div style={pageStyles} className="animate-fadeIn">
      {/* Theme toggle in top right */}
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <ThemeToggle />
      </div>

      <div style={cardStyles} className="animate-scaleIn">
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            color: 'var(--text-primary)', 
            marginBottom: '8px', 
            fontSize: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <RocketOutlined /> Spark Migration Tool
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, marginBottom: '16px' }}>
            Connect to your database to get started
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
            <Button
              onClick={() => setShowSavedConnections(true)}
              variant="outline"
              size="sm"
              icon={<FolderOpenOutlined />}
            >
              View Saved Connections
            </Button>
            <Button
              onClick={onNavigateToRuntime}
              variant="outline"
              size="sm"
              icon={<RocketOutlined />}
            >
              Spark Runtime
            </Button>
            <Button
              onClick={onNavigateToSpark}
              variant="primary"
              size="sm"
              style={{ background: '#28a745', borderColor: '#28a745' }}
            >
              🚀 Spark Export
            </Button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'var(--color-success)',
            color: 'white', 
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircleOutlined /> {successMessage}
          </div>
        )}

        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Database Type
            </label>
            <select 
              value={config.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{
                ...inputStyles,
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              {databaseTypes.map(db => (
                <option key={db.value} value={db.value}>{db.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Host
              </label>
              <input 
                placeholder="Enter host address" 
                value={config.host}
                onChange={(e) => handleConfigChange('host', e.target.value)}
                style={inputStyles}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Port
              </label>
              <input 
                placeholder="Port" 
                value={config.port}
                onChange={(e) => setConfig({...config, port: e.target.value})}
                style={inputStyles}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Database
            </label>
            <input 
              placeholder="Database name" 
              value={config.database}
              onChange={(e) => setConfig({...config, database: e.target.value})}
              style={inputStyles}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Username
              </label>
              <input 
                placeholder="Username" 
                value={config.username}
                onChange={(e) => setConfig({...config, username: e.target.value})}
                style={inputStyles}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Password
              </label>
              <input 
                type="password" 
                placeholder="Password" 
                value={config.password}
                onChange={(e) => setConfig({...config, password: e.target.value})}
                style={inputStyles}
              />
            </div>
          </div>

          {(config.host.includes('.database.windows.net') || config.host.includes('.postgres.database.azure.com')) && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e3f2fd', 
              color: '#1565c0', 
              borderRadius: '8px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <LockOutlined /> Azure database detected - SSL automatically enabled
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button 
              type="button"
              onClick={() => {
                setConfig({
                  ...config,
                  type: 'mssql',
                  host: 'salemseats-prod-clone.database.windows.net',
                  port: '1433',
                  database: 'salemseats-prod-clone',
                  username: 'appuser',
                  ssl: true
                })
              }}
              style={{ 
                flex: 1,
                padding: '8px 12px', 
                fontSize: '12px', 
                backgroundColor: '#e3f2fd', 
                border: '1px solid #1976d2', 
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center'
              }}
            >
              <CloudOutlined /> Load Sample Azure SQL
            </button>
          </div>

          <Button 
            onClick={handleConnect}
            disabled={connecting || !config.host || !config.database || !config.username || !config.password}
            loading={false} // Disable built-in loading, use custom loader
            size="lg"
            style={{ marginTop: '8px' }}
            icon={connecting ? <Loader size="small" text="" spinning={true} inline={true} /> : <DatabaseOutlined />}
          >
            {connecting ? 'Connecting...' : 'Connect to Database'}
          </Button>

          {error && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: 'var(--color-danger)',
              color: 'white', 
              borderRadius: '8px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CloseCircleOutlined /> {error}
            </div>
          )}

          {/* Connection Saver */}
          <ConnectionSaver 
            currentConfig={config}
            onSaveSuccess={handleSaveSuccess}
          />
        </div>
      </div>

      {/* Saved Connections Modal */}
      <SavedConnectionsModal
        isOpen={showSavedConnections}
        onClose={() => setShowSavedConnections(false)}
        onLoadConnection={handleLoadConnection}
      />
    </div>
  )
}
