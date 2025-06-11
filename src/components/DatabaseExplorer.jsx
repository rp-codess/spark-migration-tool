import React from 'react'

export default function DatabaseExplorer() {
  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
      <h3>Database Explorer</h3>
      <p>Database tables and schema will be displayed here</p>
      <div style={{ height: '200px', backgroundColor: '#f5f5f5', padding: '10px' }}>
        <ul>
          <li>📊 Table 1</li>
          <li>📊 Table 2</li>
          <li>📊 Table 3</li>
        </ul>
      </div>
    </div>
  )
}
