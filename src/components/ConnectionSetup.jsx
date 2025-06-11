import React, { useState } from 'react'

export default function ConnectionSetup({ onConnectionChange }) {
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
  const [connected, setConnected] = useState(false)
  const [message, setMessage] = useState('')

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

  const handleConnect = async () => {
    setConnecting(true)
    setMessage('')
    
    try {
      const result = await window.electronAPI.connectDatabase(config)
      if (result.success) {
        setConnected(true)
        setMessage('Connected successfully!')
        onConnectionChange?.(true)
      } else {
        setConnected(false)
        setMessage(`Connection failed: ${result.message}`)
        onConnectionChange?.(false)
      }
    } catch (error) {
      setConnected(false)
      setMessage(`Connection error: ${error.message}`)
      onConnectionChange?.(false)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await window.electronAPI.disconnectDatabase()
      setConnected(false)
      setMessage('Disconnected')
      onConnectionChange?.(false)
    } catch (error) {
      setMessage(`Disconnect error: ${error.message}`)
    }
  }

  const handleConfigChange = (field, value) => {
    const newConfig = { ...config, [field]: value }
    
    // Auto-detect Azure databases and set SSL appropriately
    if (field === 'host') {
      if (value.includes('.database.windows.net')) {
        // Azure SQL Server
        newConfig.ssl = true
        newConfig.port = '1433'
      } else if (value.includes('.postgres.database.azure.com')) {
        // Azure PostgreSQL
        newConfig.ssl = true
        newConfig.sslMode = 'require'
        newConfig.port = '5432'
      }
    }
    
    setConfig(newConfig)
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
      <h3>Database Connection Setup</h3>
      <div style={{ display: 'grid', gap: '10px', maxWidth: '400px' }}>
        <select 
          value={config.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          style={{ padding: '8px' }}
        >
          {databaseTypes.map(db => (
            <option key={db.value} value={db.value}>{db.label}</option>
          ))}
        </select>
        
        <input 
          placeholder="Host" 
          value={config.host}
          onChange={(e) => handleConfigChange('host', e.target.value)}
        />
        <input 
          placeholder="Port" 
          value={config.port}
          onChange={(e) => setConfig({...config, port: e.target.value})}
        />
        <input 
          placeholder="Database" 
          value={config.database}
          onChange={(e) => setConfig({...config, database: e.target.value})}
        />
        <input 
          placeholder="Username" 
          value={config.username}
          onChange={(e) => setConfig({...config, username: e.target.value})}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={config.password}
          onChange={(e) => setConfig({...config, password: e.target.value})}
        />

        {/* Show SSL indicator for Azure databases */}
        {(config.host.includes('.database.windows.net') || config.host.includes('.postgres.database.azure.com')) && (
          <div style={{ 
            padding: '8px', 
            backgroundColor: '#e3f2fd', 
            color: '#1565c0', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            🔒 Azure database detected - SSL automatically enabled
          </div>
        )}

        {/* PostgreSQL SSL Options - only show for non-Azure or manual override */}
        {config.type === 'postgresql' && !config.host.includes('.postgres.database.azure.com') && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox"
                id="ssl-checkbox"
                checked={config.ssl}
                onChange={(e) => setConfig({...config, ssl: e.target.checked})}
              />
              <label htmlFor="ssl-checkbox">Enable SSL</label>
            </div>
            
            <select 
              value={config.sslMode}
              onChange={(e) => setConfig({...config, sslMode: e.target.value})}
              style={{ padding: '8px' }}
            >
              <option value="disable">SSL Disabled</option>
              <option value="allow">SSL Allow</option>
              <option value="prefer">SSL Prefer (default)</option>
              <option value="require">SSL Required</option>
              <option value="verify-ca">SSL Verify CA</option>
              <option value="verify-full">SSL Verify Full</option>
            </select>
          </>
        )}

        {/* Quick setup buttons for Azure */}
        {!connected && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button 
              type="button"
              onClick={() => {
                setConfig({
                  ...config,
                  type: 'mssql',
                  host: 'mythicboost-development-server.database.windows.net',
                  port: '1433',
                  database: 'mythicboost',
                  username: 'mythicboostadmin',
                  ssl: true
                })
              }}
              style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#e3f2fd', border: '1px solid #1976d2', borderRadius: '4px' }}
            >
              Load Azure SQL
            </button>
            <button 
              type="button"
              onClick={() => {
                setConfig({
                  ...config,
                  type: 'postgresql',
                  host: 'mythicboost-development-pg-development.postgres.database.azure.com',
                  port: '5432',
                  database: 'mythicboost_dev_db',
                  username: 'mythicboostdevadmin',
                  ssl: true,
                  sslMode: 'require'
                })
              }}
              style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#e8f5e8', border: '1px solid #4caf50', borderRadius: '4px' }}
            >
              Load Azure PostgreSQL
            </button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {!connected ? (
            <button 
              onClick={handleConnect}
              disabled={connecting}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: connecting ? '#ccc' : '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px' 
              }}
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          ) : (
            <button 
              onClick={handleDisconnect}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#f44336', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px' 
              }}
            >
              Disconnect
            </button>
          )}
        </div>
        
        {message && (
          <div style={{ 
            padding: '8px', 
            backgroundColor: connected ? '#d4edda' : '#f8d7da',
            color: connected ? '#155724' : '#721c24',
            borderRadius: '4px'
          }}>
            {message}
          </div>
        )}

        {/* Connection troubleshooting info */}
        {!connected && config.type === 'postgresql' && (
          <div style={{ 
            padding: '8px', 
            backgroundColor: '#d1ecf1', 
            color: '#0c5460', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>PostgreSQL Connection Tips:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Try enabling SSL if connection fails</li>
              <li>Contact your DB admin to add your IP to pg_hba.conf</li>
              <li>Ensure the database server allows remote connections</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
