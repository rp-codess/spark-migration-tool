import React from 'react'
import { useTheme } from './ThemeProvider'
import Button from './Button'

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={className}
      icon={theme === 'light' ? '🌙' : '☀️'}
    >
      {theme === 'light' ? 'Dark' : 'Light'}
    </Button>
  )
}

export default ThemeToggle
