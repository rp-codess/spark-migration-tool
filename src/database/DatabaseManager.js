const sql = require('mssql')
const { Client } = require('pg')
const mysql = require('mysql2/promise')
const oracledb = require('oracledb')

class DatabaseManager {
  constructor() {
    this.connections = new Map()
    this.currentConnection = null
    this.currentConfig = null
  }

  async connect(config) {
    try {
      const { type, host, port, database, username, password, schema, ssl, sslMode } = config
      
      let connection
      switch (type) {
        case 'mssql':
          connection = await this.connectMSSQL({ host, port, database, username, password, ssl, sslMode })
          break
        case 'postgresql':
          connection = await this.connectPostgreSQL({ host, port, database, username, password, ssl, sslMode })
          break
        case 'mysql':
          connection = await this.connectMySQL({ host, port, database, username, password })
          break
        case 'oracle':
          connection = await this.connectOracle({ host, port, database, username, password })
          break
        default:
          throw new Error(`Unsupported database type: ${type}`)
      }

      this.currentConnection = connection
      this.currentConfig = config
      return { success: true, message: 'Connected successfully' }
    } catch (error) {
      return { success: false, message: error.message }
    }
  }

  async connectMSSQL(config) {
    try {
      // Handle Azure SQL Server connection - detect any Azure SQL hostname pattern
      const isAzure = config.host.includes('.database.windows.net') || 
                     config.host.includes('.database.azure.com') ||
                     config.host.includes('database.windows.net')
      
      // Try different configuration formats for different mssql versions
      let connectionConfig
      
      // Configuration for newer mssql versions (v9+)
      connectionConfig = {
        server: config.host,
        port: parseInt(config.port) || 1433,
        database: config.database,
        user: config.username,
        password: config.password,
        encrypt: true,
        trustServerCertificate: !isAzure,
        enableArithAbort: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
      }

      console.log('MSSQL Connection Config (v1):', JSON.stringify(connectionConfig, null, 2))

      try {
        const pool = new sql.ConnectionPool(connectionConfig)
        await pool.connect()
        console.log('MSSQL Connection successful with v1 config!')
        return { pool, type: 'mssql' }
      } catch (error1) {
        console.log('V1 config failed, trying v2:', error1.message)
        
        // Configuration for older mssql versions
        connectionConfig = {
          server: config.host,
          port: parseInt(config.port) || 1433,
          database: config.database,
          user: config.username,
          password: config.password,
          options: {
            encrypt: true,
            trustServerCertificate: !isAzure,
            enableArithAbort: true
          },
          connectionTimeout: 30000,
          requestTimeout: 30000
        }

        console.log('MSSQL Connection Config (v2):', JSON.stringify(connectionConfig, null, 2))

        try {
          const pool = new sql.ConnectionPool(connectionConfig)
          await pool.connect()
          console.log('MSSQL Connection successful with v2 config!')
          return { pool, type: 'mssql' }
        } catch (error2) {
          console.log('V2 config failed, trying v3:', error2.message)
          
          // Last resort - minimal config with just encrypt
          connectionConfig = {
            server: config.host,
            port: parseInt(config.port) || 1433,
            database: config.database,
            user: config.username,
            password: config.password,
            pool: {
              max: 10,
              min: 0,
              idleTimeoutMillis: 30000
            },
            options: {
              encrypt: true,
              enableArithAbort: true,
              trustServerCertificate: true // Force trust for troubleshooting
            }
          }

          console.log('MSSQL Connection Config (v3):', JSON.stringify(connectionConfig, null, 2))
          
          const pool = new sql.ConnectionPool(connectionConfig)
          await pool.connect()
          console.log('MSSQL Connection successful with v3 config!')
          return { pool, type: 'mssql' }
        }
      }
    } catch (error) {
      console.error('All MSSQL Connection attempts failed:', error.message)
      throw error
    }
  }

  async connectPostgreSQL(config) {
    // Handle Azure PostgreSQL connection
    const isAzure = config.host.includes('.postgres.database.azure.com')
    
    let sslConfig = false
    if (config.ssl || isAzure) {
      if (isAzure) {
        // Azure PostgreSQL requires SSL - force it on
        sslConfig = {
          rejectUnauthorized: false, // Changed to false for Azure compatibility
          require: true,
          ca: undefined,
          cert: undefined,
          key: undefined
        }
      } else {
        sslConfig = {
          rejectUnauthorized: false
        }
      }
    }

    // For Azure, always enable SSL regardless of config
    if (isAzure && !sslConfig) {
      sslConfig = {
        rejectUnauthorized: false,
        require: true
      }
    }

    const client = new Client({
      host: config.host,
      port: parseInt(config.port) || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: sslConfig,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      query_timeout: 30000,
      application_name: 'spark-migration-tool'
    })
    
    await client.connect()
    return { client, type: 'postgresql' }
  }

  async connectMySQL(config) {
    const connection = await mysql.createConnection({
      host: config.host,
      port: parseInt(config.port) || 3306,
      database: config.database,
      user: config.username,
      password: config.password
    })
    return { connection, type: 'mysql' }
  }

  async connectOracle(config) {
    const connection = await oracledb.getConnection({
      user: config.username,
      password: config.password,
      connectString: `${config.host}:${parseInt(config.port) || 1521}/${config.database}`
    })
    return { connection, type: 'oracle' }
  }

  async getTables() {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    const { type } = this.currentConnection
    switch (type) {
      case 'mssql':
        return await this.getMSSQLTables()
      case 'postgresql':
        return await this.getPostgreSQLTables()
      case 'mysql':
        return await this.getMySQLTables()
      case 'oracle':
        return await this.getOracleTables()
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  async getMSSQLTables() {
    const { pool } = this.currentConnection
    const result = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `)
    return result.recordset.map(row => ({
      schema: row.TABLE_SCHEMA,
      name: row.TABLE_NAME,
      type: row.TABLE_TYPE
    }))
  }

  async getPostgreSQLTables() {
    const { client } = this.currentConnection
    const result = await client.query(`
      SELECT schemaname, tablename, 'BASE TABLE' as tabletype
      FROM pg_tables
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
      ORDER BY schemaname, tablename
    `)
    return result.rows.map(row => ({
      schema: row.schemaname,
      name: row.tablename,
      type: row.tabletype
    }))
  }

  async getMySQLTables() {
    const { connection } = this.currentConnection
    const [rows] = await connection.execute(`
      SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, [this.currentConfig.database])
    return rows.map(row => ({
      schema: row.TABLE_SCHEMA,
      name: row.TABLE_NAME,
      type: row.TABLE_TYPE
    }))
  }

  async getOracleTables() {
    const { connection } = this.currentConnection
    const result = await connection.execute(`
      SELECT OWNER, TABLE_NAME, 'BASE TABLE' as TABLE_TYPE
      FROM ALL_TABLES
      WHERE OWNER = :owner
      ORDER BY TABLE_NAME
    `, [this.currentConfig.username.toUpperCase()])
    return result.rows.map(row => ({
      schema: row[0],
      name: row[1],
      type: row[2]
    }))
  }

  async getTableSchema(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    const { type } = this.currentConnection
    switch (type) {
      case 'mssql':
        return await this.getMSSQLTableSchema(tableName, schemaName)
      case 'postgresql':
        return await this.getPostgreSQLTableSchema(tableName, schemaName)
      case 'mysql':
        return await this.getMySQLTableSchema(tableName, schemaName)
      case 'oracle':
        return await this.getOracleTableSchema(tableName, schemaName)
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  async getMSSQLTableSchema(tableName, schemaName) {
    const { pool } = this.currentConnection
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA = '${schemaName}'
      ORDER BY ORDINAL_POSITION
    `)
    return result.recordset
  }

  async getPostgreSQLTableSchema(tableName, schemaName) {
    const { client } = this.currentConnection
    const result = await client.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = $2
      ORDER BY ordinal_position
    `, [tableName, schemaName])
    return result.rows
  }

  async getMySQLTableSchema(tableName, schemaName) {
    const { connection } = this.currentConnection
    const [rows] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [tableName, schemaName])
    return rows
  }

  async getOracleTableSchema(tableName, schemaName) {
    const { connection } = this.currentConnection
    const result = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        NULLABLE,
        DATA_DEFAULT,
        DATA_LENGTH,
        DATA_PRECISION,
        DATA_SCALE
      FROM ALL_TAB_COLUMNS
      WHERE TABLE_NAME = :tableName AND OWNER = :owner
      ORDER BY COLUMN_ID
    `, [tableName, schemaName])
    return result.rows.map(row => ({
      COLUMN_NAME: row[0],
      DATA_TYPE: row[1],
      IS_NULLABLE: row[2],
      COLUMN_DEFAULT: row[3],
      CHARACTER_MAXIMUM_LENGTH: row[4],
      NUMERIC_PRECISION: row[5],
      NUMERIC_SCALE: row[6]
    }))
  }

  disconnect() {
    if (this.currentConnection) {
      const { type } = this.currentConnection
      
      try {
        switch (type) {
          case 'mssql':
            if (this.currentConnection.pool) {
              this.currentConnection.pool.close()
            }
            break
          case 'postgresql':
            if (this.currentConnection.client) {
              this.currentConnection.client.end()
            }
            break
          case 'mysql':
            if (this.currentConnection.connection) {
              this.currentConnection.connection.end()
            }
            break
          case 'oracle':
            if (this.currentConnection.connection) {
              this.currentConnection.connection.close()
            }
            break
        }
      } catch (error) {
        console.error('Error disconnecting:', error)
      }
      
      this.currentConnection = null
      this.currentConfig = null
    }
  }
}

module.exports = new DatabaseManager()
