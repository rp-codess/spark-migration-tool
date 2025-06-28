import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDatabaseData } from '../hooks/useDatabaseData'
import { useDownloadManager } from '../hooks/useDownloadManager'
import DashboardHeader from './dashboard/DashboardHeader'
import StatsCards from './dashboard/StatsCards'
import TablesSidebar from './dashboard/TablesSidebar'
import SchemaDetails from './dashboard/SchemaDetails'
import './DatabaseDashboard.css'

export default function DatabaseDashboard({ config, onDisconnect }) {
  // All hooks must be called in the same order every time
  
  // 1. Local state hooks first
  const [sqlDownloadLoading, setSqlDownloadLoading] = useState(false)

  // 2. Custom hooks (always call these in the same order with stable references)
  // Ensure config is always defined to prevent conditional hook calls
  const stableConfig = useMemo(() => config || {}, [config])
  const databaseDataHook = useDatabaseData()
  const downloadManagerHook = useDownloadManager(stableConfig)

  // 3. Destructure after hooks are called
  const {
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
  } = databaseDataHook

  const {
    downloading,
    downloadProgress,
    downloadCancelled,
    cancelDownload,
    downloadAllSchemasSingle,
    downloadAllSchemasIndividual,
    downloadAllSchemasSQL,
    downloadTableSchema,
    downloadTableSchemaSQL
  } = downloadManagerHook

  // Memoized event handlers to prevent unnecessary re-renders
  const handleSearchClear = useCallback(() => {
    setSearchTerm('')
  }, [setSearchTerm])

  const handleSingleFileDownload = useCallback(async () => {
    try {
      await downloadAllSchemasSingle(tables)
    } catch (err) {
      setError(err.message)
    }
  }, [downloadAllSchemasSingle, tables, setError])

  const handleIndividualFilesDownload = useCallback(async () => {
    try {
      await downloadAllSchemasIndividual(tables)
    } catch (err) {
      setError(err.message)
    }
  }, [downloadAllSchemasIndividual, tables, setError])

  const handleSQLDownload = useCallback(async () => {
    try {
      await downloadAllSchemasSQL(tables)
    } catch (err) {
      setError(err.message)
    }
  }, [downloadAllSchemasSQL, tables, setError])

  const handleDownloadTableJSON = useCallback(async () => {
    try {
      await downloadTableSchema(selectedTable, tableSchema)
    } catch (err) {
      setError(err.message)
    }
  }, [downloadTableSchema, selectedTable, tableSchema, setError])

  const handleDownloadTableSQL = useCallback(async () => {
    try {
      setSqlDownloadLoading(true)
      await downloadTableSchemaSQL(selectedTable, tableSchema)
    } catch (err) {
      setError(err.message)
    } finally {
      setSqlDownloadLoading(false)
    }
  }, [downloadTableSchemaSQL, selectedTable, tableSchema, setError])

  const handleDownloadTablesList = useCallback(async () => {
    try {
      const tablesText = tables.map(t => `${t.schema}.${t.name}`).join('\n')
      const result = await window.electronAPI.saveSchemaToFile(tablesText, 'database-tables.txt')
      
      if (result.success) {
        alert(`Tables list saved successfully to: ${result.filePath}`)
      } else {
        throw new Error(result.error || 'Failed to save tables list')
      }
    } catch (err) {
      setError(err.message)
    }
  }, [tables, setError])

  // State for progress tracking of new download actions
  const [rowCountProgress, setRowCountProgress] = useState({ current: 0, total: 0 })
  const [emptyTablesProgress, setEmptyTablesProgress] = useState({ current: 0, total: 0 })
  const [rowCountCancelled, setRowCountCancelled] = useState(false)
  const [emptyTablesCancelled, setEmptyTablesCancelled] = useState(false)
  const rowCountCancelledRef = useRef(false)
  const emptyTablesCancelledRef = useRef(false)

  const cancelRowCountDownload = useCallback(() => {
    setRowCountCancelled(true)
    rowCountCancelledRef.current = true
  }, [])

  const cancelEmptyTablesDownload = useCallback(() => {
    setEmptyTablesCancelled(true)
    emptyTablesCancelledRef.current = true
  }, [])

  const handleDownloadTablesWithRowCount = useCallback(async () => {
    try {
      console.log('🔄 Starting tables with row count download...')
      setLoading(true)
      setRowCountCancelled(false)
      rowCountCancelledRef.current = false
      setRowCountProgress({ current: 0, total: tables.length })
      
      const tablesWithRowCount = []
      const batchSize = 10 // Process 10 tables at a time
      
      for (let i = 0; i < tables.length; i += batchSize) {
        if (rowCountCancelledRef.current) {
          console.log('❌ Row count download cancelled by user')
          alert('Row count download cancelled by user')
          return
        }

        const batch = tables.slice(i, i + batchSize)
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tables.length/batchSize)} (${batch.length} tables)`)
        
        // Process batch in parallel
        const batchPromises = batch.map(async (table) => {
          try {
            if (rowCountCancelledRef.current) return null
            
            console.log(`📊 Getting row count for ${table.schema}.${table.name}`)
            const rowCountResult = await window.electronAPI.getTableRowCount(table.name, table.schema)
            return {
              schema: table.schema,
              name: table.name,
              fullName: `${table.schema}.${table.name}`,
              rowCount: rowCountResult.success ? rowCountResult.count : 'Error'
            }
          } catch (err) {
            console.error(`❌ Error getting row count for ${table.schema}.${table.name}:`, err)
            return {
              schema: table.schema,
              name: table.name,
              fullName: `${table.schema}.${table.name}`,
              rowCount: 'Error'
            }
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        const validResults = batchResults.filter(result => result !== null)
        tablesWithRowCount.push(...validResults)
        
        // Update progress
        setRowCountProgress({ current: Math.min(i + batchSize, tables.length), total: tables.length })
        console.log(`✅ Completed batch ${Math.floor(i/batchSize) + 1}, total processed: ${tablesWithRowCount.length}`)
        
        // Small delay between batches to prevent overwhelming the database
        if (i + batchSize < tables.length && !rowCountCancelledRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      if (rowCountCancelledRef.current) {
        console.log('❌ Row count download cancelled by user')
        return
      }
      
      console.log('📝 Creating CSV content...')
      const csvContent = 'Schema,Table,Full Name,Row Count\n' + 
        tablesWithRowCount.map(t => `${t.schema},${t.name},${t.fullName},${t.rowCount}`).join('\n')
      
      console.log('💾 Saving CSV file to Documents/SparkMigrationTool...')
      const result = await window.electronAPI.saveSchemaToFile(csvContent, 'database-tables-with-rowcount.csv')
      
      if (result.success) {
        console.log('✅ Tables with row count download completed!')
        alert(`CSV file saved successfully to: ${result.filePath}`)
      } else {
        throw new Error(result.error || 'Failed to save CSV file')
      }
    } catch (err) {
      console.error('❌ Error in handleDownloadTablesWithRowCount:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRowCountProgress({ current: 0, total: 0 })
      setRowCountCancelled(false)
      rowCountCancelledRef.current = false
    }
  }, [tables, setError, setLoading])

  const handleDownloadEmptyTablesJSON = useCallback(async () => {
    try {
      console.log('🔄 Starting empty tables list download...')
      setLoading(true)
      setEmptyTablesCancelled(false)
      emptyTablesCancelledRef.current = false
      setEmptyTablesProgress({ current: 0, total: tables.length })
      
      const emptyTables = []
      const batchSize = 10 // Process 10 tables at a time
      
      for (let i = 0; i < tables.length; i += batchSize) {
        if (emptyTablesCancelledRef.current) {
          console.log('❌ Empty tables download cancelled by user')
          alert('Empty tables download cancelled by user')
          return
        }

        const batch = tables.slice(i, i + batchSize)
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tables.length/batchSize)} (${batch.length} tables)`)
        
        // Process batch in parallel
        const batchPromises = batch.map(async (table) => {
          try {
            if (emptyTablesCancelledRef.current) return null
            
            console.log(`📊 Checking row count for ${table.schema}.${table.name}`)
            const rowCountResult = await window.electronAPI.getTableRowCount(table.name, table.schema)
            if (rowCountResult.success && rowCountResult.count === 0) {
              console.log(`🔍 Found empty table: ${table.schema}.${table.name}`)
              return {
                schema: table.schema,
                name: table.name,
                fullName: `${table.schema}.${table.name}`
              }
            }
            return null
          } catch (err) {
            console.error(`❌ Error checking row count for ${table.schema}.${table.name}:`, err)
            return null
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        const batchEmptyTables = batchResults.filter(result => result !== null)
        emptyTables.push(...batchEmptyTables)
        
        // Update progress
        setEmptyTablesProgress({ current: Math.min(i + batchSize, tables.length), total: tables.length })
        console.log(`✅ Completed batch ${Math.floor(i/batchSize) + 1}, found ${batchEmptyTables.length} empty tables in this batch, total empty: ${emptyTables.length}`)
        
        // Small delay between batches to prevent overwhelming the database
        if (i + batchSize < tables.length && !emptyTablesCancelledRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      if (emptyTablesCancelledRef.current) {
        console.log('❌ Empty tables download cancelled by user')
        return
      }
      
      console.log(`📝 Creating JSON content with ${emptyTables.length} empty tables...`)
      const jsonContent = JSON.stringify({
        metadata: {
          exported: new Date().toISOString(),
          source: `${config.type.toUpperCase()}: ${config.host}/${config.database}`,
          totalTables: tables.length,
          emptyTablesCount: emptyTables.length,
          description: 'List of tables with zero row count'
        },
        emptyTables
      }, null, 2)
      
      console.log('💾 Saving JSON file to Documents/SparkMigrationTool...')
      const result = await window.electronAPI.saveSchemaToFile(jsonContent, 'database-empty-tables-list.json')
      
      if (result.success) {
        console.log('✅ Empty tables list download completed!')
        alert(`JSON file saved successfully to: ${result.filePath}`)
      } else {
        throw new Error(result.error || 'Failed to save JSON file')
      }
    } catch (err) {
      console.error('❌ Error in handleDownloadEmptyTablesJSON:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setEmptyTablesProgress({ current: 0, total: 0 })
      setEmptyTablesCancelled(false)
      emptyTablesCancelledRef.current = false
    }
  }, [tables, config, setError, setLoading])

  // Auto-load row count when a table is selected
  useEffect(() => {
    if (selectedTable && tableRowCount === null) {
      // Auto-load row count for newly selected table
      const timer = setTimeout(() => {
        loadTableRowCount()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [selectedTable, tableRowCount])

  const handleTableSelect = useCallback((table) => {
    loadTableSchema(table)
  }, [loadTableSchema])

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode)
  }, [setViewMode])

  return (
    <div className="database-dashboard animate-fadeIn">
      <DashboardHeader
        config={config}
        onDisconnect={onDisconnect}
        downloading={downloading}
        loading={loading}
        tables={tables}
        downloadProgress={downloadProgress}
        rowCountProgress={rowCountProgress}
        emptyTablesProgress={emptyTablesProgress}
        rowCountCancelled={rowCountCancelled}
        emptyTablesCancelled={emptyTablesCancelled}
        downloadCancelled={downloadCancelled}
        onSingleFileDownload={handleSingleFileDownload}
        onIndividualFilesDownload={handleIndividualFilesDownload}
        onSQLDownload={handleSQLDownload}
        onDownloadTablesList={handleDownloadTablesList}
        onDownloadTablesWithRowCount={handleDownloadTablesWithRowCount}
        onDownloadEmptyTablesJSON={handleDownloadEmptyTablesJSON}
        onCancelDownload={cancelDownload}
        onCancelRowCountDownload={cancelRowCountDownload}
        onCancelEmptyTablesDownload={cancelEmptyTablesDownload}
      />

      <div className="main-content">
        <StatsCards
          tablesCount={tables.length}
          selectedTable={selectedTable}
          tableSchema={tableSchema}
          tableRowCount={tableRowCount}
        />

        <div className="explorer-card">
          <div className="explorer-layout">
            <TablesSidebar
              filteredTables={filteredTables}
              searchTerm={searchTerm}
              loading={loading}
              selectedTable={selectedTable}
              tables={tables}
              onSearchChange={setSearchTerm}
              onSearchClear={handleSearchClear}
              onRefresh={loadTables}
              onTableSelect={handleTableSelect}
            />

            <SchemaDetails
              selectedTable={selectedTable}
              tableSchema={tableSchema}
              tableData={tableData}
              viewMode={viewMode}
              loading={loading || sqlDownloadLoading}
              loadingRowCount={loadingRowCount}
              loadingTableData={loadingTableData}
              searchResults={searchResults}
              isSearching={isSearching}
              onViewModeChange={handleViewModeChange}
              onLoadRowCount={loadTableRowCount}
              onLoadTableData={loadTableData}
              onDownloadJSON={handleDownloadTableJSON}
              onDownloadSQL={handleDownloadTableSQL}
              onSearch={searchTableData}
              onClearSearch={clearSearchResults}
            />
          </div>
        </div>

        {error && (
          <div className="error-message">
            ❌ <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  )
}
