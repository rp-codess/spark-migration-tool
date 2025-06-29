/**
 * Card Component
 * Reusable card component for consistent UI styling
 */

import React from 'react';

const Card = ({ 
    children, 
    className = '', 
    title = null, 
    style = {},
    onClick = null,
    ...props 
}) => {
    const baseStyle = {
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        transition: 'box-shadow 0.2s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        ...style
    };

    const hoverStyle = onClick ? {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)'
    } : {};

    return (
        <div 
            className={`card ${className}`}
            style={baseStyle}
            onClick={onClick}
            onMouseEnter={(e) => onClick && Object.assign(e.target.style, hoverStyle)}
            onMouseLeave={(e) => onClick && Object.assign(e.target.style, baseStyle)}
            {...props}
        >
            {title && (
                <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '12px',
                    color: '#333'
                }}>
                    {title}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
