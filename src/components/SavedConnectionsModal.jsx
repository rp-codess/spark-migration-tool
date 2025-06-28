import React, { useState, useEffect } from 'react'
import Button from './ui/Button'
import Tooltip from './ui/Tooltip'

export default function SavedConnectionsModal({ isOpen, onClose, onLoadConnection }) {
  const [savedConfigs, setSavedConfigs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadSavedConfigs()
    }
  }, [isOpen])

  const loadSavedConfigs = async () => {
    setLoading(true)
    setError('')
    try {
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

  const handleDeleteConnection = async (configId, configName) => {
    if (window.confirm(`Are you sure you want to delete "${configName}"?`)) {
      try {
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
    onLoadConnection(config)
    onClose()
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

  if (!isOpen) return null

  const modalOverlayStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  }

  const modalContentStyles = {
    background: 'var(--bg-primary)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: 'var(--shadow-lg)',
    position: 'relative'
  }

  const headerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-color)'
  }

  const connectionItemStyles = {
    padding: '16px',
    background: 'var(--bg-secondary)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  }

  const connectionInfoStyles = {
    flex: 1,
    cursor: 'pointer'
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

  const emptyStateStyles = {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-secondary)'
  }

  return (
    <div style={modalOverlayStyles} onClick={onClose}>
      <div style={modalContentStyles} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyles}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px' }}>
            💾 Saved Connections
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            icon="✕"
          >
            Close
          </Button>
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
          <div style={emptyStateStyles}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <div>Loading saved connections...</div>
          </div>
        ) : savedConfigs.length === 0 ? (
          <div style={emptyStateStyles}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>No saved connections yet</div>
            <div style={{ fontSize: '14px' }}>
              Configure a connection and save it to get started
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Found {savedConfigs.length} saved connection{savedConfigs.length !== 1 ? 's' : ''}
            </div>
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
                      size="sm"
                      variant="primary"
                      icon="🚀"
                    >
                      Load
                    </Button>
                  </Tooltip>
                  <Tooltip text="Delete this saved connection">
                    <Button
                      onClick={() => handleDeleteConnection(config.id, getConnectionDisplayName(config))}
                      size="sm"
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
    </div>
  )
}
