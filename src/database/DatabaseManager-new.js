const connectionFactory = require('./utils/ConnectionFactory')
const sqlGenerator = require('./queries/SQLGenerator')
const queryBuilder = require('./queries/QueryBuilder')

class DatabaseManager {
  constructor() {
    this.currentConnection = null
    this.currentConfig = null
  }

  /**
   * Connects to a database based on the provided configuration
   * @param {Object} config - Database configuration
   * @returns {Object} Connection result
   */
  async connect(config) {
    console.log('Connecting to database:', config.type)
    
    try {
      // Disconnect any existing connection
      this.disconnect()
      
      // Create new connection based on type
      const connection = connectionFactory.createConnection(config.type)
      const result = await connection.connect(config)
      
      if (result.success) {
        this.currentConnection = {
          type: config.type,
          instance: connection
        }
        this.currentConfig = config
      }
      
      return result
    } catch (error) {
      console.error('Database connection error:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * Gets all tables from the current database connection
   * @returns {Array} Array of table objects
   */
  async getTables() {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    return await this.currentConnection.instance.getTables()
  }

  /**
   * Gets the schema for a specific table
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @returns {Array} Array of column definitions
   */
  async getTableSchema(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    return await this.currentConnection.instance.getTableSchema(tableName, schemaName)
  }

  /**
   * Gets the SQL definition for a table
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @returns {string} SQL CREATE TABLE statement
   */
  async getTableSQL(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('Database not connected')
    }

    try {
      console.log('Getting table schema for SQL generation...')
      const schema = await this.getTableSchema(tableName, schemaName)
      
      console.log('Generating CREATE TABLE SQL...')
      let sql = sqlGenerator.generateCreateTableSQL(tableName, schemaName, schema)
      
      // Add DEFAULT constraints as separate ALTER statements
      console.log('Adding default constraints...')
      const defaultConstraints = sqlGenerator.generateDefaultConstraints(tableName, schemaName, schema)
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

  /**
   * Gets table constraints
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @returns {Array} Array of constraint definitions
   */
  async getTableConstraints(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    return await this.currentConnection.instance.getTableConstraints(tableName, schemaName)
  }

  /**
   * Gets table foreign keys
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @returns {Array} Array of foreign key definitions
   */
  async getTableForeignKeys(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    return await this.currentConnection.instance.getTableForeignKeys(tableName, schemaName)
  }

  /**
   * Gets the row count for a table
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @returns {number} Number of rows
   */
  async getTableRowCount(tableName, schemaName) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    return await this.currentConnection.instance.getTableRowCount(tableName, schemaName)
  }

  /**
   * Gets data from a table
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @param {number} limit - Maximum number of rows to return
   * @returns {Array} Array of row objects
   */
  async getTableData(tableName, schemaName, limit = 100) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    return await this.currentConnection.instance.getTableData(tableName, schemaName, limit)
  }

  /**
   * Searches table data with filters
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @param {Array} filters - Array of filter objects
   * @returns {Array} Array of row objects
   */
  async searchTableData(tableName, schemaName, filters) {
    if (!this.currentConnection) {
      throw new Error('No active database connection')
    }

    const whereClause = queryBuilder.buildWhereClause(filters, this.currentConnection.type)
    return await this.currentConnection.instance.searchTableData(tableName, schemaName, whereClause)
  }

  /**
   * Disconnects from the current database
   */
  disconnect() {
    if (this.currentConnection) {
      try {
        this.currentConnection.instance.disconnect()
      } catch (error) {
        console.error('Error disconnecting:', error)
      }
      
      this.currentConnection = null
      this.currentConfig = null
    }
  }
}

module.exports = new DatabaseManager()
