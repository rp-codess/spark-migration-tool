const sql = require('mssql')

class MSSQLConnection {
  constructor() {
    this.pool = null
    this.config = null
  }

  async connect(config) {
    try {
      // Handle Azure SQL Server connection - detect any Azure SQL hostname pattern
      const isAzure = config.host.includes('.database.windows.net') || 
                     config.host.includes('.database.azure.com') ||
                     config.host.includes('database.windows.net')
      
      const mssqlConfig = {
        user: config.username,
        password: config.password,
        server: config.host,
        port: parseInt(config.port) || 1433,
        database: config.database,
        options: {
          encrypt: isAzure || config.encrypt === true,
          trustServerCertificate: config.trustServerCertificate === true || !isAzure,
          enableArithAbort: true
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        }
      }

      this.pool = await sql.connect(mssqlConfig)
      this.config = config
      console.log('MSSQL connected successfully')
      return { success: true, message: 'Connected successfully' }
    } catch (error) {
      console.error('MSSQL connection error:', error)
      return { success: false, message: error.message }
    }
  }

  async getTables() {
    if (!this.pool) throw new Error('Not connected to MSSQL')

    const result = await this.pool.request().query(`
      SELECT 
        TABLE_SCHEMA as schema_name,
        TABLE_NAME as table_name,
        TABLE_TYPE as table_type
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `)
    return result.recordset
  }

  async getTableSchema(tableName, schemaName) {
    if (!this.pool) throw new Error('Not connected to MSSQL')

    const result = await this.pool.request().query(`
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

  async getTableRowCount(tableName, schemaName) {
    if (!this.pool) throw new Error('Not connected to MSSQL')

    const result = await this.pool.request().query(`
      SELECT COUNT(*) as row_count
      FROM [${schemaName}].[${tableName}]
    `)
    return result.recordset[0].row_count
  }

  async getTableData(tableName, schemaName, limit) {
    if (!this.pool) throw new Error('Not connected to MSSQL')

    const result = await this.pool.request().query(`
      SELECT TOP ${limit} *
      FROM [${schemaName}].[${tableName}]
      ORDER BY (SELECT NULL)
    `)
    return result.recordset
  }

  async searchTableData(tableName, schemaName, whereClause) {
    if (!this.pool) throw new Error('Not connected to MSSQL')

    const query = `
      SELECT TOP 10 *
      FROM [${schemaName}].[${tableName}]
      ${whereClause}
      ORDER BY (SELECT NULL)
    `
    
    console.log('MSSQL Search Query:', query)
    const result = await this.pool.request().query(query)
    return result.recordset
  }

  async getTableConstraints(tableName, schemaName) {
    if (!this.pool) throw new Error('Not connected to MSSQL')

    const result = await this.pool.request().query(`
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

  async getTableForeignKeys(tableName, schemaName) {
    if (!this.pool) throw new Error('Not connected to MSSQL')

    const result = await this.pool.request().query(`
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

  disconnect() {
    if (this.pool) {
      this.pool.close()
      this.pool = null
    }
  }
}

module.exports = MSSQLConnection
