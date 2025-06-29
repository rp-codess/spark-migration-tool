/**
 * ProgressBar Component
 * Displays progress with percentage and optional label
 */

import React from 'react';

const ProgressBar = ({ 
    value = 0,
    max = 100,
    label = '',
    showPercentage = true,
    variant = 'primary',
    size = 'medium',
    animated = false,
    className = '',
    style = {}
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const getVariantColor = () => {
        const colors = {
            primary: '#007bff',
            success: '#28a745',
            warning: '#ffc107',
            danger: '#dc3545',
            info: '#17a2b8'
        };
        return colors[variant] || colors.primary;
    };

    const getSizeHeight = () => {
        const heights = {
            small: '8px',
            medium: '12px',
            large: '16px'
        };
        return heights[size] || heights.medium;
    };

    const containerStyle = {
        width: '100%',
        backgroundColor: '#e9ecef',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
        height: getSizeHeight(),
        ...style
    };

    const barStyle = {
        width: `${percentage}%`,
        height: '100%',
        backgroundColor: getVariantColor(),
        transition: 'width 0.3s ease-in-out',
        borderRadius: 'inherit'
    };

    const animatedStyle = animated ? {
        backgroundImage: `linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 75%,
            transparent
        )`,
        backgroundSize: '1rem 1rem',
        animation: 'progress-bar-stripes 1s linear infinite'
    } : {};

    const textStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '10px',
        fontWeight: '500',
        color: percentage > 50 ? 'white' : '#333',
        whiteSpace: 'nowrap',
        zIndex: 1
    };

    return (
        <div className={`progress-bar-container ${className}`}>
            {label && (
                <div style={{
                    marginBottom: '4px',
                    fontSize: '12px',
                    color: '#666',
                    fontWeight: '500'
                }}>
                    {label}
                </div>
            )}
            <div style={containerStyle}>
                <div 
                    style={{...barStyle, ...animatedStyle}}
                    role="progressbar"
                    aria-valuenow={value}
                    aria-valuemin={0}
                    aria-valuemax={max}
                />
                {showPercentage && (
                    <div style={textStyle}>
                        {Math.round(percentage)}%
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressBar;
