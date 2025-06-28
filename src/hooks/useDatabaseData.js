import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDebounce } from './usePerformance'

export function useDatabaseData() {
  // All useState hooks first
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableSchema, setTableSchema] = useState([])
  const [tableData, setTableData] = useState([])
  const [tableRowCount, setTableRowCount] = useState(null)
  const [loadingRowCount, setLoadingRowCount] = useState(false)
  const [loadingTableData, setLoadingTableData] = useState(false)
  const [viewMode, setViewMode] = useState('schema')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  
  // All useRef hooks together
  const loadingRef = useRef(false)
  const errorTimeoutRef = useRef(null)

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // All useCallback hooks together (define before they're used in useEffect)
  const loadTables = useCallback(async () => {
    if (loadingRef.current) return
    
    loadingRef.current = true
    setLoading(true)
    setError('')
    
    try {
      const result = await window.electronAPI.getTables()
      if (result.success) {
        setTables(result.tables)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [])

  const loadTableSchema = useCallback(async (table) => {
    // Load table schema
    setLoading(true)
    setError('')
    
    try {
      const result = await window.electronAPI.getTableSchema(table.name, table.schema)
      if (result.success) {
        setTableSchema(result.schema)
        setSelectedTable(table)
        // Table schema loaded successfully
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTableData = useCallback(async () => {
    if (!selectedTable) {
      // No selected table available
      return
    }
    
    // Load table data
    setLoadingTableData(true)
    setError('')
    
    try {
      if (!window.electronAPI) {
        throw new Error('ElectronAPI not available')
      }
      
      // Call API to load table data
      const result = await window.electronAPI.getTableData(selectedTable.name, selectedTable.schema, 100)
      // API call completed
      
      if (result && result.success) {
        // Table data loaded successfully
        setTableData(result.data || [])
        setViewMode('data')
      } else {
        const errorMsg = result?.message || 'Unknown error loading table data'
        console.error('❌ Failed to load table data:', errorMsg)
        setError(errorMsg)
      }
    } catch (err) {
      console.error('❌ Table data loading error:', err)
      setError(err.message || 'Failed to load table data')
    } finally {
      setLoadingTableData(false)
    }
  }, [selectedTable])

  const loadTableRowCount = useCallback(async () => {
    if (!selectedTable) {
      // No selected table for row count
      return
    }
    
    // Load row count
    setLoadingRowCount(true)
    setError('')
    try {
      const result = await window.electronAPI.getTableRowCount(selectedTable.name, selectedTable.schema)
      if (result.success) {
        // Row count loaded successfully
        setTableRowCount(result.count)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingRowCount(false)
    }
  }, [selectedTable])

  const searchTableData = useCallback(async (filters) => {
    if (!selectedTable || filters.length === 0) {
      // Search cancelled - no table or filters
      return
    }
    
    // Start search
    setIsSearching(true)
    setError('')
    try {
      const result = await window.electronAPI.searchTableData(selectedTable.name, selectedTable.schema, filters)
      // Search API call completed
      if (result.success) {
        setSearchResults(result.data)
        // Search completed successfully
      } else {
        setError(result.message)
        console.error('❌ Search failed:', result.message)
      }
    } catch (err) {
      setError(err.message)
      console.error('❌ Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }, [selectedTable])

  const clearSearchResults = useCallback(() => {
    setSearchResults(null)
  }, [])

  // All useEffect hooks together
  useEffect(() => {
    // Only load tables once on mount
    loadTables()
    
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, []) // Remove loadTables dependency to prevent repeated calls

  useEffect(() => {
    if (selectedTable) {
      // Selected table changed - reset row count
      setTableRowCount(null)
      setTableData([])
      setViewMode('schema')
      setSearchResults(null)
    }
  }, [selectedTable])

  // useMemo hooks at the end
  const filteredTables = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return tables
    
    const term = debouncedSearchTerm.toLowerCase()
    return tables.filter(table =>
      table.name.toLowerCase().includes(term) ||
      table.schema.toLowerCase().includes(term)
    )
  }, [tables, debouncedSearchTerm])

  return {
    // State
    tables,
    selectedTable,
    tableSchema,
    tableData,
    tableRowCount,
    loadingRowCount,
    loadingTableData,
    viewMode,
    loading,
    error,
    searchTerm,
    filteredTables,
    searchResults,
    isSearching,
    
    // Actions
    setViewMode,
    setSearchTerm,
    setError,
    setLoading,
    setTableRowCount,
    loadTables,
    loadTableSchema,
    loadTableData,
    loadTableRowCount,
    searchTableData,
    clearSearchResults
  }
}
