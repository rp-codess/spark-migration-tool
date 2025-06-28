import React from 'react'
import DataSearchFilter from './DataSearchFilter'

export default function DataTable({ 
  tableData, 
  loadingTableData, 
  tableSchema,
  searchResults,
  isSearching,
  onSearch,
  onClearSearch 
}) {
  if (loadingTableData) {
    return (
      <div className="loading-state">
        <div className="loading-icon">⏳</div>
        Loading table data...
      </div>
    )
  }

  // Use search results if available, otherwise use regular table data
  const displayData = searchResults || tableData
  const isShowingSearchResults = searchResults !== null

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* Search Filter Component */}
      <DataSearchFilter
        tableSchema={tableSchema}
        onSearch={onSearch}
        isSearching={isSearching}
        searchResults={searchResults}
        onClearSearch={onClearSearch}
      />

      {/* Data Display */}
      {!displayData.length ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3 className="empty-title">
            {isShowingSearchResults ? 'No results found' : 'No data available'}
          </h3>
          <p className="empty-description">
            {isShowingSearchResults 
              ? 'Try adjusting your search filters'
              : 'This table appears to be empty or data couldn\'t be retrieved'
            }
          </p>
        </div>
      ) : (
        <div style={{ width: '100%' }}>
          {/* Result Info */}
          {isShowingSearchResults && (
            <div style={{
              background: 'var(--color-success)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              🔍 Found {displayData.length} search result{displayData.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* HORIZONTAL SCROLLABLE TABLE CONTAINER */}
          <div style={{ 
            width: '100%',
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: '500px',
            border: '2px solid var(--border-color)',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-primary)',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin'
          }}>
            <table style={{
              width: 'max-content',
              minWidth: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              backgroundColor: 'var(--bg-primary)'
            }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  {Object.keys(displayData[0]).map((column, index) => (
                    <th key={index} style={{ 
                      minWidth: '200px',
                      width: '200px',
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '13px',
                      borderBottom: '2px solid var(--border-color)',
                      borderRight: '1px solid var(--border-color)',
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      zIndex: 10,
                      whiteSpace: 'nowrap'
                    }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{
                    backgroundColor: rowIndex % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
                  }}>
                    {Object.values(row).map((value, colIndex) => (
                      <td key={colIndex} style={{ 
                        minWidth: '200px',
                        width: '200px',
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        borderRight: '1px solid var(--border-color)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '200px'
                      }}>
                        {value === null ? (
                          <span style={{ 
                            color: 'var(--text-tertiary)', 
                            fontStyle: 'italic',
                            fontSize: '12px'
                          }}>
                            NULL
                          </span>
                        ) : value === '' ? (
                          <span style={{ 
                            color: 'var(--text-tertiary)', 
                            fontStyle: 'italic',
                            fontSize: '12px'
                          }}>
                            (empty)
                          </span>
                        ) : (
                          <span title={String(value)}>
                            {String(value)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer Info */}
          <div style={{ 
            padding: '8px 12px', 
            textAlign: 'center', 
            color: 'var(--text-secondary)', 
            fontSize: '12px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            marginTop: '1px'
          }}>
            {isShowingSearchResults 
              ? `Showing ${displayData.length} search results`
              : `Showing ${displayData.length} rows`
            }
          </div>
        </div>
      )}
    </div>
  )
}
