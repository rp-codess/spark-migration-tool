import React from 'react'
import { Spin } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import './Loader.css'

const Loader = ({ 
  size = 'default', 
  text = 'Loading...', 
  spinning = true, 
  children,
  overlay = false,
  fullscreen = false,
  delay = 0
}) => {
  // Custom spinning icon
  const spinIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : size === 'small' ? 16 : 24 }} spin />

  if (fullscreen) {
    return (
      <div className={`loader-fullscreen ${spinning ? 'active' : ''}`}>
        <div className="loader-content">
          <Spin 
            indicator={spinIcon} 
            size={size} 
            spinning={spinning}
            delay={delay}
          />
          {text && <div className="loader-text">{text}</div>}
        </div>
      </div>
    )
  }

  if (overlay) {
    return (
      <div className="loader-container">
        <Spin 
          indicator={spinIcon} 
          size={size} 
          spinning={spinning} 
          tip={text}
          delay={delay}
        >
          <div className={spinning ? 'loader-overlay-content' : ''}>
            {children}
          </div>
        </Spin>
      </div>
    )
  }

  // Simple inline loader
  return (
    <div className="loader-inline">
      <Spin 
        indicator={spinIcon} 
        size={size} 
        spinning={spinning}
        delay={delay}
      />
      {text && <span className="loader-text-inline">{text}</span>}
    </div>
  )
}

export default Loader
