import React from 'react'
import Button from '../ui/Button'
import SchemaTable from './SchemaTable'
import DataTable from './DataTable'

export default function SchemaDetails({
  selectedTable,
  tableSchema,
  tableData,
  viewMode,
  loading,
  loadingRowCount,
  loadingTableData,
  onViewModeChange,
  onLoadRowCount,
  onLoadTableData,
  onDownloadJSON,
  onDownloadSQL,
  searchResults,
  isSearching,
  onSearch,
  onClearSearch
}) {
  return (
    <div className="schema-details">
      <div className="schema-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 className="schema-title">
            {selectedTable ? `${selectedTable.schema}.${selectedTable.name}` : 'Select a table to view details'}
          </h3>
          
          {/* View Mode Toggle */}
          {selectedTable && tableSchema.length > 0 && (
            <div className="view-toggle" style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              <button
                className={`toggle-btn ${viewMode === 'schema' ? 'active' : ''}`}
                onClick={() => onViewModeChange('schema')}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--border-color)',
                  background: viewMode === 'schema' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                  color: viewMode === 'schema' ? 'white' : 'var(--text-primary)',
                  borderRadius: '4px 0 0 4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                📋 Schema
              </button>
              <button
                className={`toggle-btn ${viewMode === 'data' ? 'active' : ''}`}
                onClick={() => onViewModeChange('data')}
                style={{
                  padding: '6px 12px',
                  border: '1px solid var(--border-color)',
                  background: viewMode === 'data' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                  color: viewMode === 'data' ? 'white' : 'var(--text-primary)',
                  borderRadius: '0 4px 4px 0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                📊 Data
              </button>
            </div>
          )}
        </div>
        
        {selectedTable && tableSchema.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <Button
              onClick={onLoadRowCount}
              disabled={loadingRowCount}
              variant="info"
              icon={loadingRowCount ? '⏳' : '🔢'}
              size="sm"
              loading={loadingRowCount}
            >
              Count Rows
            </Button>
            
            <Button
              onClick={onLoadTableData}
              disabled={loadingTableData}
              variant="warning"
              icon={loadingTableData ? '⏳' : '👁️'}
              size="sm"
              loading={loadingTableData}
            >
              Show Top 100
            </Button>
            
            <Button
              onClick={onDownloadJSON}
              variant="success"
              icon="📥"
              size="sm"
            >
              JSON
            </Button>
            <Button
              onClick={onDownloadSQL}
              variant="primary"
              icon="💾"
              size="sm"
            >
              SQL
            </Button>
          </div>
        )}
      </div>
      
      <div className="schema-content">
        {loading && selectedTable ? (
          <div className="loading-state">
            <div className="loading-icon">⏳</div>
            Loading...
          </div>
        ) : selectedTable && tableSchema.length > 0 ? (
          <>
            {viewMode === 'schema' && (
              <SchemaTable tableSchema={tableSchema} />
            )}
            {viewMode === 'data' && (
              <DataTable 
                tableData={tableData} 
                loadingTableData={loadingTableData}
                tableSchema={tableSchema}
                searchResults={searchResults}
                isSearching={isSearching}
                onSearch={onSearch}
                onClearSearch={onClearSearch}
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3 className="empty-title">
              {selectedTable ? 'No schema information available' : 'Select a table from the list'}
            </h3>
            <p className="empty-description">
              {selectedTable ? 'This table might be empty or have access restrictions' : 'Click on any table to view its schema details'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
