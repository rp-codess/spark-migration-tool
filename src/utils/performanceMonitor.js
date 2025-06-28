/**
 * Performance monitoring utilities for detecting and preventing glitches
 */
import { useEffect } from 'react'

class PerformanceMonitor {
  constructor() {
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fps = 0
    this.isMonitoring = false
    this.observers = []
    this.renderTimes = []
    this.maxRenderTimes = 100 // Keep last 100 render times
  }

  // Start monitoring performance
  startMonitoring() {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    console.log('🔍 Performance monitoring started')
    
    // Monitor FPS
    this.monitorFPS()
    
    // Monitor layout shifts
    this.monitorLayoutShifts()
    
    // Monitor large layout shifts
    this.monitorCLS()
    
    // Monitor render blocking
    this.monitorRenderBlocking()
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    console.log('⏹️ Performance monitoring stopped')
  }

  // Monitor FPS to detect dropped frames
  monitorFPS() {
    const measureFPS = (currentTime) => {
      if (!this.isMonitoring) return
      
      this.frameCount++
      const deltaTime = currentTime - this.lastTime
      
      if (deltaTime >= 1000) { // Calculate FPS every second
        this.fps = Math.round((this.frameCount * 1000) / deltaTime)
        
        // Log warning if FPS drops below 30
        if (this.fps < 30) {
          console.warn(`⚠️ Low FPS detected: ${this.fps} FPS`)
        }
        
        this.frameCount = 0
        this.lastTime = currentTime
      }
      
      requestAnimationFrame(measureFPS)
    }
    
    requestAnimationFrame(measureFPS)
  }

  // Monitor layout shifts that cause visual instability
  monitorLayoutShifts() {
    if (!('LayoutShiftObserver' in window)) return
    
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.value > 0.1) { // Significant layout shift
          console.warn('⚠️ Layout shift detected:', {
            value: entry.value,
            sources: entry.sources.map(source => ({
              element: source.node,
              rect: source.currentRect
            }))
          })
        }
      }
    })
    
    observer.observe({ entryTypes: ['layout-shift'] })
    this.observers.push(observer)
  }

  // Monitor Cumulative Layout Shift (CLS)
  monitorCLS() {
    if (!('PerformanceObserver' in window)) return
    
    let clsValue = 0
    
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
          
          if (clsValue > 0.25) { // Poor CLS threshold
            console.error('❌ High Cumulative Layout Shift:', clsValue)
          }
        }
      }
    })
    
    try {
      observer.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(observer)
    } catch (e) {
      console.log('Layout shift monitoring not supported')
    }
  }

  // Monitor render blocking resources
  monitorRenderBlocking() {
    if (!('PerformanceObserver' in window)) return
    
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.renderBlockingStatus === 'blocking') {
          console.warn('⚠️ Render blocking resource:', entry.name)
        }
      }
    })
    
    try {
      observer.observe({ entryTypes: ['resource'] })
      this.observers.push(observer)
    } catch (e) {
      console.log('Resource monitoring not supported')
    }
  }

  // Measure component render time
  measureRenderTime(componentName, startTime) {
    const endTime = performance.now()
    const renderTime = endTime - startTime
    
    this.renderTimes.push({ componentName, renderTime, timestamp: endTime })
    
    // Keep only recent render times
    if (this.renderTimes.length > this.maxRenderTimes) {
      this.renderTimes.shift()
    }
    
    // Warn about slow renders (>16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`⚠️ Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
    }
    
    return renderTime
  }

  // Get performance report
  getPerformanceReport() {
    const avgRenderTime = this.renderTimes.length > 0 
      ? this.renderTimes.reduce((sum, entry) => sum + entry.renderTime, 0) / this.renderTimes.length
      : 0
    
    const slowRenders = this.renderTimes.filter(entry => entry.renderTime > 16).length
    
    return {
      currentFPS: this.fps,
      averageRenderTime: avgRenderTime.toFixed(2),
      slowRenderCount: slowRenders,
      totalRenders: this.renderTimes.length,
      renderingHealth: slowRenders / this.renderTimes.length < 0.1 ? 'Good' : 'Poor'
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor()

// Auto-start in development mode
if (process.env.NODE_ENV === 'development') {
  performanceMonitor.startMonitoring()
}

export default performanceMonitor

// React hook for measuring component render times
export function useRenderTimeProfiler(componentName) {
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      // Measure on cleanup instead of during render
      performanceMonitor.measureRenderTime(componentName, startTime)
    }
  }, [componentName])
}

// Utility function to detect if user has slow device
export function isSlowDevice() {
  // Check for indicators of slow devices
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')
  const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2
  const hasLimitedMemory = navigator.deviceMemory && navigator.deviceMemory <= 2
  
  return isSlowConnection || isLowEndDevice || hasLimitedMemory
}

// Optimize for slow devices
export function optimizeForSlowDevices() {
  if (isSlowDevice()) {
    console.log('🐌 Slow device detected, applying optimizations')
    
    // Reduce animation duration
    const style = document.createElement('style')
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.1s !important;
        animation-delay: 0s !important;
        transition-duration: 0.1s !important;
        transition-delay: 0s !important;
      }
    `
    document.head.appendChild(style)
    
    return true
  }
  
  return false
}
