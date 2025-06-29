const { Client } = require('pg')

class PostgreSQLConnection {
  constructor() {
    this.client = null
    this.config = null
  }

  async connect(config) {
    try {
      const pgConfig = {
        host: config.host,
        port: parseInt(config.port) || 5432,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl === true ? { rejectUnauthorized: false } : false
      }

      this.client = new Client(pgConfig)
      await this.client.connect()
      this.config = config
      console.log('PostgreSQL connected successfully')
      return { success: true, message: 'Connected successfully' }
    } catch (error) {
      console.error('PostgreSQL connection error:', error)
      return { success: false, message: error.message }
    }
  }

  async getTables() {
    if (!this.client) throw new Error('Not connected to PostgreSQL')

    const result = await this.client.query(`
      SELECT 
        table_schema as schema_name,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `)
    return result.rows
  }

  async getTableSchema(tableName, schemaName) {
    if (!this.client) throw new Error('Not connected to PostgreSQL')

    const result = await this.client.query(`
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

  async getTableRowCount(tableName, schemaName) {
    if (!this.client) throw new Error('Not connected to PostgreSQL')

    const result = await this.client.query(`
      SELECT COUNT(*) as row_count
      FROM "${schemaName}"."${tableName}"
    `)
    return parseInt(result.rows[0].row_count)
  }

  async getTableData(tableName, schemaName, limit) {
    if (!this.client) throw new Error('Not connected to PostgreSQL')

    const result = await this.client.query(`
      SELECT *
      FROM "${schemaName}"."${tableName}"
      LIMIT ${limit}
    `)
    return result.rows
  }

  async searchTableData(tableName, schemaName, whereClause) {
    if (!this.client) throw new Error('Not connected to PostgreSQL')

    const query = `
      SELECT *
      FROM "${schemaName}"."${tableName}"
      ${whereClause}
      LIMIT 10
    `
    
    console.log('PostgreSQL Search Query:', query)
    const result = await this.client.query(query)
    return result.rows
  }

  async getTableConstraints(tableName, schemaName) {
    if (!this.client) throw new Error('Not connected to PostgreSQL')

    const result = await this.client.query(`
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

  async getTableForeignKeys(tableName, schemaName) {
    if (!this.client) throw new Error('Not connected to PostgreSQL')

    const result = await this.client.query(`
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

  disconnect() {
    if (this.client) {
      this.client.end()
      this.client = null
    }
  }
}

module.exports = PostgreSQLConnection
