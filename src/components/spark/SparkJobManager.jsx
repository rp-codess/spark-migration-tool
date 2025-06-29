import React from 'react'

export default function SparkJobManager() {
  return (
    <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px' }}>
      <h3>Spark Job Manager</h3>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button style={{ padding: '8px 16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
          Start Migration
        </button>
        <button style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}>
          Stop Jobs
        </button>
        <button style={{ padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}>
          View Spark UI
        </button>
      </div>
      <div style={{ height: '120px', backgroundColor: '#f5f5f5', padding: '10px' }}>
        <div>🔧 Spark Job Status: Ready</div>
        <div>📝 Active Jobs: 0</div>
        <div>⚡ Spark Context: Not Started</div>
      </div>
    </div>
  )
}
