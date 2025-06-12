import React, { useState, useEffect } from 'react'
import { useDatabaseData } from '../hooks/useDatabaseData'
import { useDownloadManager } from '../hooks/useDownloadManager'
import DashboardHeader from './dashboard/DashboardHeader'
import StatsCards from './dashboard/StatsCards'
import TablesSidebar from './dashboard/TablesSidebar'
import SchemaDetails from './dashboard/SchemaDetails'
import './DatabaseDashboard.css'

export default function DatabaseDashboard({ config, onDisconnect }) {
  // Local loading state for specific actions
  const [sqlDownloadLoading, setSqlDownloadLoading] = useState(false)

  // Custom hooks for state management
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
  } = useDatabaseData()

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
  } = useDownloadManager(config)

  // Event handlers
  const handleSearchClear = () => {
    setSearchTerm('')
  }

  const handleSingleFileDownload = async () => {
    try {
      await downloadAllSchemasSingle(tables)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleIndividualFilesDownload = async () => {
    try {
      await downloadAllSchemasIndividual(tables)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSQLDownload = async () => {
    try {
      await downloadAllSchemasSQL(tables)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDownloadTableJSON = async () => {
    try {
      await downloadTableSchema(selectedTable, tableSchema)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDownloadTableSQL = async () => {
    try {
      setSqlDownloadLoading(true)
      await downloadTableSchemaSQL(selectedTable, tableSchema)
    } catch (err) {
      setError(err.message)
    } finally {
      setSqlDownloadLoading(false)
    }
  }

  const handleDownloadTablesList = async () => {
    try {
      // Simple array of table names
      const tableNames = tables.map(table => table.name)

      const result = await window.electronAPI.saveSchemaToFile(tableNames, `${config.database}_tables_list.json`)
      if (result.success) {
        alert(`Tables list downloaded successfully!\nSaved to: ${result.filePath}`)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // Auto-load row count when a table is selected
  useEffect(() => {
    if (selectedTable && tableRowCount === null) {
      console.log('🚀 Auto-loading row count for newly selected table:', selectedTable.name)
      const timer = setTimeout(() => {
        loadTableRowCount()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [selectedTable, tableRowCount])

  const handleTableSelect = async (table) => {
    console.log('🎯 Table selected:', table.name)
    await loadTableSchema(table)
  }

  const handleViewModeChange = async (mode) => {
    setViewMode(mode)
    // Auto-load data when switching to data view
    if (mode === 'data' && selectedTable && tableData.length === 0) {
      setTimeout(() => {
        loadTableData()
      }, 100) // Small delay to ensure view mode is set
    }
  }

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
