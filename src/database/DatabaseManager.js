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
        c.COLUMN_NAME,
        c.DATA_TYPE,
        c.IS_NULLABLE,
        c.COLUMN_DEFAULT,
        c.CHARACTER_MAXIMUM_LENGTH,
        c.NUMERIC_PRECISION,
        c.NUMERIC_SCALE,
        c.DATETIME_PRECISION,
        COLUMNPROPERTY(OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)), c.COLUMN_NAME, 'IsIdentity') as IS_IDENTITY,
        CASE 
          WHEN COLUMNPROPERTY(OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)), c.COLUMN_NAME, 'IsIdentity') = 1 
          THEN IDENT_SEED(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME))
          ELSE NULL 
        END as IDENTITY_SEED,
        CASE 
          WHEN COLUMNPROPERTY(OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)), c.COLUMN_NAME, 'IsIdentity') = 1 
          THEN IDENT_INCR(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME))
          ELSE NULL 
        END as IDENTITY_INCREMENT,
        COLUMNPROPERTY(OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)), c.COLUMN_NAME, 'IsComputed') as IS_COMPUTED,
        cc.definition as COMPUTED_DEFINITION,
        -- Check if column is part of primary key
        CASE 
          WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 
          ELSE 0 
        END as IS_PRIMARY_KEY,
        pk.CONSTRAINT_NAME as PRIMARY_KEY_NAME
      FROM INFORMATION_SCHEMA.COLUMNS c
      LEFT JOIN sys.computed_columns cc ON cc.object_id = OBJECT_ID(QUOTENAME(c.TABLE_SCHEMA) + '.' + QUOTENAME(c.TABLE_NAME)) 
        AND cc.name = c.COLUMN_NAME
      LEFT JOIN (
        SELECT 
          kcu.COLUMN_NAME,
          kcu.TABLE_SCHEMA,
          kcu.TABLE_NAME,
          tc.CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
        INNER JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc 
          ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME 
          AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
      ) pk ON pk.COLUMN_NAME = c.COLUMN_NAME 
        AND pk.TABLE_SCHEMA = c.TABLE_SCHEMA 
        AND pk.TABLE_NAME = c.TABLE_NAME
      WHERE c.TABLE_NAME = '${tableName}' AND c.TABLE_SCHEMA = '${schemaName}'
      ORDER BY c.ORDINAL_POSITION
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

  async getTableSQL(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('Database not connected')
    }

    try {
      console.log('Getting table schema for SQL generation...')
      const schema = await this.getTableSchema(tableName, schemaName)
      
      console.log('Generating CREATE TABLE SQL...')
      let sql = this.generateCreateTableSQL(tableName, schemaName, schema)
      
      // Add DEFAULT constraints as separate ALTER statements
      console.log('Adding default constraints...')
      const defaultConstraints = this.generateDefaultConstraints(tableName, schemaName, schema)
      if (defaultConstraints) {
        sql += defaultConstraints
      }
      
      console.log('SQL generation completed successfully')
      return sql
    } catch (error) {
      console.error('Error getting table SQL:', error)
      throw error
    }
  }

  generateDefaultConstraints(tableName, schemaName, schema) {
    let sql = ''
    
    schema.forEach(column => {
      const columnName = column.COLUMN_NAME || column.column_name
      const defaultValue = column.COLUMN_DEFAULT || column.column_default
      const isIdentity = column.IS_IDENTITY === 1
      
      if (defaultValue && defaultValue !== 'NULL' && !isIdentity) {
        let cleanDefault = defaultValue.trim()
        // Remove extra parentheses that SQL Server sometimes adds
        if (cleanDefault.startsWith('(') && cleanDefault.endsWith(')')) {
          cleanDefault = cleanDefault.slice(1, -1)
        }
        sql += `ALTER TABLE [${schemaName}].[${tableName}] ADD  DEFAULT (${cleanDefault}) FOR [${columnName}]\n`
        sql += `GO\n\n`
      }
    })
    
    return sql
  }

  generateCreateTableSQL(tableName, schemaName, schema) {
    let sql = `/****** Object:  Table [${schemaName}].[${tableName}]    Script Date: ${new Date().toLocaleString()} ******/\n`
    sql += `SET ANSI_NULLS ON\n`
    sql += `GO\n\n`
    sql += `SET QUOTED_IDENTIFIER ON\n`
    sql += `GO\n\n`
    
    // CREATE TABLE statement
    sql += `CREATE TABLE [${schemaName}].[${tableName}](\n`
    
    const columnDefinitions = schema.map(column => {
      const columnName = column.COLUMN_NAME || column.column_name
      const dataType = column.DATA_TYPE || column.data_type
      const maxLength = column.CHARACTER_MAXIMUM_LENGTH || column.character_maximum_length
      const numericPrecision = column.NUMERIC_PRECISION || column.numeric_precision
      const numericScale = column.NUMERIC_SCALE || column.numeric_scale
      const datetimePrecision = column.DATETIME_PRECISION || column.datetime_precision
      const isNullable = (column.IS_NULLABLE || column.is_nullable) === 'YES'
      const isIdentity = column.IS_IDENTITY === 1
      const identitySeed = column.IDENTITY_SEED || 1
      const identityIncrement = column.IDENTITY_INCREMENT || 1
      const isComputed = column.IS_COMPUTED === 1
      const computedDefinition = column.COMPUTED_DEFINITION
      
      let columnDef = `\t[${columnName}] `
      
      // Handle computed columns
      if (isComputed && computedDefinition) {
        columnDef += `AS ${computedDefinition}`
        return columnDef
      }
      
      // Data type with proper formatting
      let dataTypeStr = dataType.toUpperCase()
      
      // Add length/precision for different data types
      if (maxLength && ['VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR', 'VARBINARY', 'BINARY'].includes(dataTypeStr)) {
        dataTypeStr += `(${maxLength === -1 ? 'max' : maxLength})`
      } else if (numericPrecision && ['DECIMAL', 'NUMERIC', 'FLOAT', 'REAL'].includes(dataTypeStr)) {
        if (numericScale !== null && numericScale !== undefined) {
          dataTypeStr += `(${numericPrecision},${numericScale})`
        } else {
          dataTypeStr += `(${numericPrecision})`
        }
      } else if (datetimePrecision && ['DATETIME2', 'DATETIMEOFFSET', 'TIME'].includes(dataTypeStr)) {
        dataTypeStr += `(${datetimePrecision})`
      }
      
      columnDef += `[${dataTypeStr}]`
      
      // Add IDENTITY
      if (isIdentity) {
        columnDef += ` IDENTITY(${identitySeed},${identityIncrement})`
      }
      
      // Add NOT NULL or NULL
      if (!isNullable) {
        columnDef += ' NOT NULL'
      } else {
        columnDef += ' NULL'
      }
      
      return columnDef
    })
    
    sql += columnDefinitions.join(',\n')
    
    // Add primary key constraints inline if they exist
    const primaryKeyColumns = this.getPrimaryKeyColumns(schema)
    if (primaryKeyColumns.length > 0) {
      const pkName = this.getPrimaryKeyName(tableName, schema)
      sql += `,\n CONSTRAINT [${pkName}] PRIMARY KEY CLUSTERED \n(\n`
      sql += primaryKeyColumns.map(col => `\t[${col}] ASC`).join(',\n')
      sql += `\n)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]`
    }
    
    // Check if table has TEXT/IMAGE columns
    const hasTextImage = schema.some(col => {
      const dataType = (col.DATA_TYPE || col.data_type).toUpperCase()
      const maxLength = col.CHARACTER_MAXIMUM_LENGTH || col.character_maximum_length
      return (dataType === 'VARCHAR' || dataType === 'NVARCHAR') && maxLength === -1
    })
    
    sql += '\n) ON [PRIMARY]'
    if (hasTextImage) {
      sql += ' TEXTIMAGE_ON [PRIMARY]'
    }
    sql += '\n'
    sql += 'GO\n\n'
    
    return sql
  }

  // Helper method to get primary key columns with better detection
  getPrimaryKeyColumns(schema) {
    // First check for columns marked as primary key
    const primaryKeyColumns = schema.filter(col => col.IS_PRIMARY_KEY === 1)
    if (primaryKeyColumns.length > 0) {
      return primaryKeyColumns.map(col => col.COLUMN_NAME || col.column_name)
    }
    
    // Fallback: look for identity columns
    const identityColumns = schema.filter(col => col.IS_IDENTITY === 1)
    if (identityColumns.length > 0) {
      return identityColumns.map(col => col.COLUMN_NAME || col.column_name)
    }
    
    return []
  }

  // Helper method to get primary key constraint name from schema
  getPrimaryKeyName(tableName, schema) {
    const pkColumn = schema.find(col => col.IS_PRIMARY_KEY === 1)
    if (pkColumn && pkColumn.PRIMARY_KEY_NAME) {
      return pkColumn.PRIMARY_KEY_NAME
    }
    return `PK_${tableName}`
  }

  generateConstraintsSQL(tableName, schemaName, constraints) {
    let sql = `-- Constraints for ${schemaName}.${tableName}\n`
    sql += `-- Generated on ${new Date().toISOString()}\n\n`
    
    // Group constraints by type and name
    const constraintGroups = {}
    constraints.forEach(constraint => {
      const constraintName = constraint.CONSTRAINT_NAME || constraint.constraint_name
      const constraintType = constraint.CONSTRAINT_TYPE || constraint.constraint_type
      const columnName = constraint.COLUMN_NAME || constraint.column_name
      
      if (!constraintGroups[constraintName]) {
        constraintGroups[constraintName] = {
          name: constraintName,
          type: constraintType,
          columns: []
        }
      }
      if (columnName) {
        constraintGroups[constraintName].columns.push(columnName)
      }
    })
    
    Object.values(constraintGroups).forEach(constraint => {
      if (constraint.type === 'PRIMARY KEY') {
        // Skip if already included in CREATE TABLE
        return
      } else if (constraint.type === 'UNIQUE') {
        sql += `-- Unique Constraint\n`
        sql += `ALTER TABLE [${schemaName}].[${tableName}]\n`
        sql += `ADD CONSTRAINT [${constraint.name}] UNIQUE NONCLUSTERED \n(\n`
        sql += constraint.columns.map(col => `\t[${col}] ASC`).join(',\n')
        sql += `\n)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]\n`
        sql += `GO\n\n`
      } else if (constraint.type === 'CHECK') {
        sql += `-- Check Constraint\n`
        sql += `ALTER TABLE [${schemaName}].[${tableName}]\n`
        sql += `ADD CONSTRAINT [${constraint.name}] CHECK (/* Check condition needs to be retrieved from sys.check_constraints */)\n`
        sql += `GO\n\n`
      }
    })
    
    return sql
  }

  generateForeignKeysSQL(tableName, schemaName, foreignKeys) {
    let sql = `-- Foreign Keys for ${schemaName}.${tableName}\n`
    sql += `-- Generated on ${new Date().toISOString()}\n\n`
    
    // Group foreign keys by constraint name
    const fkGroups = {}
    foreignKeys.forEach(fk => {
      const constraintName = fk.CONSTRAINT_NAME || fk.constraint_name
      if (!fkGroups[constraintName]) {
        fkGroups[constraintName] = {
          name: constraintName,
          columns: [],
          referencedTable: fk.REFERENCED_TABLE_NAME || fk.referenced_table_name,
          referencedSchema: fk.REFERENCED_TABLE_SCHEMA || fk.referenced_table_schema,
          referencedColumns: []
        }
      }
      fkGroups[constraintName].columns.push(fk.COLUMN_NAME || fk.column_name)
      fkGroups[constraintName].referencedColumns.push(fk.REFERENCED_COLUMN_NAME || fk.referenced_column_name)
    })
    
    Object.values(fkGroups).forEach(fk => {
      sql += `-- Foreign Key: ${fk.name}\n`
      sql += `ALTER TABLE [${schemaName}].[${tableName}] WITH CHECK\n`
      sql += `ADD CONSTRAINT [${fk.name}] FOREIGN KEY(\n`
      sql += fk.columns.map(col => `\t[${col}]`).join(',\n')
      sql += `\n) REFERENCES [${fk.referencedSchema}].[${fk.referencedTable}] (\n`
      sql += fk.referencedColumns.map(col => `\t[${col}]`).join(',\n')
      sql += `\n)\n`
      sql += `GO\n\n`
      sql += `ALTER TABLE [${schemaName}].[${tableName}] CHECK CONSTRAINT [${fk.name}]\n`
      sql += `GO\n\n`
    })
    
    return sql
  }

  async getTableRowCount(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    const { type } = this.currentConnection
    switch (type) {
      case 'mssql':
        return await this.getMSSQLTableRowCount(tableName, schemaName)
      case 'postgresql':
        return await this.getPostgreSQLTableRowCount(tableName, schemaName)
      case 'mysql':
        return await this.getMySQLTableRowCount(tableName, schemaName)
      case 'oracle':
        return await this.getOracleTableRowCount(tableName, schemaName)
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  async getMSSQLTableRowCount(tableName, schemaName) {
    const { pool } = this.currentConnection
    const result = await pool.request().query(`
      SELECT COUNT(*) as row_count
      FROM [${schemaName}].[${tableName}]
    `)
    return result.recordset[0].row_count
  }

  async getPostgreSQLTableRowCount(tableName, schemaName) {
    const { client } = this.currentConnection
    const result = await client.query(`
      SELECT COUNT(*) as row_count
      FROM "${schemaName}"."${tableName}"
    `)
    return parseInt(result.rows[0].row_count)
  }

  async getMySQLTableRowCount(tableName, schemaName) {
    const { connection } = this.currentConnection
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as row_count
      FROM \`${schemaName}\`.\`${tableName}\`
    `)
    return rows[0].row_count
  }

  async getOracleTableRowCount(tableName, schemaName) {
    const { connection } = this.currentConnection
    const result = await connection.execute(`
      SELECT COUNT(*) as row_count
      FROM "${schemaName}"."${tableName}"
    `)
    return result.rows[0][0]
  }

  async getTableData(tableName, schemaName, limit = 100) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    const { type } = this.currentConnection
    switch (type) {
      case 'mssql':
        return await this.getMSSQLTableData(tableName, schemaName, limit)
      case 'postgresql':
        return await this.getPostgreSQLTableData(tableName, schemaName, limit)
      case 'mysql':
        return await this.getMySQLTableData(tableName, schemaName, limit)
      case 'oracle':
        return await this.getOracleTableData(tableName, schemaName, limit)
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  async getMSSQLTableData(tableName, schemaName, limit) {
    const { pool } = this.currentConnection
    const result = await pool.request().query(`
      SELECT TOP ${limit} *
      FROM [${schemaName}].[${tableName}]
      ORDER BY (SELECT NULL)
    `)
    return result.recordset
  }

  async getPostgreSQLTableData(tableName, schemaName, limit) {
    const { client } = this.currentConnection
    const result = await client.query(`
      SELECT *
      FROM "${schemaName}"."${tableName}"
      LIMIT ${limit}
    `)
    return result.rows
  }

  async getMySQLTableData(tableName, schemaName, limit) {
    const { connection } = this.currentConnection
    const [rows] = await connection.execute(`
      SELECT *
      FROM \`${schemaName}\`.\`${tableName}\`
      LIMIT ${limit}
    `)
    return rows
  }

  async getOracleTableData(tableName, schemaName, limit) {
    const { connection } = this.currentConnection
    const result = await connection.execute(`
      SELECT *
      FROM "${schemaName}"."${tableName}"
      WHERE ROWNUM <= ${limit}
    `)
    // Convert Oracle result format to standard format
    const columns = result.metaData.map(col => col.name)
    return result.rows.map(row => {
      const obj = {}
      columns.forEach((col, index) => {
        obj[col] = row[index]
      })
      return obj
    })
  }

  async searchTableData(tableName, schemaName, filters) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    const { type } = this.currentConnection
    switch (type) {
      case 'mssql':
        return await this.searchMSSQLTableData(tableName, schemaName, filters)
      case 'postgresql':
        return await this.searchPostgreSQLTableData(tableName, schemaName, filters)
      case 'mysql':
        return await this.searchMySQLTableData(tableName, schemaName, filters)
      case 'oracle':
        return await this.searchOracleTableData(tableName, schemaName, filters)
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  buildWhereClause(filters, dbType = 'mssql') {
    if (!filters || filters.length === 0) return ''
    
    const conditions = filters.map(filter => {
      const column = dbType === 'mssql' ? `[${filter.column}]` : `"${filter.column}"`
      const value = filter.value
      
      switch (filter.operator) {
        case 'equals':
          return `${column} = '${value.replace(/'/g, "''")}'`
        case 'not_equals':
          return `${column} != '${value.replace(/'/g, "''")}'`
        case 'contains':
          return `${column} LIKE '%${value.replace(/'/g, "''").replace(/%/g, '\\%')}%'`
        case 'not_contains':
          return `${column} NOT LIKE '%${value.replace(/'/g, "''").replace(/%/g, '\\%')}%'`
        case 'starts_with':
          return `${column} LIKE '${value.replace(/'/g, "''").replace(/%/g, '\\%')}%'`
        case 'ends_with':
          return `${column} LIKE '%${value.replace(/'/g, "''").replace(/%/g, '\\%')}'`
        case 'greater_than':
          return `${column} > ${this.formatValue(value, filter.dataType)}`
        case 'less_than':
          return `${column} < ${this.formatValue(value, filter.dataType)}`
        case 'greater_equal':
          return `${column} >= ${this.formatValue(value, filter.dataType)}`
        case 'less_equal':
          return `${column} <= ${this.formatValue(value, filter.dataType)}`
        case 'is_null':
          return `${column} IS NULL`
        case 'is_not_null':
          return `${column} IS NOT NULL`
        case 'after':
          return `${column} > '${value}'`
        case 'before':
          return `${column} < '${value}'`
        default:
          return `${column} = '${value.replace(/'/g, "''")}'`
      }
    })
    
    return 'WHERE ' + conditions.join(' AND ')
  }

  formatValue(value, dataType) {
    if (dataType === 'number') {
      return value
    } else if (dataType === 'boolean') {
      return value === '1' ? '1' : '0'
    } else {
      return `'${value.replace(/'/g, "''")}'`
    }
  }

  async searchMSSQLTableData(tableName, schemaName, filters) {
    const { pool } = this.currentConnection
    const whereClause = this.buildWhereClause(filters, 'mssql')
    
    const query = `
      SELECT TOP 10 *
      FROM [${schemaName}].[${tableName}]
      ${whereClause}
      ORDER BY (SELECT NULL)
    `
    
    console.log('MSSQL Search Query:', query)
    const result = await pool.request().query(query)
    return result.recordset
  }

  async searchPostgreSQLTableData(tableName, schemaName, filters) {
    const { client } = this.currentConnection
    const whereClause = this.buildWhereClause(filters, 'postgresql')
    
    const query = `
      SELECT *
      FROM "${schemaName}"."${tableName}"
      ${whereClause}
      LIMIT 10
    `
    
    console.log('PostgreSQL Search Query:', query)
    const result = await client.query(query)
    return result.rows
  }

  async searchMySQLTableData(tableName, schemaName, filters) {
    const { connection } = this.currentConnection
    const whereClause = this.buildWhereClause(filters, 'mysql')
    
    const query = `
      SELECT *
      FROM \`${schemaName}\`.\`${tableName}\`
      ${whereClause}
      LIMIT 10
    `
    
    console.log('MySQL Search Query:', query)
    const [rows] = await connection.execute(query)
    return rows
  }

  async searchOracleTableData(tableName, schemaName, filters) {
    const { connection } = this.currentConnection
    const whereClause = this.buildWhereClause(filters, 'oracle')
    
    const query = `
      SELECT *
      FROM "${schemaName}"."${tableName}"
      ${whereClause}
      AND ROWNUM <= 10
    `
    
    console.log('Oracle Search Query:', query)
    const result = await connection.execute(query)
    
    // Convert Oracle result format to standard format
    const columns = result.metaData.map(col => col.name)
    return result.rows.map(row => {
      const obj = {}
      columns.forEach((col, index) => {
        obj[col] = row[index]
      })
      return obj
    })
  }

  async getTableConstraints(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    const { type } = this.currentConnection
    switch (type) {
      case 'mssql':
        return await this.getMSSQLTableConstraints(tableName, schemaName)
      case 'postgresql':
        return await this.getPostgreSQLTableConstraints(tableName, schemaName)
      case 'mysql':
        return await this.getMySQLTableConstraints(tableName, schemaName)
      case 'oracle':
        return await this.getOracleTableConstraints(tableName, schemaName)
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  async getMSSQLTableConstraints(tableName, schemaName) {
    const { pool } = this.currentConnection
    const result = await pool.request().query(`
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        kcu.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      WHERE tc.TABLE_NAME = '${tableName}' AND tc.TABLE_SCHEMA = '${schemaName}'
    `)
    return result.recordset
  }

  async getPostgreSQLTableConstraints(tableName, schemaName) {
    const { client } = this.currentConnection
    const result = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1 AND tc.table_schema = $2
    `, [tableName, schemaName])
    return result.rows
  }

  async getMySQLTableConstraints(tableName, schemaName) {
    const { connection } = this.currentConnection
    const [rows] = await connection.execute(`
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        kcu.COLUMN_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      WHERE tc.TABLE_NAME = ? AND tc.TABLE_SCHEMA = ?
    `, [tableName, schemaName])
    return rows
  }

  async getOracleTableConstraints(tableName, schemaName) {
    const { connection } = this.currentConnection
    const result = await connection.execute(`
      SELECT 
        ac.CONSTRAINT_NAME,
        ac.CONSTRAINT_TYPE,
        acc.COLUMN_NAME
      FROM ALL_CONSTRAINTS ac
      LEFT JOIN ALL_CONS_COLUMNS acc ON ac.CONSTRAINT_NAME = acc.CONSTRAINT_NAME
      WHERE ac.TABLE_NAME = :tableName AND ac.OWNER = :owner
    `, [tableName, schemaName])
    return result.rows.map(row => ({
      CONSTRAINT_NAME: row[0],
      CONSTRAINT_TYPE: row[1],
      COLUMN_NAME: row[2]
    }))
  }

  async getTableForeignKeys(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    const { type } = this.currentConnection
    switch (type) {
      case 'mssql':
        return await this.getMSSQLTableForeignKeys(tableName, schemaName)
      case 'postgresql':
        return await this.getPostgreSQLTableForeignKeys(tableName, schemaName)
      case 'mysql':
        return await this.getMySQLTableForeignKeys(tableName, schemaName)
      case 'oracle':
        return await this.getOracleTableForeignKeys(tableName, schemaName)
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  async getMSSQLTableForeignKeys(tableName, schemaName) {
    const { pool } = this.currentConnection
    const result = await pool.request().query(`
      SELECT 
        fk.CONSTRAINT_NAME,
        fk.COLUMN_NAME,
        fk.REFERENCED_TABLE_SCHEMA,
        fk.REFERENCED_TABLE_NAME,
        fk.REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
      INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk 
        ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
      WHERE fk.TABLE_NAME = '${tableName}' AND fk.TABLE_SCHEMA = '${schemaName}'
    `)
    return result.recordset
  }

  async getPostgreSQLTableForeignKeys(tableName, schemaName) {
    const { client } = this.currentConnection
    const result = await client.query(`
      SELECT 
        kcu.constraint_name,
        kcu.column_name,
        ccu.table_schema AS referenced_table_schema,
        ccu.table_name AS referenced_table_name,
        ccu.column_name AS referenced_column_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.constraint_column_usage ccu 
        ON kcu.constraint_name = ccu.constraint_name
      WHERE kcu.table_name = $1 AND kcu.table_schema = $2
    `, [tableName, schemaName])
    return result.rows
  }

  async getMySQLTableForeignKeys(tableName, schemaName) {
    const { connection } = this.currentConnection
    const [rows] = await connection.execute(`
      SELECT 
        kcu.CONSTRAINT_NAME,
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_SCHEMA,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      WHERE kcu.TABLE_NAME = ? AND kcu.TABLE_SCHEMA = ? 
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `, [tableName, schemaName])
    return rows
  }

  async getOracleTableForeignKeys(tableName, schemaName) {
    const { connection } = this.currentConnection
    const result = await connection.execute(`
      SELECT 
        ac.CONSTRAINT_NAME,
        acc.COLUMN_NAME,
        r_acc.OWNER AS REFERENCED_TABLE_SCHEMA,
        r_acc.TABLE_NAME AS REFERENCED_TABLE_NAME,
        r_acc.COLUMN_NAME AS REFERENCED_COLUMN_NAME
      FROM ALL_CONSTRAINTS ac
      JOIN ALL_CONS_COLUMNS acc ON ac.CONSTRAINT_NAME = acc.CONSTRAINT_NAME
      JOIN ALL_CONS_COLUMNS r_acc ON ac.R_CONSTRAINT_NAME = r_acc.CONSTRAINT_NAME
      WHERE ac.TABLE_NAME = :tableName AND ac.OWNER = :owner 
        AND ac.CONSTRAINT_TYPE = 'R'
    `, [tableName, schemaName])
    return result.rows.map(row => ({
      CONSTRAINT_NAME: row[0],
      COLUMN_NAME: row[1],
      REFERENCED_TABLE_SCHEMA: row[2],
      REFERENCED_TABLE_NAME: row[3],
      REFERENCED_COLUMN_NAME: row[4]
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
