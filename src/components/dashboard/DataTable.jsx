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
    <div>
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
        <div>
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
              🔍 Showing {displayData.length} search result{displayData.length !== 1 ? 's' : ''} from entire table (top 10 matches)
            </div>
          )}
          
          {!isShowingSearchResults && (
            <div style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              📊 Showing top {displayData.length} rows (use search to filter entire table)
            </div>
          )}

          {/* Data Table */}
          <div style={{ 
            width: '100%',
            maxWidth: 'calc(100vw - 400px)',
            height: '500px',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'auto'
          }}>
            <table style={{
              borderCollapse: 'collapse',
              fontSize: '13px',
              width: 'max-content',
              minWidth: '100%',
              display: 'table'
            }}>
              <thead style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 10,
                borderBottom: '2px solid var(--border-color)'
              }}>
                <tr>
                  {Object.keys(displayData[0]).map((column, index) => (
                    <th key={index} style={{ 
                      minWidth: '200px',
                      width: '200px',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderBottom: '2px solid var(--border-color)',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0
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
                        padding: '6px 12px',
                        minWidth: '200px',
                        width: '200px',
                        border: '1px solid var(--border-color)',
                        fontSize: '13px',
                        verticalAlign: 'top',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
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
            <div style={{ 
              padding: '8px 12px', 
              textAlign: 'center', 
              color: 'var(--text-secondary)', 
              fontSize: '12px',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
              fontWeight: '500',
              position: 'sticky',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 5
            }}>
              {isShowingSearchResults 
                ? `Showing ${displayData.length} search results (top 10 from entire table)`
                : `Showing top ${displayData.length} rows`
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
