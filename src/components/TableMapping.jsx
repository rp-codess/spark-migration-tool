import React, { useState } from 'react'

export default function TableMapping() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div style={{ 
      border: '1px solid #e9ecef', 
      padding: '20px', 
      borderRadius: '8px',
      background: '#ffffff',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      margin: '20px 0'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            color: '#2c3e50',
            fontSize: '20px',
            fontWeight: '600'
          }}>
            📊 Table Mapping Configuration
          </h3>
          <p style={{ 
            margin: 0, 
            color: '#6c757d',
            fontSize: '14px'
          }}>
            Configure how tables should be mapped during migration
          </p>
        </div>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.background = '#0056b3'}
          onMouseOut={(e) => e.target.style.background = '#007bff'}
        >
          {isExpanded ? '🔼 Collapse' : '🔽 Expand'}
        </button>
      </div>
      
      {isExpanded && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '24px',
          marginTop: '20px'
        }}>
          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ 
              margin: '0 0 12px 0',
              color: '#495057',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              📋 Source Tables
            </h4>
            <div style={{ 
              height: '200px', 
              backgroundColor: '#ffffff', 
              padding: '12px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '14px',
              color: '#6c757d'
            }}>
              <div style={{ marginBottom: '8px' }}>🔍 Loading source tables...</div>
              <div style={{ marginBottom: '8px' }}>• Table detection in progress</div>
              <div style={{ marginBottom: '8px' }}>• Schema analysis pending</div>
              <div style={{ color: '#28a745' }}>✅ Ready for configuration</div>
            </div>
          </div>
          <div style={{
            background: '#f8f9fa',
            padding: '16px',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ 
              margin: '0 0 12px 0',
              color: '#495057',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              ⚙️ Target Configuration
            </h4>
            <div style={{ 
              height: '200px', 
              backgroundColor: '#ffffff', 
              padding: '12px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '14px',
              color: '#6c757d'
            }}>
              <div style={{ marginBottom: '8px' }}>🎯 Target mapping settings</div>
              <div style={{ marginBottom: '8px' }}>• Column mapping rules</div>
              <div style={{ marginBottom: '8px' }}>• Data type conversions</div>
              <div style={{ color: '#ffc107' }}>⚠️ Configuration required</div>
            </div>
          </div>
        </div>
      )}
      
      {!isExpanded && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#6c757d',
          fontSize: '14px'
        }}>
          Click "Expand" to configure table mapping settings
        </div>
      )}
    </div>
  )
}
