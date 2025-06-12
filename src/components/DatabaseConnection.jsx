import { useState, useEffect } from 'react'
import Button from './ui/Button'

export default function DatabaseConnection({ onConnect }) {
  const [config, setConfig] = useState({
    type: 'mssql',
    host: '',
    port: '',
    database: '',
    username: '',
    password: '',
    ssl: false,
    sslMode: 'prefer'
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedConfigs, setSavedConfigs] = useState([])
  const [showSavedConfigs, setShowSavedConfigs] = useState(false)
  const [configName, setConfigName] = useState('')
  const [saveConnection, setSaveConnection] = useState(false)

  useEffect(() => {
    loadSavedConfigs()
  }, [])

  const loadSavedConfigs = async () => {
    let loadedSuccessfully = false;
    try {
      const result = await window.electronAPI.getSavedConfigs();
      if (result.success && result.configs && result.configs.length > 0) {
        setSavedConfigs(result.configs);
        loadedSuccessfully = true;
      } else if (result.success && (!result.configs || result.configs.length === 0)) {
        // API call succeeded but no configs found
        setSavedConfigs([]); 
        console.info('No saved configurations found.');
        // loadedSuccessfully remains false to trigger fallback if desired,
        // or set to true if empty list is a valid non-fallback state.
        // Forcing fallback for visibility as per request:
        loadedSuccessfully = false; 
      } else {
        // API call reported failure (result.success is false)
        console.error('Failed to load saved configs from API:', result.message);
        loadedSuccessfully = false;
      }
    } catch (err) {
      console.error('Error during loadSavedConfigs API call:', err);
      loadedSuccessfully = false;
    }

    if (!loadedSuccessfully) {
      console.warn('Using fallback test data for saved configurations.');
      setSavedConfigs([
        { id: 'test1', name: 'Test MSSQL (localhost)', type: 'mssql', host: 'localhost', port: '1433', database: 'testdb_mssql', username: 'sa', ssl: false, sslMode: 'prefer', password: '' },
        { id: 'test2', name: 'Test PostgreSQL (remote)', type: 'postgresql', host: 'remote.example.com', port: '5432', database: 'testdb_pg', username: 'pguser', ssl: true, sslMode: 'require', password: '' }
      ]);
    }
  }

  const handleConnect = async () => {
    setLoading(true)
    setError('')
    
    try {
      const result = await window.electronAPI.connectDatabase(config)
      if (result.success) {
        // If save connection is checked and we have a config name, save it
        if (saveConnection && configName.trim()) {
          await handleSaveConfig()
        }
        onConnect(config)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      setError('Please enter a name for this configuration')
      return
    }

    try {
      const configToSave = {
        name: configName,
        ...config,
        password: '' // Don't save passwords for security
      }
      
      const result = await window.electronAPI.saveConfig(configToSave)
      if (result.success) {
        if (!saveConnection) {
          alert('Configuration saved successfully!')
        }
        setConfigName('')
        setSaveConnection(false)
        loadSavedConfigs()
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLoadConfig = (savedConfig) => {
    setConfig({
      ...savedConfig,
      password: '' // Clear password for security
    })
    setConfigName(savedConfig.name)
    setShowSavedConfigs(false)
  }

  const handleDeleteConfig = async (configId) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      try {
        const result = await window.electronAPI.deleteConfig(configId)
        if (result.success) {
          loadSavedConfigs()
        } else {
          setError(result.message)
        }
      } catch (err) {
        setError(err.message)
      }
    }
  }

  return (
    <div className="database-connection">
      <h2>Database Connection</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Saved Connections Dropdown */}
      {savedConfigs.length > 0 && (
        <div className="form-group" style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Quick Connect - Select Saved Connection</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const selectedConfig = savedConfigs.find(config => config.id === e.target.value)
                  if (selectedConfig) {
                    handleLoadConfig(selectedConfig)
                  }
                }
              }}
              className="form-control"
              style={{ flex: 1 }}
              defaultValue=""
            >
              <option value="">-- Select a saved connection --</option>
              {savedConfigs.map((savedConfig) => (
                <option key={savedConfig.id} value={savedConfig.id}>
                  {savedConfig.name} ({savedConfig.type.toUpperCase()} • {savedConfig.host} • {savedConfig.database})
                </option>
              ))}
            </select>
            <Button
              onClick={() => setShowSavedConfigs(!showSavedConfigs)}
              variant="info"
              size="sm"
              icon="⚙️"
            >
              Manage
            </Button>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Database Type</label>
        <select
          value={config.type}
          onChange={(e) => setConfig({ ...config, type: e.target.value })}
          className="form-control"
        >
          <option value="mssql">MSSQL</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="oracle">Oracle</option>
        </select>
      </div>
      
      <div className="form-group">
        <label>Host</label>
        <input
          type="text"
          value={config.host}
          onChange={(e) => setConfig({ ...config, host: e.target.value })}
          className="form-control"
          placeholder="Database host"
        />
        {savedConfigs.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  const selectedConfig = savedConfigs.find(config => config.id === e.target.value)
                  if (selectedConfig) {
                    setConfig({
                      ...selectedConfig,
                      password: '' // Clear password for security
                    })
                    setConfigName(selectedConfig.name)
                  }
                }
              }}
              className="form-control"
              defaultValue=""
            >
              <option value="">-- Or select from saved hosts --</option>
              {savedConfigs.map((savedConfig) => (
                <option key={savedConfig.id} value={savedConfig.id}>
                  {savedConfig.host} ({savedConfig.name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="form-group">
        <label>Port</label>
        <input
          type="text"
          value={config.port}
          onChange={(e) => setConfig({ ...config, port: e.target.value })}
          className="form-control"
          placeholder="Database port"
        />
      </div>
      
      <div className="form-group">
        <label>Database Name</label>
        <input
          type="text"
          value={config.database}
          onChange={(e) => setConfig({ ...config, database: e.target.value })}
          className="form-control"
          placeholder="Database name"
        />
      </div>
      
      <div className="form-group">
        <label>Username</label>
        <input
          type="text"
          value={config.username}
          onChange={(e) => setConfig({ ...config, username: e.target.value })}
          className="form-control"
          placeholder="Database username"
        />
      </div>
      
      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          value={config.password}
          onChange={(e) => setConfig({ ...config, password: e.target.value })}
          className="form-control"
          placeholder="Database password"
        />
      </div>
      
      <div className="form-group">
        <label>SSL</label>
        <div>
          <label>
            <input
              type="radio"
              checked={config.ssl}
              onChange={() => setConfig({ ...config, ssl: true })}
            />
            Yes
          </label>
          <label>
            <input
              type="radio"
              checked={!config.ssl}
              onChange={() => setConfig({ ...config, ssl: false })}
            />
            No
          </label>
        </div>
      </div>
      
      {config.ssl && (
        <div className="form-group">
          <label>SSL Mode</label>
          <select
            value={config.sslMode}
            onChange={(e) => setConfig({ ...config, sslMode: e.target.value })}
            className="form-control"
          >
            <option value="prefer">Prefer</option>
            <option value="require">Require</option>
            <option value="disable">Disable</option>
          </select>
        </div>
      )}
      
      <div className="form-actions">
        {/* Save Connection Checkbox */}
        <div className="save-connection-option" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          backgroundColor: 'var(--bg-tertiary, #f5f5f5)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          minHeight: '50px'
        }}>
          <input
            type="checkbox"
            id="saveConnection"
            checked={saveConnection}
            onChange={(e) => setSaveConnection(e.target.checked)}
            style={{ 
              margin: 0, 
              width: '20px', 
              height: '20px',
              accentColor: 'var(--color-primary, #007bff)'
            }}
          />
          <label htmlFor="saveConnection" style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600', 
            cursor: 'pointer',
            color: 'var(--text-primary, #333)'
          }}>
            Save this connection for future use
          </label>
        </div>

        {/* Connection Name Input - Show when save checkbox is checked */}
        {saveConnection && (
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center', 
            marginBottom: '16px',
            padding: '12px',
            background: 'var(--bg-tertiary, #f0f0f0)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <input
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="Enter connection name..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <Button
              onClick={handleSaveConfig}
              disabled={!configName.trim() || loading}
              variant="success"
              size="sm"
              icon="💾"
            >
              Save Now
            </Button>
          </div>
        )}

        {/* Manage Saved Connections Button */}
        {savedConfigs.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <Button
              onClick={() => setShowSavedConfigs(!showSavedConfigs)}
              variant="info"
              size="sm"
              icon="📂"
            >
              {showSavedConfigs ? 'Hide' : 'Manage'} Saved Connections
            </Button>
          </div>
        )}

        {showSavedConfigs && (
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Manage Saved Configurations</h4>
            {savedConfigs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No saved configurations</p>
            ) : (
              savedConfigs.map((savedConfig) => (
                <div
                  key={savedConfig.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{savedConfig.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {savedConfig.type.toUpperCase()} • {savedConfig.host} • {savedConfig.database}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      onClick={() => handleLoadConfig(savedConfig)}
                      variant="primary"
                      size="sm"
                      icon="📥"
                    >
                      Load
                    </Button>
                    <Button
                      onClick={() => handleDeleteConfig(savedConfig.id)}
                      variant="danger"
                      size="sm"
                      icon="🗑️"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <Button
          onClick={handleConnect}
          disabled={loading}
          loading={loading}
          variant="primary"
          icon="🔌"
        >
          {loading ? 'Connecting...' : 'Connect to Database'}
        </Button>
      </div>
    </div>
  )
}