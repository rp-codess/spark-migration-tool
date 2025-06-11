import React from 'react'
import './SearchInput.css'

const SearchInput = ({
  value = '',
  onChange,
  placeholder = 'Search...',
  disabled = false,
  clearable = true,
  onClear,
  className = '',
  size = 'md',
  ...props
}) => {
  const handleClear = () => {
    if (onClear) {
      onClear()
    } else {
      onChange('')
    }
  }

  const sizeStyles = {
    sm: { height: '32px', fontSize: '12px' },
    md: { height: '40px', fontSize: '14px' },
    lg: { height: '48px', fontSize: '16px' }
  }

  const containerStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg-primary)',
    border: '2px solid var(--border-color)',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    ...sizeStyles[size]
  }

  const inputStyle = {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    paddingLeft: '36px',
    paddingRight: clearable && value ? '36px' : '12px',
    fontSize: 'inherit'
  }

  return (
    <div style={containerStyle} className={className}>
      <div style={{
        position: 'absolute',
        left: '12px',
        color: 'var(--text-tertiary)',
        fontSize: '14px',
        pointerEvents: 'none'
      }}>
        🔍
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={inputStyle}
        {...props}
      />
      {clearable && value && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            fontSize: '12px',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default SearchInput
