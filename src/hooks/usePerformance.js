import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook for debouncing values to prevent excessive API calls or re-renders
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const timeoutRef = useRef(null)

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for throttling function calls to prevent performance issues
 * @param {Function} callback - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled function
 */
export function useThrottle(callback, delay) {
  const lastRun = useRef(Date.now())

  return (...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args)
      lastRun.current = Date.now()
    }
  }
}

/**
 * Custom hook for preventing memory leaks from timeouts and intervals
 * @returns {Object} Object with setTimeout and setInterval functions that auto-cleanup
 */
export function useSafeTimeout() {
  const timeoutsRef = useRef([])
  const intervalsRef = useRef([])

  useEffect(() => {
    return () => {
      // Cleanup all timeouts and intervals on unmount
      timeoutsRef.current.forEach(clearTimeout)
      intervalsRef.current.forEach(clearInterval)
    }
  }, [])

  const safeSetTimeout = (callback, delay) => {
    const timeoutId = setTimeout(() => {
      callback()
      // Remove from ref array when completed
      timeoutsRef.current = timeoutsRef.current.filter(id => id !== timeoutId)
    }, delay)
    
    timeoutsRef.current.push(timeoutId)
    return timeoutId
  }

  const safeSetInterval = (callback, delay) => {
    const intervalId = setInterval(callback, delay)
    intervalsRef.current.push(intervalId)
    return intervalId
  }

  const safeClearTimeout = (timeoutId) => {
    clearTimeout(timeoutId)
    timeoutsRef.current = timeoutsRef.current.filter(id => id !== timeoutId)
  }

  const safeClearInterval = (intervalId) => {
    clearInterval(intervalId)
    intervalsRef.current = intervalsRef.current.filter(id => id !== intervalId)
  }

  return {
    setTimeout: safeSetTimeout,
    setInterval: safeSetInterval,
    clearTimeout: safeClearTimeout,
    clearInterval: safeClearInterval
  }
}
