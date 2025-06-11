import React, { useState, useEffect, useRef } from 'react'
import Button from './ui/Button'
import ThemeToggle from './ui/ThemeToggle'
import SearchInput from './ui/SearchInput'
import './DatabaseDashboard.css'

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
  const [searchTerm, setSearchTerm] = useState('')
  
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
    setShowDownloadOptions(false) // Close dropdown immediately
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
    setShowDownloadOptions(false) // Close dropdown immediately
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

  const downloadTableSchemaSQL = async () => {
    if (!selectedTable || !tableSchema.length) return
    
    try {
      setLoading(true)
      
      // Get table SQL
      const sqlResult = await window.electronAPI.getTableSQL(selectedTable.name, selectedTable.schema)
      if (!sqlResult.success) {
        setError(sqlResult.message)
        return
      }
      
      // Get constraints
      const constraintsResult = await window.electronAPI.getTableConstraints(selectedTable.name, selectedTable.schema)
      const constraints = constraintsResult.success ? constraintsResult.constraints : []
      
      // Get foreign keys
      const fkResult = await window.electronAPI.getTableForeignKeys(selectedTable.name, selectedTable.schema)
      const foreignKeys = fkResult.success ? fkResult.foreignKeys : []
      
      // Generate complete SQL
      let completeSQL = sqlResult.sql
      
      if (constraints.length > 0) {
        completeSQL += generateConstraintsSQL(selectedTable.name, selectedTable.schema, constraints)
      }
      
      if (foreignKeys.length > 0) {
        completeSQL += generateForeignKeysSQL(selectedTable.name, selectedTable.schema, foreignKeys)
      }
      
      // Save as SQL file
      const filename = `${selectedTable.schema}_${selectedTable.name}_schema.sql`
      const result = await window.electronAPI.saveSchemaToFile(completeSQL, filename)
      
      if (result.success) {
        alert(`SQL schema downloaded successfully!\nSaved to: ${result.filePath}`)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadAllSchemasSQL = async () => {
    console.log('Starting SQL schemas download')
    setDownloading(true)
    setDownloadCancelled(false)
    cancelledRef.current = false
    abortControllerRef.current = new AbortController()
    setDownloadProgress({ current: 0, total: tables.length })
    
    try {
      let successCount = 0
      let errors = []

      for (let i = 0; i < tables.length; i++) {
        if (cancelledRef.current || abortControllerRef.current.signal.aborted) {
          console.log('Download cancelled at table', i)
          alert(`SQL download cancelled by user.\nDownloaded ${successCount}/${tables.length} files before cancellation.`)
          return
        }

        const table = tables[i]
        console.log(`Processing SQL for table ${i + 1}/${tables.length}: ${table.name}`)
        setDownloadProgress({ current: i + 1, total: tables.length })
        
        await new Promise(resolve => setTimeout(resolve, 10))
        
        if (cancelledRef.current) {
          console.log('Download cancelled during delay')
          alert(`SQL download cancelled by user.\nDownloaded ${successCount}/${tables.length} files before cancellation.`)
          return
        }

        try {
          // Get table SQL
          const sqlResult = await window.electronAPI.getTableSQL(table.name, table.schema)
          
          if (cancelledRef.current) {
            console.log('Download cancelled after SQL fetch')
            alert(`SQL download cancelled by user.\nDownloaded ${successCount}/${tables.length} files before cancellation.`)
            return
          }
          
          if (sqlResult.success) {
            // Get additional SQL components
            const constraintsResult = await window.electronAPI.getTableConstraints(table.name, table.schema)
            const fkResult = await window.electronAPI.getTableForeignKeys(table.name, table.schema)
            
            let completeSQL = sqlResult.sql
            
            if (constraintsResult.success && constraintsResult.constraints.length > 0) {
              completeSQL += generateConstraintsSQL(table.name, table.schema, constraintsResult.constraints)
            }
            
            if (fkResult.success && fkResult.foreignKeys.length > 0) {
              completeSQL += generateForeignKeysSQL(table.name, table.schema, fkResult.foreignKeys)
            }

            const filename = `sql_schemas/${table.schema}_${table.name}.sql`
            const saveResult = await window.electronAPI.saveSchemaToFile(completeSQL, filename)
            
            if (saveResult.success) {
              console.log(`Successfully saved SQL: ${saveResult.filePath}`)
              successCount++
            } else {
              console.error(`Failed to save SQL ${table.name}:`, saveResult.message)
              errors.push(`${table.name}: ${saveResult.message}`)
            }
          } else {
            console.error(`Failed to get SQL for ${table.name}:`, sqlResult.message)
            errors.push(`${table.name}: ${sqlResult.message}`)
          }
        } catch (err) {
          console.error(`Error processing SQL ${table.name}:`, err)
          errors.push(`${table.name}: ${err.message}`)
        }
      }

      if (!cancelledRef.current) {
        if (errors.length > 0) {
          alert(`SQL download completed with issues:\nSuccessful: ${successCount}/${tables.length}\nErrors: ${errors.length}\n\nFirst few errors:\n${errors.slice(0, 3).join('\n')}`)
        } else {
          alert(`All ${successCount} SQL schemas downloaded successfully!\nSaved to: Documents/SparkMigrationTool/sql_schemas/`)
        }
      }
    } catch (err) {
      if (!cancelledRef.current) {
        console.error('SQL download error:', err)
        setError(err.message)
      }
    } finally {
      console.log('Cleaning up SQL download state')
      setDownloading(false)
      setDownloadCancelled(false)
      cancelledRef.current = false
      abortControllerRef.current = null
      setDownloadProgress({ current: 0, total: 0 })
    }
  }

  // Helper functions for SQL generation
  const generateConstraintsSQL = (tableName, schemaName, constraints) => {
    let sql = `\n-- Constraints for ${schemaName}.${tableName}\n`
    
    const constraintGroups = {}
    constraints.forEach(constraint => {
      const key = `${constraint.CONSTRAINT_TYPE}_${constraint.CONSTRAINT_NAME}`
      if (!constraintGroups[key]) {
        constraintGroups[key] = {
          name: constraint.CONSTRAINT_NAME,
          type: constraint.CONSTRAINT_TYPE,
          columns: []
        }
      }
      if (constraint.COLUMN_NAME) {
        constraintGroups[key].columns.push(constraint.COLUMN_NAME)
      }
    })
    
    Object.values(constraintGroups).forEach(constraint => {
      if (constraint.type === 'PRIMARY KEY') {
        sql += `ALTER TABLE [${schemaName}].[${tableName}] ADD CONSTRAINT [${constraint.name}] PRIMARY KEY (${constraint.columns.map(col => `[${col}]`).join(', ')});\n`
      } else if (constraint.type === 'UNIQUE') {
        sql += `ALTER TABLE [${schemaName}].[${tableName}] ADD CONSTRAINT [${constraint.name}] UNIQUE (${constraint.columns.map(col => `[${col}]`).join(', ')});\n`
      }
    })
    
    return sql
  }

  const generateForeignKeysSQL = (tableName, schemaName, foreignKeys) => {
    let sql = `\n-- Foreign Keys for ${schemaName}.${tableName}\n`
    
    const fkGroups = {}
    foreignKeys.forEach(fk => {
      if (!fkGroups[fk.CONSTRAINT_NAME]) {
        fkGroups[fk.CONSTRAINT_NAME] = {
          name: fk.CONSTRAINT_NAME,
          columns: [],
          referencedTable: fk.REFERENCED_TABLE_NAME,
          referencedSchema: fk.REFERENCED_TABLE_SCHEMA,
          referencedColumns: []
        }
      }
      fkGroups[fk.CONSTRAINT_NAME].columns.push(fk.COLUMN_NAME)
      fkGroups[fk.CONSTRAINT_NAME].referencedColumns.push(fk.REFERENCED_COLUMN_NAME)
    })
    
    Object.values(fkGroups).forEach(fk => {
      sql += `ALTER TABLE [${schemaName}].[${tableName}] ADD CONSTRAINT [${fk.name}] FOREIGN KEY (${fk.columns.map(col => `[${col}]`).join(', ')}) REFERENCES [${fk.referencedSchema}].[${fk.referencedTable}] (${fk.referencedColumns.map(col => `[${col}]`).join(', ')});\n`
    })
    
    return sql
  }

  // Filter tables based on search term
  const filteredTables = tables.filter(table => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      table.name.toLowerCase().includes(searchLower) ||
      table.schema.toLowerCase().includes(searchLower)
    )
  })

  // Highlight search terms in text
  const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text
    
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="highlight">{part}</span>
      ) : (
        part
      )
    )
  }

  const handleSearchClear = () => {
    setSearchTerm('')
  }

  const handleSingleFileDownload = () => {
    console.log('=== SINGLE FILE DOWNLOAD TRIGGERED ===')
    console.log('Tables count:', tables.length)
    console.log('Config:', config)
    
    // Immediate call without timeout to test
    downloadAllSchemasSingle()
  }

  const handleIndividualFilesDownload = () => {
    console.log('=== INDIVIDUAL FILES DOWNLOAD TRIGGERED ===')
    console.log('Tables count:', tables.length)
    console.log('Config:', config)
    
    // Immediate call without timeout to test
    downloadAllSchemasIndividual()
  }

  return (
    <div className="database-dashboard animate-fadeIn">
      {/* Header - Now Sticky */}
      <div className="dashboard-header animate-slideInDown">
        <div className="header-content">
          <div className="header-info">
            <h1 className="header-title">
              📊 Database Explorer
            </h1>
            <p className="header-subtitle">
              {config.type.toUpperCase()} • {config.host} • {config.database}
            </p>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            
            {/* Replace dropdown with two separate buttons */}
            <Button
              onClick={handleSingleFileDownload}
              disabled={downloading || tables.length === 0}
              variant="success"
              size="sm"
              icon={downloading ? '⏳' : '📄'}
            >
              JSON Single
            </Button>
            
            <Button
              onClick={handleIndividualFilesDownload}
              disabled={downloading || tables.length === 0}
              variant="success"
              size="sm"
              icon={downloading ? '⏳' : '📁'}
            >
              JSON Individual
            </Button>
            
            <Button
              onClick={downloadAllSchemasSQL}
              disabled={downloading || tables.length === 0}
              variant="primary"
              size="sm"
              icon={downloading ? '⏳' : '💾'}
            >
              SQL Schemas
            </Button>
            
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
          <div className="progress-section animate-slideInDown">
            <div className="progress-header">
              <span className="progress-text">
                {downloadCancelled ? 'Cancelling...' : `Downloading schemas... (${downloadProgress.current}/${downloadProgress.total})`}
              </span>
              <div className="progress-actions">
                <span className="progress-text">
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
            <div className="progress-bar">
              <div 
                className={`progress-fill ${downloadCancelled ? 'warning' : 'success'}`}
                style={{ 
                  width: downloadProgress.total > 0 ? `${(downloadProgress.current / downloadProgress.total) * 100}%` : '0%'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card animate-scaleIn">
            <div className="stat-number primary">{tables.length}</div>
            <div className="stat-label">Total Tables</div>
          </div>
          <div className="stat-card animate-scaleIn">
            <div className="stat-number success">
              {selectedTable ? tableSchema.length : 0}
            </div>
            <div className="stat-label">Columns Selected</div>
          </div>
        </div>

        {/* Main Explorer */}
        <div className="explorer-card">
          <div className="explorer-layout">
            {/* Tables Sidebar */}
            <div className="tables-sidebar">
              <div className="sidebar-header">
                <div className="sidebar-header-top">
                  <h3 className="sidebar-title">
                    Tables ({filteredTables.length}{searchTerm && ` of ${tables.length}`})
                  </h3>
                  <button 
                    className="refresh-button"
                    onClick={loadTables} 
                    disabled={loading}
                  >
                    {loading ? '🔄' : '↻'} Refresh
                  </button>
                </div>
                
                <div className="search-section">
                  <SearchInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    onClear={handleSearchClear}
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
                  <div className="loading-state">
                    <div className="loading-icon">⏳</div>
                    Loading tables...
                  </div>
                ) : filteredTables.length > 0 ? (
                  filteredTables.map((table, index) => (
                    <div 
                      key={index}
                      className={`table-item ${selectedTable?.name === table.name ? 'selected' : ''}`}
                      onClick={() => loadTableSchema(table)}
                    >
                      <div className="table-name">
                        📊 {highlightText(table.name, searchTerm)}
                      </div>
                      <div className="table-schema">
                        🏗️ {highlightText(table.schema, searchTerm)}
                      </div>
                    </div>
                  ))
                ) : searchTerm ? (
                  <div className="no-results">
                    <div className="no-results-icon">🔍</div>
                    <div>No tables found matching "{searchTerm}"</div>
                    <button 
                      onClick={handleSearchClear}
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
                  <div className="loading-state">
                    <div className="loading-icon">📊</div>
                    No tables available
                  </div>
                )}
              </div>
            </div>

            {/* Schema Details */}
            <div className="schema-details">
              <div className="schema-header">
                <h3 className="schema-title">
                  {selectedTable ? `${selectedTable.schema}.${selectedTable.name}` : 'Select a table to view schema'}
                </h3>
                {selectedTable && tableSchema.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      onClick={downloadTableSchema}
                      variant="success"
                      icon="📥"
                      size="sm"
                    >
                      JSON
                    </Button>
                    <Button
                      onClick={downloadTableSchemaSQL}
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
                    Loading schema...
                  </div>
                ) : selectedTable && tableSchema.length > 0 ? (
                  <table className="schema-table">
                    <thead>
                      <tr>
                        <th>Column</th>
                        <th>Type</th>
                        <th className="center">PK</th>
                        <th className="center">Identity</th>
                        <th className="center">Nullable</th>
                        <th>Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableSchema.map((column, index) => {
                        const columnName = column.COLUMN_NAME || column.column_name
                        const dataType = column.DATA_TYPE || column.data_type
                        const maxLength = column.CHARACTER_MAXIMUM_LENGTH || column.character_maximum_length
                        const isNullable = (column.IS_NULLABLE || column.is_nullable) === 'YES'
                        const defaultValue = column.COLUMN_DEFAULT || column.column_default
                        const isPrimaryKey = column.IS_PRIMARY_KEY === 1
                        const isIdentity = column.IS_IDENTITY === 1
                        const identitySeed = column.IDENTITY_SEED
                        const identityIncrement = column.IDENTITY_INCREMENT
                        
                        return (
                          <tr key={index}>
                            <td className="column-name">
                              {columnName}
                              {isPrimaryKey && <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', marginLeft: '8px' }}>🔑</span>}
                            </td>
                            <td className="column-type">
                              {dataType.toUpperCase()}
                              {maxLength && `(${maxLength === -1 ? 'MAX' : maxLength})`}
                            </td>
                            <td className="column-nullable">
                              {isPrimaryKey ? 
                                <span style={{ color: 'var(--color-primary)', fontSize: '16px' }}>🔑</span> : 
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>-</span>
                              }
                            </td>
                            <td className="column-nullable">
                              {isIdentity ? 
                                <span style={{ color: 'var(--color-success)', fontSize: '14px' }} title={`IDENTITY(${identitySeed},${identityIncrement})`}>
                                  🔢 ({identitySeed},{identityIncrement})
                                </span> : 
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>-</span>
                              }
                            </td>
                            <td className="column-nullable">
                              {isNullable ? 
                                <span className="nullable-yes">✓</span> : 
                                <span className="nullable-no">✗</span>
                              }
                            </td>
                            <td className="column-default">
                              {defaultValue && defaultValue !== 'NULL' ? defaultValue : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
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
          </div>
        </div>

        {error && (
          <div className="error-message">
            ❌ <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showDownloadOptions && (
        <div 
          className="dropdown-backdrop"
          onClick={() => setShowDownloadOptions(false)}
        />
      )}
    </div>
  )
}
