import React, { useState, useEffect } from 'react'
import Button from './ui/Button'
import Tooltip from './ui/Tooltip'

export default function SavedConnections({ onLoadConnection, currentConfig }) {
  const [savedConfigs, setSavedConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [configName, setConfigName] = useState('')
  const [savePassword, setSavePassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load saved configurations on component mount
  useEffect(() => {
    loadSavedConfigs()
  }, [])

  const loadSavedConfigs = async () => {
    setLoading(true)
    setError('')
    try {
      // Check if electronAPI is available
      if (!window.electronAPI || !window.electronAPI.getSavedConfigs) {
        setError('Application not properly loaded. Please restart the application.')
        return
      }

      const result = await window.electronAPI.getSavedConfigs()
      if (result.success) {
        setSavedConfigs(result.configs || [])
      } else {
        setError('Failed to load saved connections: ' + result.message)
      }
    } catch (error) {
      console.error('Error loading saved configs:', error)
      setError('Error loading saved connections. Please check if the application is running in Electron.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConnection = async () => {
    if (!configName.trim()) {
      setError('Please enter a name for this connection')
      return
    }

    // Check if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.saveConfig) {
      setError('Application not properly loaded. Please restart the application.')
      return
    }

    const configToSave = {
      ...currentConfig,
      name: configName.trim(),
      password: savePassword ? currentConfig.password : '' // Only save password if user chooses to
    }

    try {
      setError('')
      const result = await window.electronAPI.saveConfig(configToSave)
      if (result.success) {
        setShowSaveDialog(false)
        setConfigName('')
        setSavePassword(false)
        setSuccess('Connection saved successfully!')
        setTimeout(() => setSuccess(''), 3000)
        loadSavedConfigs() // Reload the list
      } else {
        setError('Failed to save connection: ' + result.message)
      }
    } catch (error) {
      console.error('Error saving connection:', error)
      setError('Error saving connection: ' + error.message)
    }
  }

  const handleDeleteConnection = async (configId, configName) => {
    if (window.confirm(`Are you sure you want to delete "${configName}"?`)) {
      try {
        // Check if electronAPI is available
        if (!window.electronAPI || !window.electronAPI.deleteConfig) {
          setError('Application not properly loaded. Please restart the application.')
          return
        }

        setError('')
        const result = await window.electronAPI.deleteConfig(configId)
        if (result.success) {
          setSuccess('Connection deleted successfully!')
          setTimeout(() => setSuccess(''), 3000)
          loadSavedConfigs() // Reload the list
        } else {
          setError('Failed to delete connection: ' + result.message)
        }
      } catch (error) {
        console.error('Error deleting connection:', error)
        setError('Error deleting connection: ' + error.message)
      }
    }
  }

  const handleLoadConnection = (config) => {
    onLoadConnection({
      type: config.type,
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
      schema: config.schema,
      ssl: config.ssl,
      sslMode: config.sslMode
    })
  }

  const getConnectionDisplayName = (config) => {
    return config.name || `${config.type}://${config.host}:${config.port}/${config.database}`
  }

  const getConnectionSubtitle = (config) => {
    return `${config.username}@${config.host}:${config.port}`
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'Unknown'
    }
  }

  const containerStyles = {
    marginTop: '20px',
    padding: '20px',
    background: 'var(--bg-secondary)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)'
  }

  const headerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  }

  const connectionItemStyles = {
    padding: '16px',
    background: 'var(--bg-primary)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: 'var(--shadow-md)'
    }
  }

  const connectionInfoStyles = {
    flex: 1
  }

  const connectionNameStyles = {
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '4px',
    fontSize: '14px'
  }

  const connectionSubtitleStyles = {
    color: 'var(--text-secondary)',
    fontSize: '12px',
    marginBottom: '2px'
  }

  const connectionMetaStyles = {
    color: 'var(--text-tertiary)',
    fontSize: '11px'
  }

  const buttonGroupStyles = {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  }

  const saveDialogStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }

  const saveDialogContentStyles = {
    background: 'var(--bg-primary)',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: 'var(--shadow-lg)'
  }

  const inputStyles = {
    width: '100%',
    padding: '10px',
    border: '2px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    marginBottom: '12px'
  }

  const checkboxContainerStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  }

  return (
    <>
      <div style={containerStyles}>
        <div style={headerStyles}>
          <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px' }}>
            💾 Saved Connections
          </h3>
          {currentConfig && currentConfig.host && (
            <Tooltip text="Save the current connection configuration for quick access later">
              <Button
                onClick={() => setShowSaveDialog(true)}
                size="sm"
                variant="outline"
                icon="💾"
              >
                Save Current
              </Button>
            </Tooltip>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'var(--color-danger)',
            color: 'white', 
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
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
            ✅ {success}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
            Loading saved connections...
          </div>
        ) : savedConfigs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📭</div>
            <div>No saved connections yet</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Configure a connection and click "Save Current" to get started
            </div>
          </div>
        ) : (
          <div>
            {savedConfigs.map((config) => (
              <div
                key={config.id}
                style={connectionItemStyles}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div 
                  style={connectionInfoStyles}
                  onClick={() => handleLoadConnection(config)}
                >
                  <div style={connectionNameStyles}>
                    {getConnectionDisplayName(config)}
                  </div>
                  <div style={connectionSubtitleStyles}>
                    {getConnectionSubtitle(config)}
                  </div>
                  <div style={connectionMetaStyles}>
                    {config.type.toUpperCase()} • Created {formatDate(config.createdAt)}
                    {config.password ? 
                      <span style={{ color: 'var(--color-success)', marginLeft: '4px' }}>• 🔐 Password saved</span> : 
                      <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>• ⚠️ Password not saved</span>
                    }
                  </div>
                </div>
                <div style={buttonGroupStyles}>
                  <Tooltip text={config.password ? "Load connection with saved password" : "Load connection (you'll need to enter password)"}>
                    <Button
                      onClick={() => handleLoadConnection(config)}
                      size="xs"
                      variant="primary"
                      icon="🚀"
                    >
                      Load
                    </Button>
                  </Tooltip>
                  <Tooltip text="Delete this saved connection">
                    <Button
                      onClick={() => handleDeleteConnection(config.id, getConnectionDisplayName(config))}
                      size="xs"
                      variant="danger"
                      icon="🗑️"
                    >
                      Delete
                    </Button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div style={saveDialogStyles} onClick={() => setShowSaveDialog(false)}>
          <div style={saveDialogContentStyles} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--text-primary)', marginTop: 0, marginBottom: '16px' }}>
              💾 Save Connection
            </h3>
            
            <input
              type="text"
              placeholder="Enter a name for this connection"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              style={inputStyles}
              autoFocus
            />

            <div style={checkboxContainerStyles}>
              <input
                type="checkbox"
                id="savePassword"
                checked={savePassword}
                onChange={(e) => setSavePassword(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="savePassword" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                Save password (encrypted and stored locally)
              </label>
            </div>

            {/* Security Notice */}
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fff3cd', 
              color: '#856404', 
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '16px',
              border: '1px solid #ffeaa7'
            }}>
              🔒 <strong>Security Notice:</strong> {savePassword ? 
                'Passwords are encrypted and stored in your Documents folder. Only save passwords on trusted devices.' :
                'Password will not be saved. You will need to enter it each time you connect.'
              }
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setShowSaveDialog(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveConnection}
                variant="primary"
                size="sm"
                icon="💾"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
