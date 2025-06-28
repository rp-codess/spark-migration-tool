import React from 'react'

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  onClick,
  className = '',
  style = {},
  ...props
}) => {
  const getButtonStyles = () => {
    const baseStyles = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'inherit',
      textDecoration: 'none',
      opacity: disabled ? 0.6 : 1,
    }

    const sizeStyles = {
      xs: { padding: '4px 8px', fontSize: '11px' },
      sm: { padding: '6px 12px', fontSize: '12px' },
      md: { padding: '10px 16px', fontSize: '14px' },
      lg: { padding: '14px 20px', fontSize: '16px' }
    }

    const variantStyles = {
      primary: {
        background: 'var(--gradient-primary)',
        color: 'white'
      },
      secondary: {
        background: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)'
      },
      outline: {
        background: 'transparent',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)'
      },
      success: {
        background: 'var(--gradient-success)',
        color: 'white'
      },
      warning: {
        background: 'var(--gradient-warning)',
        color: 'white'
      },
      danger: {
        background: 'var(--gradient-danger)',
        color: 'white'
      },
      ghost: {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-color)'
      }
    }

    return {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style
    }
  }

  return (
    <button
      style={getButtonStyles()}
      disabled={disabled || loading}
      onClick={onClick}
      className={className}
      {...props}
    >
      {loading && <span style={{ animation: 'spin 1s linear infinite' }}>⟳</span>}
      {icon && !loading && <span>{icon}</span>}
      <span style={{ opacity: loading ? 0.7 : 1 }}>{children}</span>
    </button>
  )
}

export default Button
