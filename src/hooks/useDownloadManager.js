import { useState, useRef } from 'react'
import { generateConstraintsSQL, generateForeignKeysSQL } from '../utils/sqlGenerators'

export function useDownloadManager(config) {
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })
  const [downloadCancelled, setDownloadCancelled] = useState(false)
  
  const cancelledRef = useRef(false)
  const abortControllerRef = useRef(null)

  const cancelDownload = () => {
    console.log('Cancel download clicked - immediate action')
    setDownloadCancelled(true)
    cancelledRef.current = true
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    setTimeout(() => {
      setDownloading(false)
      setDownloadProgress({ current: 0, total: 0 })
      console.log('Download state reset')
    }, 100)
  }

  const downloadAllSchemasSingle = async (tables) => {
    console.log('Starting single file download')
    setDownloading(true)
    setDownloadCancelled(false)
    cancelledRef.current = false
    abortControllerRef.current = new AbortController()
    setDownloadProgress({ current: 0, total: tables.length })
    
    try {
      const allSchemas = {}
      
      for (let i = 0; i < tables.length; i++) {
        if (cancelledRef.current || abortControllerRef.current.signal.aborted) {
          console.log('Download cancelled at table', i)
          alert('Download cancelled by user')
          return
        }

        const table = tables[i]
        console.log(`Processing table ${i + 1}/${tables.length}: ${table.name}`)
        setDownloadProgress({ current: i + 1, total: tables.length })
        
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
          throw new Error(result.message)
        }
      }
    } catch (err) {
      if (!cancelledRef.current) {
        console.error('Download error:', err)
        throw err
      }
    } finally {
      console.log('Cleaning up download state')
      setDownloading(false)
      setDownloadCancelled(false)
      cancelledRef.current = false
      abortControllerRef.current = null
      setDownloadProgress({ current: 0, total: 0 })
    }
  }

  const downloadAllSchemasIndividual = async (tables) => {
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
        if (cancelledRef.current || abortControllerRef.current.signal.aborted) {
          console.log('Download cancelled at table', i)
          alert(`Download cancelled by user.\nDownloaded ${successCount}/${tables.length} files before cancellation.`)
          return
        }

        const table = tables[i]
        console.log(`Processing table ${i + 1}/${tables.length}: ${table.name}`)
        setDownloadProgress({ current: i + 1, total: tables.length })
        
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
        throw err
      }
    } finally {
      console.log('Cleaning up download state')
      setDownloading(false)
      setDownloadCancelled(false)
      cancelledRef.current = false
      abortControllerRef.current = null
      setDownloadProgress({ current: 0, total: 0 })
    }
  }

  const downloadAllSchemasSQL = async (tables) => {
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
          const sqlResult = await window.electronAPI.getTableSQL(table.name, table.schema)
          
          if (cancelledRef.current) {
            console.log('Download cancelled after SQL fetch')
            alert(`SQL download cancelled by user.\nDownloaded ${successCount}/${tables.length} files before cancellation.`)
            return
          }
          
          if (sqlResult.success) {
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
        throw err
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

  const downloadTableSchema = async (selectedTable, tableSchema) => {
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
      throw err
    }
  }

  const downloadTableSchemaSQL = async (selectedTable, tableSchema) => {
    if (!selectedTable || !tableSchema.length) return
    
    try {
      const sqlResult = await window.electronAPI.getTableSQL(selectedTable.name, selectedTable.schema)
      if (!sqlResult.success) {
        throw new Error(sqlResult.message)
      }
      
      const constraintsResult = await window.electronAPI.getTableConstraints(selectedTable.name, selectedTable.schema)
      const constraints = constraintsResult.success ? constraintsResult.constraints : []
      
      const fkResult = await window.electronAPI.getTableForeignKeys(selectedTable.name, selectedTable.schema)
      const foreignKeys = fkResult.success ? fkResult.foreignKeys : []
      
      let completeSQL = sqlResult.sql
      
      if (constraints.length > 0) {
        completeSQL += generateConstraintsSQL(selectedTable.name, selectedTable.schema, constraints)
      }
      
      if (foreignKeys.length > 0) {
        completeSQL += generateForeignKeysSQL(selectedTable.name, selectedTable.schema, foreignKeys)
      }
      
      const filename = `${selectedTable.schema}_${selectedTable.name}_schema.sql`
      const result = await window.electronAPI.saveSchemaToFile(completeSQL, filename)
      
      if (result.success) {
        alert(`SQL schema downloaded successfully!\nSaved to: ${result.filePath}`)
      } else {
        throw new Error(result.message)
      }
    } catch (err) {
      throw err
    }
  }

  return {
    // State
    downloading,
    downloadProgress,
    downloadCancelled,
    
    // Actions
    cancelDownload,
    downloadAllSchemasSingle,
    downloadAllSchemasIndividual,
    downloadAllSchemasSQL,
    downloadTableSchema,
    downloadTableSchemaSQL
  }
}
