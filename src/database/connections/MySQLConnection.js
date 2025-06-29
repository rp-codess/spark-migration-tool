const mysql = require('mysql2/promise')

class MySQLConnection {
  constructor() {
    this.connection = null
    this.config = null
  }

  async connect(config) {
    try {
      const mysqlConfig = {
        host: config.host,
        port: parseInt(config.port) || 3306,
        user: config.username,
        password: config.password,
        database: config.database,
        ssl: config.ssl === true ? { rejectUnauthorized: false } : false
      }

      this.connection = await mysql.createConnection(mysqlConfig)
      this.config = config
      console.log('MySQL connected successfully')
      return { success: true, message: 'Connected successfully' }
    } catch (error) {
      console.error('MySQL connection error:', error)
      return { success: false, message: error.message }
    }
  }

  async getTables() {
    if (!this.connection) throw new Error('Not connected to MySQL')

    const [rows] = await this.connection.execute(`
      SELECT 
        TABLE_SCHEMA as schema_name,
        TABLE_NAME as table_name,
        TABLE_TYPE as table_type
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `)
    return rows
  }

  async getTableSchema(tableName, schemaName) {
    if (!this.connection) throw new Error('Not connected to MySQL')

    const [rows] = await this.connection.execute(`
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

  async getTableRowCount(tableName, schemaName) {
    if (!this.connection) throw new Error('Not connected to MySQL')

    const [rows] = await this.connection.execute(`
      SELECT COUNT(*) as row_count
      FROM \`${schemaName}\`.\`${tableName}\`
    `)
    return rows[0].row_count
  }

  async getTableData(tableName, schemaName, limit) {
    if (!this.connection) throw new Error('Not connected to MySQL')

    const [rows] = await this.connection.execute(`
      SELECT *
      FROM \`${schemaName}\`.\`${tableName}\`
      LIMIT ${limit}
    `)
    return rows
  }

  async searchTableData(tableName, schemaName, whereClause) {
    if (!this.connection) throw new Error('Not connected to MySQL')

    const query = `
      SELECT *
      FROM \`${schemaName}\`.\`${tableName}\`
      ${whereClause}
      LIMIT 10
    `
    
    console.log('MySQL Search Query:', query)
    const [rows] = await this.connection.execute(query)
    return rows
  }

  async getTableConstraints(tableName, schemaName) {
    if (!this.connection) throw new Error('Not connected to MySQL')

    const [rows] = await this.connection.execute(`
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

  async getTableForeignKeys(tableName, schemaName) {
    if (!this.connection) throw new Error('Not connected to MySQL')

    const [rows] = await this.connection.execute(`
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

  disconnect() {
    if (this.connection) {
      this.connection.end()
      this.connection = null
    }
  }
}

module.exports = MySQLConnection
