import React, { memo } from 'react'

export default memo(function StatsCards({ tablesCount, selectedTable, tableSchema, tableRowCount }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-number primary">{tablesCount}</div>
        <div className="stat-label">Total Tables</div>
      </div>
      <div className="stat-card">
        <div className="stat-number success">
          {selectedTable ? tableSchema.length : 0}
        </div>
        <div className="stat-label">Columns Selected</div>
      </div>
      <div className="stat-card">
        <div className="stat-number info">
          {tableRowCount !== null ? tableRowCount.toLocaleString() : '-'}
        </div>
        <div className="stat-label">Rows in Table</div>
      </div>
    </div>
  )
})
