import React, { useState } from 'react'

export default function Tooltip({ children, text, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false)

  const tooltipStyles = {
    position: 'absolute',
    background: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    zIndex: 1000,
    opacity: isVisible ? 1 : 0,
    visibility: isVisible ? 'visible' : 'hidden',
    transition: 'opacity 0.2s ease, visibility 0.2s ease',
    transform: position === 'top' ? 'translateX(-50%) translateY(-100%)' : 'translateX(-50%) translateY(100%)',
    left: '50%',
    [position]: '100%',
    marginTop: position === 'top' ? '-8px' : '8px',
    pointerEvents: 'none'
  }

  const arrowStyles = {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    [position === 'top' ? 'borderTop' : 'borderBottom']: '5px solid rgba(0, 0, 0, 0.9)',
    [position === 'top' ? 'bottom' : 'top']: '-5px'
  }

  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <div style={tooltipStyles}>
        {text}
        <div style={arrowStyles}></div>
      </div>
    </div>
  )
}
