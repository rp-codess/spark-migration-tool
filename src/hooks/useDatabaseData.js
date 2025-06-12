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

  useEffect(() => {
    loadTables()
  }, [])

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
    setLoading(true)
    setError('')
    setTableRowCount(null)
    setTableData([])
    setViewMode('schema')
    try {
      const result = await window.electronAPI.getTableSchema(table.name, table.schema)
      if (result.success) {
        setTableSchema(result.schema)
        setSelectedTable(table)
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
    if (!selectedTable) return
    
    setLoadingRowCount(true)
    setError('')
    try {
      const result = await window.electronAPI.getTableRowCount(selectedTable.name, selectedTable.schema)
      if (result.success) {
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
    
    // Actions
    setViewMode,
    setSearchTerm,
    setError,
    setLoading,
    loadTables,
    loadTableSchema,
    loadTableData,
    loadTableRowCount
  }
}
