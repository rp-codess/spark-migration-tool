import React from 'react'

export default function TableMapping() {
  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
      <h3>Table Mapping Configuration</h3>
      <p>Configure how tables should be mapped during migration</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h4>Source Tables</h4>
          <div style={{ height: '150px', backgroundColor: '#f0f8ff', padding: '10px' }}>
            Source table list
          </div>
        </div>
        <div>
          <h4>Target Configuration</h4>
          <div style={{ height: '150px', backgroundColor: '#f0fff0', padding: '10px' }}>
            Target mapping settings
          </div>
        </div>
      </div>
    </div>
  )
}
