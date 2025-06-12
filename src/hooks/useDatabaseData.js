import { useState, useEffect } from 'react'

export function useDatabaseData() {
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

  useEffect(() => {
    loadTables()
  }, [])

  // Reset everything when selectedTable changes
  useEffect(() => {
    if (selectedTable) {
      console.log('🔄 Selected table changed to:', selectedTable.name, '- Resetting row count')
      setTableRowCount(null)
      setTableData([])
      setViewMode('schema')
    }
  }, [selectedTable])

  const loadTables = async () => {
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
    }
  }

  const loadTableSchema = async (table) => {
    console.log('🔄 Loading table schema for:', table.name)
    setLoading(true)
    setError('')
    
    try {
      const result = await window.electronAPI.getTableSchema(table.name, table.schema)
      if (result.success) {
        setTableSchema(result.schema)
        setSelectedTable(table) // This will trigger the useEffect above
        console.log('✅ Table schema loaded for:', table.name)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTableData = async () => {
    if (!selectedTable) return
    
    setLoadingTableData(true)
    setError('')
    try {
      const result = await window.electronAPI.getTableData(selectedTable.name, selectedTable.schema, 100)
      if (result.success) {
        setTableData(result.data)
        setViewMode('data')
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingTableData(false)
    }
  }

  const loadTableRowCount = async () => {
    if (!selectedTable) {
      console.log('❌ No selected table for row count')
      return
    }
    
    console.log('🔢 Loading row count for:', selectedTable.name)
    setLoadingRowCount(true)
    setError('')
    try {
      const result = await window.electronAPI.getTableRowCount(selectedTable.name, selectedTable.schema)
      if (result.success) {
        console.log('✅ Row count loaded:', result.count, 'for table:', selectedTable.name)
        setTableRowCount(result.count)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingRowCount(false)
    }
  }

  // Filter tables based on search term
  const filteredTables = tables.filter(table => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      table.name.toLowerCase().includes(searchLower) ||
      table.schema.toLowerCase().includes(searchLower)
    )
  })

  const searchTableData = async (filters) => {
    if (!selectedTable || filters.length === 0) return
    
    setIsSearching(true)
    setError('')
    try {
      const result = await window.electronAPI.searchTableData(selectedTable.name, selectedTable.schema, filters)
      if (result.success) {
        setSearchResults(result.data)
        console.log('✅ Search completed:', result.data.length, 'results found')
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const clearSearchResults = () => {
    setSearchResults(null)
  }

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
