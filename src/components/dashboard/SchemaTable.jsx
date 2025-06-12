import React from 'react'

export default function SchemaTable({ tableSchema }) {
  return (
    <div style={{ 
      overflowX: 'auto', 
      overflowY: 'auto',
      maxHeight: '500px',
      border: '1px solid var(--border-color)',
      borderRadius: '4px'
    }}>
      <table className="schema-table" style={{
        width: '100%',
        minWidth: 'max-content',
        borderCollapse: 'collapse',
        fontSize: '13px'
      }}>
        <thead style={{ 
          position: 'sticky', 
          top: 0, 
          background: 'var(--bg-primary)', 
          zIndex: 1,
          borderBottom: '2px solid var(--border-color)'
        }}>
          <tr>
            <th style={{ 
              minWidth: '150px',
              padding: '8px 12px',
              textAlign: 'left',
              fontWeight: '600',
              fontSize: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderBottom: '2px solid var(--border-color)'
            }}>Column</th>
            <th style={{ 
              minWidth: '120px',
              padding: '8px 12px',
              textAlign: 'left',
              fontWeight: '600',
              fontSize: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderBottom: '2px solid var(--border-color)'
            }}>Type</th>
            <th className="center" style={{ 
              minWidth: '60px',
              padding: '8px 12px',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderBottom: '2px solid var(--border-color)'
            }}>PK</th>
            <th className="center" style={{ 
              minWidth: '100px',
              padding: '8px 12px',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderBottom: '2px solid var(--border-color)'
            }}>Identity</th>
            <th className="center" style={{ 
              minWidth: '80px',
              padding: '8px 12px',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderBottom: '2px solid var(--border-color)'
            }}>Nullable</th>
            <th style={{ 
              minWidth: '120px',
              padding: '8px 12px',
              textAlign: 'left',
              fontWeight: '600',
              fontSize: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderBottom: '2px solid var(--border-color)'
            }}>Default</th>
          </tr>
        </thead>
        <tbody>
          {tableSchema.map((column, index) => {
            const columnName = column.COLUMN_NAME || column.column_name
            const dataType = column.DATA_TYPE || column.data_type
            const maxLength = column.CHARACTER_MAXIMUM_LENGTH || column.character_maximum_length
            const isNullable = (column.IS_NULLABLE || column.is_nullable) === 'YES'
            const defaultValue = column.COLUMN_DEFAULT || column.column_default
            const isPrimaryKey = column.IS_PRIMARY_KEY === 1
            const isIdentity = column.IS_IDENTITY === 1
            const identitySeed = column.IDENTITY_SEED
            const identityIncrement = column.IDENTITY_INCREMENT
            
            return (
              <tr key={index} style={{
                backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'
              }}>
                <td className="column-name" style={{ 
                  padding: '6px 12px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  verticalAlign: 'top'
                }}>
                  {columnName}
                  {isPrimaryKey && <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', marginLeft: '8px' }}>🔑</span>}
                </td>
                <td className="column-type" style={{ 
                  padding: '6px 12px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  verticalAlign: 'top'
                }}>
                  {dataType.toUpperCase()}
                  {maxLength && `(${maxLength === -1 ? 'MAX' : maxLength})`}
                </td>
                <td className="column-nullable" style={{ 
                  padding: '6px 12px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  textAlign: 'center',
                  verticalAlign: 'top'
                }}>
                  {isPrimaryKey ? 
                    <span style={{ color: 'var(--color-primary)', fontSize: '16px' }}>🔑</span> : 
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>-</span>
                  }
                </td>
                <td className="column-nullable" style={{ 
                  padding: '6px 12px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  textAlign: 'center',
                  verticalAlign: 'top'
                }}>
                  {isIdentity ? 
                    <span style={{ color: 'var(--color-success)', fontSize: '14px' }} title={`IDENTITY(${identitySeed},${identityIncrement})`}>
                      🔢 ({identitySeed},{identityIncrement})
                    </span> : 
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>-</span>
                  }
                </td>
                <td className="column-nullable" style={{ 
                  padding: '6px 12px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  textAlign: 'center',
                  verticalAlign: 'top'
                }}>
                  {isNullable ? 
                    <span className="nullable-yes">✓</span> : 
                    <span className="nullable-no">✗</span>
                  }
                </td>
                <td className="column-default" style={{ 
                  padding: '6px 12px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  verticalAlign: 'top'
                }}>
                  {defaultValue && defaultValue !== 'NULL' ? defaultValue : '-'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
