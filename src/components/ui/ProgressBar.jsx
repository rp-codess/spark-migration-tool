import React from 'react'
import './ProgressBar.css'

const ProgressBar = ({
  value = 0,
  max = 100,
  showPercentage = true,
  label,
  variant = 'primary',
  size = 'md',
  animated = false,
  className = ''
}) => {
  const percentage = Math.round((value / max) * 100)
  const classes = `progress-bar progress-${variant} progress-${size} ${animated ? 'progress-animated' : ''} ${className}`.trim()

  return (
    <div className="progress-container">
      {(label || showPercentage) && (
        <div className="progress-header">
          {label && <span className="progress-label">{label}</span>}
          {showPercentage && <span className="progress-percentage">{percentage}%</span>}
        </div>
      )}
      <div className={classes}>
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
