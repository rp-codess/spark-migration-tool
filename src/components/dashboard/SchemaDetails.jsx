import React, { useState } from 'react'
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
  const [copyFeedback, setCopyFeedback] = useState(false)
  
  const handleCopyTableName = async () => {
    if (!selectedTable) return
    
    // Extract table name without schema prefix (e.g., "public.tbRoleTable" -> "tbRoleTable")
    const tableName = selectedTable.name.includes('.') 
      ? selectedTable.name.split('.').pop() 
      : selectedTable.name
    
    try {
      await navigator.clipboard.writeText(tableName)
      
      // Play click sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIfCD+N0fPZfCkGLITM9N2QQgkUXrHm66hSFApGod/xwmMeBT+N0/PY')
      audio.volume = 0.3
      audio.play().catch(() => {}) // Ignore errors if audio fails
      
      // Show feedback
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
      
      console.log('Table name copied to clipboard:', tableName)
    } catch (err) {
      console.error('Failed to copy table name:', err)
    }
  }

  return (
    <div className="schema-details">
      <div className="schema-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 className="schema-title">
            {selectedTable ? `${selectedTable.schema}.${selectedTable.name}` : 'Select a table to view details'}
          </h3>
          
          {/* Copy Table Name Button */}
          {selectedTable && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleCopyTableName}
                title="Copy table name to clipboard"
                style={{
                  padding: '4px 8px',
                  border: '1px solid var(--border-color)',
                  background: copyFeedback ? '#4CAF50' : 'var(--bg-secondary)',
                  color: copyFeedback ? 'white' : 'var(--text-secondary)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  transform: copyFeedback ? 'scale(0.95)' : 'scale(1)'
                }}
              >
                {copyFeedback ? '✅' : '📋'} {copyFeedback ? 'Copied!' : 'Copy'}
              </button>
              
              {/* Toast notification */}
              {copyFeedback && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-35px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#333',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    animation: 'fadeInOut 2s ease-in-out'
                  }}
                >
                  Copied to clipboard!
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: '4px solid #333'
                    }}
                  />
                </div>
              )}
            </div>
          )}
          
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
      
      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(5px); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0px); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0px); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-5px); }
        }
      `}</style>
    </div>
  )
}
