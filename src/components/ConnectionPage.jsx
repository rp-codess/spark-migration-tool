import React, { useState } from 'react'

export default function ConnectionPage({ onConnect }) {
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#333', marginBottom: '8px', fontSize: '28px' }}>
            🚀 Spark Migration Tool
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Connect to your database to get started
          </p>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
              Database Type
            </label>
            <select 
              value={config.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              style={{ 
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: '#f8f9fa'
              }}
            >
              {databaseTypes.map(db => (
                <option key={db.value} value={db.value}>{db.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                Host
              </label>
              <input 
                placeholder="Enter host address" 
                value={config.host}
                onChange={(e) => handleConfigChange('host', e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                Port
              </label>
              <input 
                placeholder="Port" 
                value={config.port}
                onChange={(e) => setConfig({...config, port: e.target.value})}
                style={{ 
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
              Database
            </label>
            <input 
              placeholder="Database name" 
              value={config.database}
              onChange={(e) => setConfig({...config, database: e.target.value})}
              style={{ 
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                Username
              </label>
              <input 
                placeholder="Username" 
                value={config.username}
                onChange={(e) => setConfig({...config, username: e.target.value})}
                style={{ 
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' }}>
                Password
              </label>
              <input 
                type="password" 
                placeholder="Password" 
                value={config.password}
                onChange={(e) => setConfig({...config, password: e.target.value})}
                style={{ 
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
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
              🔒 Azure database detected - SSL automatically enabled
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
                cursor: 'pointer'
              }}
            >
              Load Sample Azure SQL
            </button>
          </div>

          <button 
            onClick={handleConnect}
            disabled={connecting || !config.host || !config.database || !config.username || !config.password}
            style={{ 
              width: '100%',
              padding: '14px',
              backgroundColor: connecting ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: connecting ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              transition: 'all 0.2s'
            }}
          >
            {connecting ? '🔄 Connecting...' : '🚀 Connect to Database'}
          </button>

          {error && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#ffebee', 
              color: '#c62828', 
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
