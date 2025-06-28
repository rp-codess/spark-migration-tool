class QueryBuilder {
  /**
   * Builds a WHERE clause from filter conditions
   * @param {Array} filters - Array of filter objects
   * @param {string} dbType - Database type (mssql, postgresql, mysql, oracle)
   * @returns {string} WHERE clause or empty string
   */
  buildWhereClause(filters, dbType = 'mssql') {
    if (!filters || filters.length === 0) return ''
    
    const conditions = filters.map(filter => {
      const column = this.formatColumnName(filter.column, dbType)
      const value = filter.value
      
      switch (filter.operator) {
        case 'equals':
          return `${column} = '${this.escapeValue(value)}'`
        case 'not_equals':
          return `${column} != '${this.escapeValue(value)}'`
        case 'contains':
          return `${column} LIKE '%${this.escapeValue(value, true)}%'`
        case 'not_contains':
          return `${column} NOT LIKE '%${this.escapeValue(value, true)}%'`
        case 'starts_with':
          return `${column} LIKE '${this.escapeValue(value, true)}%'`
        case 'ends_with':
          return `${column} LIKE '%${this.escapeValue(value, true)}'`
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
          return `${column} = '${this.escapeValue(value)}'`
      }
    })
    
    return 'WHERE ' + conditions.join(' AND ')
  }

  /**
   * Formats column name based on database type
   * @param {string} column - Column name
   * @param {string} dbType - Database type
   * @returns {string} Formatted column name
   */
  formatColumnName(column, dbType) {
    switch (dbType) {
      case 'mssql':
        return `[${column}]`
      case 'postgresql':
      case 'oracle':
        return `"${column}"`
      case 'mysql':
        return `\`${column}\``
      default:
        return `[${column}]`
    }
  }

  /**
   * Escapes string values for SQL
   * @param {string} value - Value to escape
   * @param {boolean} isLike - Whether this is for a LIKE operation
   * @returns {string} Escaped value
   */
  escapeValue(value, isLike = false) {
    let escaped = value.replace(/'/g, "''")
    if (isLike) {
      escaped = escaped.replace(/%/g, '\\%').replace(/_/g, '\\_')
    }
    return escaped
  }

  /**
   * Formats value based on data type
   * @param {any} value - Value to format
   * @param {string} dataType - Data type
   * @returns {string} Formatted value
   */
  formatValue(value, dataType) {
    if (dataType === 'number') {
      return value
    } else if (dataType === 'boolean') {
      return value === '1' ? '1' : '0'
    } else {
      return `'${this.escapeValue(value)}'`
    }
  }

  /**
   * Builds a SELECT query for table data
   * @param {string} tableName - Table name
   * @param {string} schemaName - Schema name
   * @param {string} dbType - Database type
   * @param {number} limit - Row limit
   * @param {Array} filters - Filter conditions
   * @returns {string} SELECT query
   */
  buildSelectQuery(tableName, schemaName, dbType, limit = 100, filters = []) {
    const table = this.formatTableName(tableName, schemaName, dbType)
    const whereClause = this.buildWhereClause(filters, dbType)
    const limitClause = this.buildLimitClause(limit, dbType)
    
    return `SELECT * FROM ${table} ${whereClause} ${limitClause}`.trim()
  }

  /**
   * Formats table name with schema based on database type
   * @param {string} tableName - Table name
   * @param {string} schemaName - Schema name
   * @param {string} dbType - Database type
   * @returns {string} Formatted table name
   */
  formatTableName(tableName, schemaName, dbType) {
    switch (dbType) {
      case 'mssql':
        return `[${schemaName}].[${tableName}]`
      case 'postgresql':
      case 'oracle':
        return `"${schemaName}"."${tableName}"`
      case 'mysql':
        return `\`${schemaName}\`.\`${tableName}\``
      default:
        return `[${schemaName}].[${tableName}]`
    }
  }

  /**
   * Builds LIMIT clause based on database type
   * @param {number} limit - Row limit
   * @param {string} dbType - Database type
   * @returns {string} LIMIT clause
   */
  buildLimitClause(limit, dbType) {
    switch (dbType) {
      case 'mssql':
        return `ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`
      case 'postgresql':
      case 'mysql':
        return `LIMIT ${limit}`
      case 'oracle':
        return `AND ROWNUM <= ${limit}`
      default:
        return `TOP ${limit}`
    }
  }

  /**
   * Builds a COUNT query for table row count
   * @param {string} tableName - Table name
   * @param {string} schemaName - Schema name
   * @param {string} dbType - Database type
   * @returns {string} COUNT query
   */
  buildCountQuery(tableName, schemaName, dbType) {
    const table = this.formatTableName(tableName, schemaName, dbType)
    return `SELECT COUNT(*) as row_count FROM ${table}`
  }
}

module.exports = new QueryBuilder()
