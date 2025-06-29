const oracledb = require('oracledb')

class OracleConnection {
  constructor() {
    this.connection = null
    this.config = null
  }

  async connect(config) {
    try {
      const oracleConfig = {
        user: config.username,
        password: config.password,
        connectString: `${config.host}:${config.port || 1521}/${config.database}`
      }

      this.connection = await oracledb.getConnection(oracleConfig)
      this.config = config
      console.log('Oracle connected successfully')
      return { success: true, message: 'Connected successfully' }
    } catch (error) {
      console.error('Oracle connection error:', error)
      return { success: false, message: error.message }
    }
  }

  async getTables() {
    if (!this.connection) throw new Error('Not connected to Oracle')

    const result = await this.connection.execute(`
      SELECT 
        OWNER as schema_name,
        TABLE_NAME as table_name,
        'BASE TABLE' as table_type
      FROM ALL_TABLES
      WHERE OWNER NOT IN ('SYS', 'SYSTEM', 'DBSNMP', 'SYSMAN', 'OUTLN', 'MDSYS', 'ORDSYS', 'EXFSYS', 'DMSYS', 'WMSYS', 'CTXSYS', 'ANONYMOUS', 'XDB', 'XS$NULL', 'FLOWS_FILES', 'APEX_030200', 'OWBSYS', 'APEX_040000', 'APEX_SSO')
      ORDER BY OWNER, TABLE_NAME
    `)
    return result.rows.map(row => ({
      schema_name: row[0],
      table_name: row[1],
      table_type: row[2]
    }))
  }

  async getTableSchema(tableName, schemaName) {
    if (!this.connection) throw new Error('Not connected to Oracle')

    const result = await this.connection.execute(`
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

  async getTableRowCount(tableName, schemaName) {
    if (!this.connection) throw new Error('Not connected to Oracle')

    const result = await this.connection.execute(`
      SELECT COUNT(*) as row_count
      FROM "${schemaName}"."${tableName}"
    `)
    return result.rows[0][0]
  }

  async getTableData(tableName, schemaName, limit) {
    if (!this.connection) throw new Error('Not connected to Oracle')

    const result = await this.connection.execute(`
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

  async searchTableData(tableName, schemaName, whereClause) {
    if (!this.connection) throw new Error('Not connected to Oracle')

    const query = `
      SELECT *
      FROM "${schemaName}"."${tableName}"
      ${whereClause}
      AND ROWNUM <= 10
    `
    
    console.log('Oracle Search Query:', query)
    const result = await this.connection.execute(query)
    
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
    if (!this.connection) throw new Error('Not connected to Oracle')

    const result = await this.connection.execute(`
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
    if (!this.connection) throw new Error('Not connected to Oracle')

    const result = await this.connection.execute(`
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
    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
  }
}

module.exports = OracleConnection
