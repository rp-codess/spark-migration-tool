import React, { createContext, useContext, useState, useEffect, useRef } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('theme')
      return saved || 'light'
    } catch {
      return 'light'
    }
  })
  
  // Use ref to prevent multiple updates
  const isUpdating = useRef(false)

  useEffect(() => {
    if (isUpdating.current) return
    
    isUpdating.current = true
    
    // Use requestAnimationFrame to batch DOM updates
    requestAnimationFrame(() => {
      document.documentElement.setAttribute('data-theme', theme)
      try {
        localStorage.setItem('theme', theme)
      } catch {
        // Handle localStorage errors
      }
      isUpdating.current = false
    })
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const value = {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark'
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
