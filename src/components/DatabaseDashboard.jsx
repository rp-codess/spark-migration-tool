import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
      const blob = new Blob([tablesText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'database-tables.txt'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }, [tables, setError])

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
        tables={tables}
        downloadProgress={downloadProgress}
        downloadCancelled={downloadCancelled}
        onSingleFileDownload={handleSingleFileDownload}
        onIndividualFilesDownload={handleIndividualFilesDownload}
        onSQLDownload={handleSQLDownload}
        onDownloadTablesList={handleDownloadTablesList}
        onCancelDownload={cancelDownload}
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
