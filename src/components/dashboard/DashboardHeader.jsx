import React from 'react'
import Button from '../ui/Button'
import ThemeToggle from '../ui/ThemeToggle'

export default function DashboardHeader({ 
  config, 
  onDisconnect, 
  downloading, 
  tables, 
  downloadProgress,
  downloadCancelled,
  onSingleFileDownload,
  onIndividualFilesDownload,
  onSQLDownload,
  onCancelDownload
}) {
  return (
    <div className="dashboard-header animate-slideInDown">
      <div className="header-content">
        <div className="header-info">
          <h1 className="header-title">
            📊 Database Explorer
          </h1>
          <p className="header-subtitle">
            {config.type.toUpperCase()} • {config.host} • {config.database}
          </p>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          
          <Button
            onClick={onSingleFileDownload}
            disabled={downloading || tables.length === 0}
            variant="success"
            size="sm"
            icon={downloading ? '⏳' : '📄'}
          >
            JSON Single
          </Button>
          
          <Button
            onClick={onIndividualFilesDownload}
            disabled={downloading || tables.length === 0}
            variant="success"
            size="sm"
            icon={downloading ? '⏳' : '📁'}
          >
            JSON Individual
          </Button>
          
          <Button
            onClick={onSQLDownload}
            disabled={downloading || tables.length === 0}
            variant="primary"
            size="sm"
            icon={downloading ? '⏳' : '💾'}
          >
            SQL Schemas
          </Button>
          
          <Button
            onClick={onDisconnect}
            variant="danger"
            icon="🔌"
          >
            Disconnect
          </Button>
        </div>
      </div>
      
      {/* Progress Bar */}
      {downloading && (
        <div className="progress-section animate-slideInDown">
          <div className="progress-header">
            <span className="progress-text">
              {downloadCancelled ? 'Cancelling...' : `Downloading schemas... (${downloadProgress.current}/${downloadProgress.total})`}
            </span>
            <div className="progress-actions">
              <span className="progress-text">
                {downloadProgress.total > 0 ? Math.round((downloadProgress.current / downloadProgress.total) * 100) : 0}%
              </span>
              <Button
                onClick={onCancelDownload}
                disabled={downloadCancelled}
                variant="danger"
                size="sm"
                loading={downloadCancelled}
                icon="✕"
              >
                Cancel
              </Button>
            </div>
          </div>
          <div className="progress-bar">
            <div 
              className={`progress-fill ${downloadCancelled ? 'warning' : 'success'}`}
              style={{ 
                width: downloadProgress.total > 0 ? `${(downloadProgress.current / downloadProgress.total) * 100}%` : '0%'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
