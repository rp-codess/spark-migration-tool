import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Dropdown } from 'antd'
import { 
  SettingOutlined,
  NumberOutlined,
  EyeOutlined,
  BugOutlined,
  DownloadOutlined,
  DatabaseOutlined
} from '@ant-design/icons'
import CustomButton from '../ui/Button'
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
  const feedbackTimeoutRef = useRef(null)
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])
  
  const handleCopyTableName = useCallback(async () => {
    if (!selectedTable) return
    
    // Extract table name without schema prefix (e.g., "public.tbRoleTable" -> "tbRoleTable")
    const tableName = selectedTable.name.includes('.') 
      ? selectedTable.name.split('.').pop() 
      : selectedTable.name
    
    try {
      await navigator.clipboard.writeText(tableName)
      
      // Clear existing timeout
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current)
      }
      
      // Show feedback
      setCopyFeedback(true)
      feedbackTimeoutRef.current = setTimeout(() => {
        setCopyFeedback(false)
        feedbackTimeoutRef.current = null
      }, 1500)
      
      console.log('Table name copied to clipboard:', tableName)
    } catch (err) {
      console.error('Failed to copy table name:', err)
    }
  }, [selectedTable])

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
                  transition: 'all 0.15s ease',
                  transform: copyFeedback ? 'scale(0.98)' : 'scale(1)',
                  willChange: 'transform, background-color'
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
                onClick={() => {
                  console.log('🔄 Switching to data view')
                  onViewModeChange('data')
                  // Auto-load data if not already loaded
                  if (!tableData || tableData.length === 0) {
                    console.log('🔄 Auto-loading table data')
                    onLoadTableData()
                  }
                }}
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
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'count-rows',
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <NumberOutlined />
                        <span>Count Rows</span>
                      </span>
                    ),
                    onClick: onLoadRowCount,
                    disabled: loadingRowCount
                  },
                  {
                    key: 'show-top-100',
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <EyeOutlined />
                        <span>Show Top 100</span>
                      </span>
                    ),
                    onClick: onLoadTableData,
                    disabled: loadingTableData
                  },
                  ...(process.env.NODE_ENV === 'development' ? [{
                    key: 'debug-load',
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BugOutlined />
                        <span>Debug Load</span>
                      </span>
                    ),
                    onClick: () => {
                      console.log('🐛 Debug button clicked')
                      console.log('🐛 Selected table:', selectedTable)
                      console.log('🐛 Table data:', tableData)
                      console.log('🐛 Loading state:', loadingTableData)
                      onLoadTableData()
                    }
                  }] : []),
                  {
                    type: 'divider'
                  },
                  {
                    key: 'download-json',
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DownloadOutlined />
                        <span>Download JSON</span>
                      </span>
                    ),
                    onClick: onDownloadJSON
                  },
                  {
                    key: 'download-sql',
                    label: (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DatabaseOutlined />
                        <span>Download SQL</span>
                      </span>
                    ),
                    onClick: onDownloadSQL
                  }
                ],
                onClick: ({ key }) => {
                  // Handle clicks through the menu items themselves
                }
              }}
              placement="bottomLeft"
            >
              <Button
                type="default"
                icon={<SettingOutlined />}
                loading={loadingRowCount || loadingTableData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Table Actions
              </Button>
            </Dropdown>
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
