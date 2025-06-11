import React from 'react'
import Button from '../ui/Button'
import ThemeToggle from '../ui/ThemeToggle'
import ProgressBar from '../ui/ProgressBar'
import './Header.css'

const Header = ({
  title,
  subtitle,
  onDisconnect,
  downloading = false,
  downloadProgress = { current: 0, total: 0 },
  downloadCancelled = false,
  onCancelDownload,
  onDownloadOptionsToggle,
  showDownloadOptions = false,
  downloadActions
}) => {
  return (
    <header className="app-header animate-slideInDown">
      <div className="header-content">
        <div className="header-info">
          <h1 className="header-title">
            <span className="header-icon">📊</span>
            {title}
          </h1>
          {subtitle && (
            <p className="header-subtitle">{subtitle}</p>
          )}
        </div>
        
        <div className="header-actions">
          <ThemeToggle />
          {downloadActions}
          <Button
            variant="danger"
            icon="🔌"
            onClick={onDisconnect}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {downloading && (
        <div className="download-progress animate-slideInDown">
          <ProgressBar
            value={downloadProgress.current}
            max={downloadProgress.total}
            label={downloadCancelled ? 'Cancelling...' : `Downloading schemas... (${downloadProgress.current}/${downloadProgress.total})`}
            variant={downloadCancelled ? 'warning' : 'success'}
            animated={!downloadCancelled}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={onCancelDownload}
            disabled={downloadCancelled}
            loading={downloadCancelled}
            icon="✕"
            className="cancel-btn"
          >
            Cancel
          </Button>
        </div>
      )}
    </header>
  )
}

export default Header
