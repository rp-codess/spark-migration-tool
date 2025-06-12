import React, { useState } from 'react'
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
    setViewMode,
    setSearchTerm,
    setError,
    setLoading, // Add this line
    loadTables,
    loadTableSchema,
    loadTableData,
    loadTableRowCount
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
      setSqlDownloadLoading(true) // Use local loading state
      await downloadTableSchemaSQL(selectedTable, tableSchema)
    } catch (err) {
      setError(err.message)
    } finally {
      setSqlDownloadLoading(false) // Use local loading state
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
              onTableSelect={loadTableSchema}
            />

            <SchemaDetails
              selectedTable={selectedTable}
              tableSchema={tableSchema}
              tableData={tableData}
              viewMode={viewMode}
              loading={loading || sqlDownloadLoading} // Combine both loading states
              loadingRowCount={loadingRowCount}
              loadingTableData={loadingTableData}
              onViewModeChange={setViewMode}
              onLoadRowCount={loadTableRowCount}
              onLoadTableData={loadTableData}
              onDownloadJSON={handleDownloadTableJSON}
              onDownloadSQL={handleDownloadTableSQL}
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
