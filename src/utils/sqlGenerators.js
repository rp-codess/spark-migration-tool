export const generateConstraintsSQL = (tableName, schemaName, constraints) => {
  let sql = `\n-- Constraints for ${schemaName}.${tableName}\n`
  
  const constraintGroups = {}
  constraints.forEach(constraint => {
    const key = `${constraint.CONSTRAINT_TYPE}_${constraint.CONSTRAINT_NAME}`
    if (!constraintGroups[key]) {
      constraintGroups[key] = {
        name: constraint.CONSTRAINT_NAME,
        type: constraint.CONSTRAINT_TYPE,
        columns: []
      }
    }
    if (constraint.COLUMN_NAME) {
      constraintGroups[key].columns.push(constraint.COLUMN_NAME)
    }
  })
  
  Object.values(constraintGroups).forEach(constraint => {
    if (constraint.type === 'PRIMARY KEY') {
      sql += `ALTER TABLE [${schemaName}].[${tableName}] ADD CONSTRAINT [${constraint.name}] PRIMARY KEY (${constraint.columns.map(col => `[${col}]`).join(', ')});\n`
    } else if (constraint.type === 'UNIQUE') {
      sql += `ALTER TABLE [${schemaName}].[${tableName}] ADD CONSTRAINT [${constraint.name}] UNIQUE (${constraint.columns.map(col => `[${col}]`).join(', ')});\n`
    }
  })
  
  return sql
}

export const generateForeignKeysSQL = (tableName, schemaName, foreignKeys) => {
  let sql = `\n-- Foreign Keys for ${schemaName}.${tableName}\n`
  
  const fkGroups = {}
  foreignKeys.forEach(fk => {
    if (!fkGroups[fk.CONSTRAINT_NAME]) {
      fkGroups[fk.CONSTRAINT_NAME] = {
        name: fk.CONSTRAINT_NAME,
        columns: [],
        referencedTable: fk.REFERENCED_TABLE_NAME,
        referencedSchema: fk.REFERENCED_TABLE_SCHEMA,
        referencedColumns: []
      }
    }
    fkGroups[fk.CONSTRAINT_NAME].columns.push(fk.COLUMN_NAME)
    fkGroups[fk.CONSTRAINT_NAME].referencedColumns.push(fk.REFERENCED_COLUMN_NAME)
  })
  
  Object.values(fkGroups).forEach(fk => {
    sql += `ALTER TABLE [${schemaName}].[${tableName}] ADD CONSTRAINT [${fk.name}] FOREIGN KEY (${fk.columns.map(col => `[${col}]`).join(', ')}) REFERENCES [${fk.referencedSchema}].[${fk.referencedTable}] (${fk.referencedColumns.map(col => `[${col}]`).join(', ')});\n`
  })
  
  return sql
}
