import React from 'react';

const Notification = ({ 
  show, 
  onClose, 
  type = 'success', 
  title, 
  message, 
  duration = 5000 
}) => {
  React.useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#d4edda',
          borderColor: '#c3e6cb',
          color: '#155724',
          icon: '✅'
        };
      case 'error':
        return {
          backgroundColor: '#f8d7da',
          borderColor: '#f5c6cb',
          color: '#721c24',
          icon: '❌'
        };
      case 'warning':
        return {
          backgroundColor: '#fff3cd',
          borderColor: '#ffeaa7',
          color: '#856404',
          icon: '⚠️'
        };
      case 'info':
        return {
          backgroundColor: '#d1ecf1',
          borderColor: '#bee5eb',
          color: '#0c5460',
          icon: 'ℹ️'
        };
      default:
        return {
          backgroundColor: '#f8f9fa',
          borderColor: '#dee2e6',
          color: '#495057',
          icon: 'ℹ️'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        minWidth: '300px',
        maxWidth: '500px',
        padding: '16px',
        border: `1px solid ${typeStyles.borderColor}`,
        borderRadius: '8px',
        backgroundColor: typeStyles.backgroundColor,
        color: typeStyles.color,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 10000,
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ fontSize: '18px', flexShrink: 0 }}>
          {typeStyles.icon}
        </div>
        <div style={{ flex: 1 }}>
          {title && (
            <div style={{ 
              fontWeight: 'bold', 
              marginBottom: '4px',
              fontSize: '14px'
            }}>
              {title}
            </div>
          )}
          <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
            {message}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: typeStyles.color,
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            lineHeight: '1',
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        >
          ×
        </button>
      </div>
      
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Notification;
