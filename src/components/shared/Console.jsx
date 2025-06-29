import React, { useState, useRef, useEffect } from 'react'
import './Console.css'

const Console = ({ 
  logs = [], 
  isVisible = true, 
  onToggle,
  height = '200px',
  title = 'Output',
  allowClear = true 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const consoleRef = useRef(null)
  const [isAutoScroll, setIsAutoScroll] = useState(true)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs, isAutoScroll])

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    if (onToggle) {
      onToggle(newCollapsed)
    }
  }

  const handleClearLogs = () => {
    // This should be handled by parent component
    if (window.clearConsoleLogs) {
      window.clearConsoleLogs()
    }
  }

  const handleAutoScrollToggle = () => {
    setIsAutoScroll(!isAutoScroll)
  }

  if (!isVisible) {
    return null
  }

  const getLogTypeClass = (logType) => {
    switch (logType) {
      case 'error':
        return 'log-error'
      case 'warning':
        return 'log-warning'
      case 'success':
        return 'log-success'
      case 'info':
        return 'log-info'
      default:
        return 'log-default'
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className={`console-container ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="console-header">
        <div className="console-title">
          <button 
            className="console-toggle"
            onClick={handleToggleCollapse}
            title={isCollapsed ? 'Expand Console' : 'Collapse Console'}
          >
            <span className={`toggle-icon ${isCollapsed ? 'collapsed' : ''}`}>
              ▼
            </span>
            {title}
          </button>
          <span className="log-count">({logs.length} logs)</span>
        </div>
        
        <div className="console-controls">
          <button
            className={`auto-scroll-btn ${isAutoScroll ? 'active' : ''}`}
            onClick={handleAutoScrollToggle}
            title="Toggle Auto-scroll"
          >
            📜
          </button>
          
          {allowClear && (
            <button
              className="clear-btn"
              onClick={handleClearLogs}
              title="Clear Console"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div 
          className="console-content"
          style={{ height }}
          ref={consoleRef}
        >
          {logs.length === 0 ? (
            <div className="no-logs">No output logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`log-entry ${getLogTypeClass(log.type)}`}>
                <span className="log-timestamp">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className="log-level">
                  {log.level || log.type || 'INFO'}
                </span>
                <span className="log-message">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default Console
