import React, { memo, useMemo } from 'react'
import SearchInput from '../ui/SearchInput'
import Loader from '../ui/Loader'
import { getHighlightedTextParts } from '../../utils/textUtils'

// Helper function to render highlighted text
const renderHighlightedText = (text, searchTerm) => {
  const parts = getHighlightedTextParts(text, searchTerm)
  
  return parts.map((part) => 
    part.highlighted ? (
      <span key={part.key} className="highlight">{part.text}</span>
    ) : (
      part.text
    )
  )
}

export default memo(function TablesSidebar({
  filteredTables,
  searchTerm,
  loading,
  selectedTable,
  tables,
  onSearchChange,
  onSearchClear,
  onRefresh,
  onTableSelect
}) {
  // Memoize the table list to prevent unnecessary re-renders
  const tableList = useMemo(() => {
    return filteredTables.map((table, index) => (
      <div 
        key={`${table.schema}.${table.name}`}
        className={`table-item ${selectedTable?.name === table.name ? 'selected' : ''}`}
        onClick={() => onTableSelect(table)}
      >
        <div className="table-name">
          📊 {renderHighlightedText(table.name, searchTerm)}
        </div>
        <div className="table-schema">
          🏗️ {renderHighlightedText(table.schema, searchTerm)}
        </div>
      </div>
    ))
  }, [filteredTables, searchTerm, selectedTable, onTableSelect])
  return (
    <div className="tables-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <h3 className="sidebar-title">
            Tables ({filteredTables.length}{searchTerm && ` of ${tables.length}`})
          </h3>
          <button 
            className="refresh-button"
            onClick={onRefresh} 
            disabled={loading}
          >
            {loading ? <Loader size="small" text="" inline={true} /> : '↻'} 
            {!loading && ' Refresh'}
          </button>
        </div>
        
        <div className="search-section">
          <SearchInput
            value={searchTerm}
            onChange={onSearchChange}
            onClear={onSearchClear}
            placeholder="Search tables and schemas..."
            size="sm"
          />
          {searchTerm && (
            <div className="search-results-info">
              {filteredTables.length > 0 
                ? `Found ${filteredTables.length} table${filteredTables.length !== 1 ? 's' : ''}`
                : 'No tables found'
              }
            </div>
          )}
        </div>
      </div>
      
      <div className="tables-list">
        {loading && tables.length === 0 ? (
          <Loader 
            text="Loading tables..." 
            spinning={true}
            size="default"
          />
        ) : filteredTables.length > 0 ? (
          tableList
        ) : searchTerm ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <div>No tables found matching "{searchTerm}"</div>
            <button 
              onClick={onSearchClear}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="no-tables-state">
            <div className="no-tables-icon">📊</div>
            No tables available
          </div>
        )}
      </div>
    </div>
  )
})
