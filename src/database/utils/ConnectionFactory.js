const MSSQLConnection = require('../connections/MSSQLConnection')
const PostgreSQLConnection = require('../connections/PostgreSQLConnection')
const MySQLConnection = require('../connections/MySQLConnection')
const OracleConnection = require('../connections/OracleConnection')

class ConnectionFactory {
  /**
   * Creates a database connection instance based on the database type
   * @param {string} type - Database type (mssql, postgresql, mysql, oracle)
   * @returns {Object} Database connection instance
   */
  createConnection(type) {
    switch (type.toLowerCase()) {
      case 'mssql':
      case 'sqlserver':
        return new MSSQLConnection()
      case 'postgresql':
      case 'postgres':
        return new PostgreSQLConnection()
      case 'mysql':
        return new MySQLConnection()
      case 'oracle':
        return new OracleConnection()
      default:
        throw new Error(`Unsupported database type: ${type}`)
    }
  }

  /**
   * Gets the list of supported database types
   * @returns {Array} Array of supported database types
   */
  getSupportedTypes() {
    return ['mssql', 'postgresql', 'mysql', 'oracle']
  }

  /**
   * Validates if a database type is supported
   * @param {string} type - Database type to validate
   * @returns {boolean} True if supported, false otherwise
   */
  isSupported(type) {
    return this.getSupportedTypes().includes(type.toLowerCase())
  }
}

module.exports = new ConnectionFactory()
