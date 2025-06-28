import React, { useState } from 'react'
import Button from './ui/Button'
import Tooltip from './ui/Tooltip'

export default function ConnectionSaver({ currentConfig, onSaveSuccess }) {
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [configName, setConfigName] = useState('')
  const [savePassword, setSavePassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!configName.trim()) {
      setError('Please enter a name for this connection')
      return
    }

    // Check if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.saveConfig) {
      setError('Application not properly loaded. Please restart the application.')
      return
    }

    setSaving(true)
    setError('')

    const configToSave = {
      ...currentConfig,
      name: configName.trim(),
      password: savePassword ? currentConfig.password : ''
    }

    try {
      const result = await window.electronAPI.saveConfig(configToSave)
      if (result.success) {
        setConfigName('')
        setSavePassword(false)
        setShowSaveForm(false)
        onSaveSuccess?.('Connection saved successfully!')
      } else {
        setError('Failed to save connection: ' + result.message)
      }
    } catch (error) {
      console.error('Error saving connection:', error)
      setError('Error saving connection: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const canSave = currentConfig && currentConfig.host && currentConfig.database && currentConfig.username

  if (!canSave) {
    return null
  }

  const containerStyles = {
    marginTop: '16px',
    padding: '16px',
    background: 'var(--bg-secondary)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)'
  }

  const formStyles = {
    marginTop: '12px',
    display: 'grid',
    gap: '12px'
  }

  const inputStyles = {
    width: '100%',
    padding: '10px',
    border: '2px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)'
  }

  const checkboxContainerStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  const buttonGroupStyles = {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  }

  return (
    <div style={containerStyles}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>
          💾 Save this connection
        </span>
        {!showSaveForm ? (
          <Tooltip text="Save the current connection configuration for quick access later">
            <Button
              onClick={() => setShowSaveForm(true)}
              size="sm"
              variant="outline"
              icon="💾"
            >
              Save
            </Button>
          </Tooltip>
        ) : (
          <Button
            onClick={() => {
              setShowSaveForm(false)
              setConfigName('')
              setSavePassword(false)
              setError('')
            }}
            size="sm"
            variant="ghost"
            icon="✕"
          >
            Cancel
          </Button>
        )}
      </div>

      {showSaveForm && (
        <div style={formStyles}>
          {error && (
            <div style={{ 
              padding: '8px 12px', 
              backgroundColor: 'var(--color-danger)',
              color: 'white', 
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              ❌ {error}
            </div>
          )}

          <input
            type="text"
            placeholder="Enter a name for this connection (e.g., 'Production DB')"
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
            <label htmlFor="savePassword" style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
              Save password (encrypted and stored locally)
            </label>
          </div>

          {/* Security Notice */}
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#fff3cd', 
            color: '#856404', 
            borderRadius: '6px',
            fontSize: '11px',
            border: '1px solid #ffeaa7'
          }}>
            🔒 {savePassword ? 
              'Password will be encrypted and stored locally. Only save on trusted devices.' :
              'Password will not be saved. You\'ll need to enter it each time.'
            }
          </div>

          <div style={buttonGroupStyles}>
            <Button
              onClick={handleSave}
              variant="primary"
              size="sm"
              icon="💾"
              loading={saving}
              disabled={!configName.trim() || saving}
            >
              Save Connection
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
