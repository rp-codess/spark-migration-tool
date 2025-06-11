import React from 'react'

export default function TransferMonitor() {
  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
      <h3>Transfer Monitor</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#e8f5e8' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>0</div>
          <div>Tables Transferred</div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#fff8dc' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>0</div>
          <div>In Progress</div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#ffe4e1' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>0</div>
          <div>Errors</div>
        </div>
      </div>
      <div style={{ height: '100px', backgroundColor: '#f9f9f9', padding: '10px' }}>
        Progress logs will appear here...
      </div>
    </div>
  )
}
