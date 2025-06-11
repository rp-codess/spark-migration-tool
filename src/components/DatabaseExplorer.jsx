import React, { useState, useEffect } from 'react'

export default function DatabaseExplorer({ connected }) {
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableSchema, setTableSchema] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (connected) {
      loadTables()
    } else {
      setTables([])
      setSelectedTable(null)
      setTableSchema([])
    }
  }, [connected])

  const loadTables = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await window.electronAPI.getTables()
      if (result.success) {
        setTables(result.tables)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTableSchema = async (table) => {
    setLoading(true)
    setError('')
    try {
      const result = await window.electronAPI.getTableSchema(table.name, table.schema)
      if (result.success) {
        setTableSchema(result.schema)
        setSelectedTable(table)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!connected) {
    return (
      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
        <h3>Database Explorer</h3>
        <p>Please connect to a database first to explore tables and schema.</p>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
      <h3>Database Explorer</h3>
      
      <div style={{ display: 'flex', gap: '20px', height: '400px' }}>
        {/* Tables List */}
        <div style={{ flex: '1', border: '1px solid #ddd', borderRadius: '4px' }}>
          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
            <strong>Tables ({tables.length})</strong>
            <button 
              onClick={loadTables} 
              style={{ float: 'right', padding: '4px 8px', fontSize: '12px' }}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <div style={{ height: '340px', overflowY: 'auto', padding: '10px' }}>
            {loading && tables.length === 0 ? (
              <div>Loading tables...</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {tables.map((table, index) => (
                  <li 
                    key={index}
                    onClick={() => loadTableSchema(table)}
                    style={{ 
                      padding: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedTable?.name === table.name ? '#e3f2fd' : 'transparent',
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = selectedTable?.name === table.name ? '#e3f2fd' : 'transparent'}
                  >
                    <div style={{ fontWeight: 'bold' }}>📊 {table.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Schema: {table.schema}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Schema Details */}
        <div style={{ flex: '2', border: '1px solid #ddd', borderRadius: '4px' }}>
          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
            <strong>
              {selectedTable ? `Schema: ${selectedTable.schema}.${selectedTable.name}` : 'Select a table to view schema'}
            </strong>
          </div>
          <div style={{ height: '340px', overflowY: 'auto' }}>
            {loading && selectedTable ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Loading schema...</div>
            ) : selectedTable && tableSchema.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Column</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Nullable</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  {tableSchema.map((column, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        {column.COLUMN_NAME || column.column_name}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        {column.DATA_TYPE || column.data_type}
                        {(column.CHARACTER_MAXIMUM_LENGTH || column.character_maximum_length) && 
                          `(${column.CHARACTER_MAXIMUM_LENGTH || column.character_maximum_length})`}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        {(column.IS_NULLABLE || column.is_nullable) === 'YES' ? '✓' : '✗'}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                        {column.COLUMN_DEFAULT || column.column_default || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                {selectedTable ? 'No schema information available' : 'Select a table from the list to view its schema'}
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          marginTop: '10px',
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px' 
        }}>
          Error: {error}
        </div>
      )}
    </div>
  )
}
