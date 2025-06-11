import React, { useState, useEffect, useRef } from 'react'
import Button from './ui/Button'
import ThemeToggle from './ui/ThemeToggle'

export default function DatabaseDashboard({ config, onDisconnect }) {
  const [tables, setTables] = useState([])
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableSchema, setTableSchema] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)
  const [downloadCancelled, setDownloadCancelled] = useState(false)
  
  // Use ref to track cancellation immediately
  const cancelledRef = useRef(false)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    loadTables()
  }, [])

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

  const cancelDownload = () => {
    console.log('Cancel download clicked - immediate action')
    setDownloadCancelled(true)
    cancelledRef.current = true
    
    // Abort any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Force reset the download state
    setTimeout(() => {
      setDownloading(false)
      setDownloadProgress({ current: 0, total: 0 })
      setShowDownloadOptions(false)
      console.log('Download state reset')
    }, 100)
  }

  const downloadAllSchemasSingle = async () => {
    console.log('Starting single file download')
    setDownloading(true)
    setDownloadCancelled(false)
    cancelledRef.current = false
    abortControllerRef.current = new AbortController()
    setDownloadProgress({ current: 0, total: tables.length })
    
    try {
      const allSchemas = {}
      
      for (let i = 0; i < tables.length; i++) {
        // Multiple cancellation checks
        if (cancelledRef.current || abortControllerRef.current.signal.aborted) {
          console.log('Download cancelled at table', i)
          alert('Download cancelled by user')
          return
        }

        const table = tables[i]
        console.log(`Processing table ${i + 1}/${tables.length}: ${table.name}`)
        setDownloadProgress({ current: i + 1, total: tables.length })
        
        // Add a small delay to allow UI updates and cancellation checks
        await new Promise(resolve => setTimeout(resolve, 10))
        
        if (cancelledRef.current) {
          console.log('Download cancelled during delay')
          alert('Download cancelled by user')
          return
        }

        try {
          const result = await window.electronAPI.getTableSchema(table.name, table.schema)
          
          if (cancelledRef.current) {
            console.log('Download cancelled after schema fetch')
            alert('Download cancelled by user')
            return
          }
          
          if (result.success) {
            allSchemas[`${table.schema}.${table.name}`] = {
              tableName: table.name,
              schema: table.schema,
              columns: result.schema
            }
          }
        } catch (error) {
          console.error(`Error fetching schema for ${table.name}:`, error)
        }
      }

      if (!cancelledRef.current) {
        console.log('Saving combined schema file')
        const schemaData = {
          database: config.database,
          host: config.host,
          type: config.type,
          exportDate: new Date().toISOString(),
          totalTables: tables.length,
          tables: allSchemas
        }

        const result = await window.electronAPI.saveSchemaToFile(schemaData, `${config.database}_all_schemas.json`)
        if (result.success) {
          alert(`All schemas downloaded successfully!\nSaved to: ${result.filePath}`)
        } else {
          setError(result.message)
        }
      }
    } catch (err) {
      if (!cancelledRef.current) {
        console.error('Download error:', err)
        setError(err.message)
      }
    } finally {
      console.log('Cleaning up download state')
      setDownloading(false)
      setDownloadCancelled(false)
      cancelledRef.current = false
      abortControllerRef.current = null
      setDownloadProgress({ current: 0, total: 0 })
      setShowDownloadOptions(false)
    }
  }

  const downloadAllSchemasIndividual = async () => {
    console.log('Starting individual files download')
    setDownloading(true)
    setDownloadCancelled(false)
    cancelledRef.current = false
    abortControllerRef.current = new AbortController()
    setDownloadProgress({ current: 0, total: tables.length })
    
    try {
      const folderData = {
        database: config.database,
        host: config.host,
        type: config.type,
        exportDate: new Date().toISOString(),
        totalTables: tables.length
      }

      let successCount = 0
      let errors = []

      for (let i = 0; i < tables.length; i++) {
        // Multiple cancellation checks
        if (cancelledRef.current || abortControllerRef.current.signal.aborted) {
          console.log('Download cancelled at table', i)
          alert(`Download cancelled by user.\nDownloaded ${successCount}/${tables.length} files before cancellation.`)
          return
        }

        const table = tables[i]
        console.log(`Processing table ${i + 1}/${tables.length}: ${table.name}`)
        setDownloadProgress({ current: i + 1, total: tables.length })
        
        // Add a small delay to allow UI updates and cancellation checks
        await new Promise(resolve => setTimeout(resolve, 10))
        
        if (cancelledRef.current) {
          console.log('Download cancelled during delay')
          alert(`Download cancelled by user.\nDownloaded ${successCount}/${tables.length} files before cancellation.`)
          return
        }

        try {
          const result = await window.electronAPI.getTableSchema(table.name, table.schema)
          
          if (cancelledRef.current) {
            console.log('Download cancelled after schema fetch')
            alert(`Download cancelled by user.\nDownloaded ${successCount}/${tables.length} files before cancellation.`)
            return
          }
          
          if (result.success) {
            const tableSchemaData = {
              ...folderData,
              table: {
                name: table.name,
                schema: table.schema,
                columns: result.schema
              }
            }

            const folderPath = `${config.database}_schemas/${table.schema}_${table.name}.json`
            const saveResult = await window.electronAPI.saveSchemaToFile(tableSchemaData, folderPath)
            
            if (saveResult.success) {
              console.log(`Successfully saved: ${saveResult.filePath}`)
              successCount++
            } else {
              console.error(`Failed to save ${table.name}:`, saveResult.message)
              errors.push(`${table.name}: ${saveResult.message}`)
            }
          } else {
            console.error(`Failed to get schema for ${table.name}:`, result.message)
            errors.push(`${table.name}: ${result.message}`)
          }
        } catch (err) {
          console.error(`Error processing ${table.name}:`, err)
          errors.push(`${table.name}: ${err.message}`)
        }
      }

      if (!cancelledRef.current) {
        if (errors.length > 0) {
          alert(`Download completed with issues:\nSuccessful: ${successCount}/${tables.length}\nErrors: ${errors.length}\n\nFirst few errors:\n${errors.slice(0, 3).join('\n')}`)
        } else {
          alert(`All ${successCount} schemas downloaded successfully!\nSaved to: Documents/SparkMigrationTool/${config.database}_schemas/`)
        }
      }
    } catch (err) {
      if (!cancelledRef.current) {
        console.error('Download error:', err)
        setError(err.message)
      }
    } finally {
      console.log('Cleaning up download state')
      setDownloading(false)
      setDownloadCancelled(false)
      cancelledRef.current = false
      abortControllerRef.current = null
      setDownloadProgress({ current: 0, total: 0 })
      setShowDownloadOptions(false)
    }
  }

  const downloadTableSchema = async () => {
    if (!selectedTable || !tableSchema.length) return
    
    try {
      const schemaData = {
        database: config.database,
        host: config.host,
        type: config.type,
        exportDate: new Date().toISOString(),
        table: {
          name: selectedTable.name,
          schema: selectedTable.schema,
          columns: tableSchema
        }
      }

      await window.electronAPI.saveSchemaToFile(schemaData, `${selectedTable.schema}_${selectedTable.name}_schema.json`)
      alert('Table schema downloaded successfully!')
    } catch (err) {
      setError(err.message)
    }
  }

  const headerStyles = {
    background: 'var(--gradient-primary)',
    color: 'white',
    padding: '20px',
    boxShadow: 'var(--shadow-lg)'
  }

  const cardStyles = {
    background: 'var(--bg-primary)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
    border: '1px solid var(--border-color)'
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }} className="animate-fadeIn">
      {/* Header */}
      <div style={headerStyles} className="animate-slideInDown">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              📊 Database Explorer
            </h1>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>
              {config.type.toUpperCase()} • {config.host} • {config.database}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <ThemeToggle />
            <div style={{ position: 'relative' }}>
              <Button
                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                disabled={downloading || tables.length === 0}
                variant="success"
                icon={downloading ? '⏳' : '📥'}
              >
                Download All Schemas ▼
              </Button>
              
              {/* Download options dropdown */}
              {showDownloadOptions && !downloading && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 1000,
                  minWidth: '250px',
                  marginTop: '4px'
                }} className="animate-scaleIn">
                  <button
                    onClick={downloadAllSchemasSingle}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-color)'
                    }}
                  >
                    📄 Single JSON File
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      All schemas in one file
                    </div>
                  </button>
                  <button
                    onClick={downloadAllSchemasIndividual}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                  >
                    📁 Individual Files
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Separate file for each table
                    </div>
                  </button>
                </div>
              )}
            </div>
            <Button
              onClick={onDisconnect}
              variant="danger"
              icon="🔌"
            >
              Disconnect
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        {downloading && (
          <div style={{ maxWidth: '1200px', margin: '16px auto 0 auto' }} className="animate-slideInDown">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', opacity: 0.9 }}>
                {downloadCancelled ? 'Cancelling...' : `Downloading schemas... (${downloadProgress.current}/${downloadProgress.total})`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', opacity: 0.9 }}>
                  {downloadProgress.total > 0 ? Math.round((downloadProgress.current / downloadProgress.total) * 100) : 0}%
                </span>
                <Button
                  onClick={cancelDownload}
                  disabled={downloadCancelled}
                  variant="danger"
                  size="sm"
                  loading={downloadCancelled}
                  icon="✕"
                >
                  Cancel
                </Button>
              </div>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                backgroundColor: downloadCancelled ? '#ffc107' : '#28a745',
                width: downloadProgress.total > 0 ? `${(downloadProgress.current / downloadProgress.total) * 100}%` : '0%',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            ...cardStyles,
            padding: '20px',
            textAlign: 'center'
          }} className="animate-scaleIn">
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{tables.length}</div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Total Tables</div>
          </div>
          <div style={{
            ...cardStyles,
            padding: '20px',
            textAlign: 'center'
          }} className="animate-scaleIn">
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-success)' }}>
              {selectedTable ? tableSchema.length : 0}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Columns Selected</div>
          </div>
        </div>

        {/* Main Explorer */}
        <div style={cardStyles}>
          <div style={{ display: 'flex', height: '600px' }}>
            {/* Tables Sidebar */}
            <div style={{ width: '350px', borderRight: `1px solid var(--border-color)` }}>
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: `1px solid var(--border-color)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Tables ({tables.length})</h3>
                <button 
                  onClick={loadTables} 
                  disabled={loading}
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: `1px solid var(--border-color)`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--bg-tertiary)'
                  }}
                >
                  {loading ? '🔄' : '↻'} Refresh
                </button>
              </div>
              
              <div style={{ height: '532px', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
                {loading && tables.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                    Loading tables...
                  </div>
                ) : (
                  <div style={{ padding: '8px' }}>
                    {tables.map((table, index) => (
                      <div 
                        key={index}
                        onClick={() => loadTableSchema(table)}
                        style={{ 
                          padding: '12px',
                          cursor: 'pointer',
                          backgroundColor: selectedTable?.name === table.name ? 'var(--color-primary)' : 'transparent',
                          borderRadius: '8px',
                          marginBottom: '4px',
                          border: selectedTable?.name === table.name ? `2px solid var(--color-primary)` : '2px solid transparent',
                          transition: 'all 0.2s ease',
                          color: selectedTable?.name === table.name ? 'white' : 'var(--text-primary)'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedTable?.name !== table.name) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                            e.currentTarget.style.color = 'var(--text-primary)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedTable?.name !== table.name) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = 'var(--text-primary)'
                          }
                        }}
                      >
                        <div style={{ 
                          fontWeight: '600', 
                          marginBottom: '4px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          color: 'inherit'
                        }}>
                          📊 {table.name}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: selectedTable?.name === table.name ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px' 
                        }}>
                          🏗️ {table.schema}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Schema Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: `1px solid var(--border-color)`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>
                  {selectedTable ? `${selectedTable.schema}.${selectedTable.name}` : 'Select a table to view schema'}
                </h3>
                {selectedTable && tableSchema.length > 0 && (
                  <Button
                    onClick={downloadTableSchema}
                    variant="success"
                    icon="📥"
                    size="sm"
                  >
                    Download Schema
                  </Button>
                )}
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
                {loading && selectedTable ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                    Loading schema...
                  </div>
                ) : selectedTable && tableSchema.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          borderBottom: `2px solid var(--border-color)`, 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>Column</th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          borderBottom: `2px solid var(--border-color)`, 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>Type</th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          borderBottom: `2px solid var(--border-color)`, 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>Nullable</th>
                        <th style={{ 
                          padding: '12px', 
                          textAlign: 'left', 
                          borderBottom: `2px solid var(--border-color)`, 
                          fontWeight: '600',
                          color: 'var(--text-primary)'
                        }}>Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableSchema.map((column, index) => (
                        <tr key={index} style={{ 
                          borderBottom: `1px solid var(--border-color)`,
                          backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
                        }}>
                          <td style={{ 
                            padding: '12px', 
                            fontWeight: '500',
                            color: 'var(--text-primary)'
                          }}>
                            {column.COLUMN_NAME || column.column_name}
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            fontFamily: 'monospace', 
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)'
                          }}>
                            {column.DATA_TYPE || column.data_type}
                            {(column.CHARACTER_MAXIMUM_LENGTH || column.character_maximum_length) && 
                              `(${column.CHARACTER_MAXIMUM_LENGTH || column.character_maximum_length})`}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {(column.IS_NULLABLE || column.is_nullable) === 'YES' ? 
                              <span style={{ color: 'var(--color-success)', fontSize: '16px' }}>✓</span> : 
                              <span style={{ color: 'var(--color-danger)', fontSize: '16px' }}>✗</span>
                            }
                          </td>
                          <td style={{ 
                            padding: '12px', 
                            fontFamily: 'monospace', 
                            color: 'var(--text-secondary)'
                          }}>
                            {column.COLUMN_DEFAULT || column.column_default || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ 
                    padding: '60px', 
                    textAlign: 'center', 
                    color: 'var(--text-secondary)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                      {selectedTable ? 'No schema information available' : 'Select a table from the list'}
                    </h3>
                    <p style={{ margin: 0, opacity: 0.7, color: 'var(--text-secondary)' }}>
                      {selectedTable ? 'This table might be empty or have access restrictions' : 'Click on any table to view its schema details'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ 
            marginTop: '16px',
            padding: '16px', 
            backgroundColor: 'var(--color-danger)',
            color: 'white', 
            borderRadius: '8px',
            opacity: 0.9
          }}>
            ❌ <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showDownloadOptions && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowDownloadOptions(false)}
        />
      )}
    </div>
  )
}
