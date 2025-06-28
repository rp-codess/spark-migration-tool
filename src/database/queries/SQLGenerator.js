class SQLGenerator {
  /**
   * Generates a CREATE TABLE SQL statement
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @param {Array} schema - Array of column definitions
   * @returns {string} SQL CREATE TABLE statement
   */
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
        if (maxLength === -1) {
          dataTypeStr += '(MAX)'
        } else {
          dataTypeStr += `(${maxLength})`
        }
      } else if (numericPrecision && ['DECIMAL', 'NUMERIC', 'FLOAT', 'REAL'].includes(dataTypeStr)) {
        if (numericScale) {
          dataTypeStr += `(${numericPrecision},${numericScale})`
        } else {
          dataTypeStr += `(${numericPrecision})`
        }
      } else if (datetimePrecision && ['DATETIME2', 'TIME', 'DATETIMEOFFSET'].includes(dataTypeStr)) {
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

  /**
   * Generates default constraints SQL
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @param {Array} schema - Array of column definitions
   * @returns {string} SQL for default constraints
   */
  generateDefaultConstraints(tableName, schemaName, schema) {
    let sql = ''
    
    schema.forEach(column => {
      const columnName = column.COLUMN_NAME || column.column_name
      const defaultValue = column.COLUMN_DEFAULT || column.column_default
      const isIdentity = column.IS_IDENTITY === 1
      
      if (defaultValue && defaultValue !== 'NULL' && !isIdentity) {
        const constraintName = `DF_${tableName}_${columnName}`
        sql += `-- Default constraint for ${columnName}\n`
        sql += `ALTER TABLE [${schemaName}].[${tableName}] ADD CONSTRAINT [${constraintName}] DEFAULT ${defaultValue} FOR [${columnName}]\n`
        sql += `GO\n\n`
      }
    })
    
    return sql
  }

  /**
   * Generates constraints SQL
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @param {Array} constraints - Array of constraint definitions
   * @returns {string} SQL for constraints
   */
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
        sql += `ALTER TABLE [${schemaName}].[${tableName}] ADD CONSTRAINT [${constraint.name}] UNIQUE NONCLUSTERED \n(\n`
        sql += constraint.columns.map(col => `\t[${col}] ASC`).join(',\n')
        sql += `\n)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]\n`
        sql += `GO\n\n`
      } else if (constraint.type === 'CHECK') {
        sql += `-- Check constraint: ${constraint.name}\n`
        sql += `-- ALTER TABLE [${schemaName}].[${tableName}] ADD CONSTRAINT [${constraint.name}] CHECK (...)\n`
        sql += `-- GO\n\n`
      }
    })
    
    return sql
  }

  /**
   * Generates foreign keys SQL
   * @param {string} tableName - Name of the table
   * @param {string} schemaName - Name of the schema
   * @param {Array} foreignKeys - Array of foreign key definitions
   * @returns {string} SQL for foreign keys
   */
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

  /**
   * Helper method to get primary key columns
   * @param {Array} schema - Array of column definitions
   * @returns {Array} Array of primary key column names
   */
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

  /**
   * Helper method to get primary key constraint name
   * @param {string} tableName - Name of the table
   * @param {Array} schema - Array of column definitions
   * @returns {string} Primary key constraint name
   */
  getPrimaryKeyName(tableName, schema) {
    const pkColumn = schema.find(col => col.IS_PRIMARY_KEY === 1)
    if (pkColumn && pkColumn.PRIMARY_KEY_NAME) {
      return pkColumn.PRIMARY_KEY_NAME
    }
    return `PK_${tableName}`
  }
}

module.exports = new SQLGenerator()
