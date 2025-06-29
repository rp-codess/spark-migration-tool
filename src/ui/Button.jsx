/**
 * Button Component
 * Reusable button component with different variants
 */

import React from 'react';

const Button = ({ 
    children,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    onClick = () => {},
    className = '',
    style = {},
    type = 'button',
    ...props
}) => {
    const getVariantStyles = () => {
        const baseStyles = {
            border: 'none',
            borderRadius: '6px',
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontWeight: '500',
            textAlign: 'center',
            textDecoration: 'none',
            transition: 'all 0.2s ease-in-out',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            outline: 'none',
            opacity: disabled || loading ? 0.6 : 1
        };

        const sizeStyles = {
            small: { padding: '6px 12px', fontSize: '12px' },
            medium: { padding: '8px 16px', fontSize: '14px' },
            large: { padding: '12px 24px', fontSize: '16px' }
        };

        const variantStyles = {
            primary: {
                backgroundColor: '#007bff',
                color: 'white',
                boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)'
            },
            secondary: {
                backgroundColor: '#6c757d',
                color: 'white',
                boxShadow: '0 2px 4px rgba(108, 117, 125, 0.2)'
            },
            success: {
                backgroundColor: '#28a745',
                color: 'white',
                boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)'
            },
            danger: {
                backgroundColor: '#dc3545',
                color: 'white',
                boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)'
            },
            warning: {
                backgroundColor: '#ffc107',
                color: '#212529',
                boxShadow: '0 2px 4px rgba(255, 193, 7, 0.2)'
            },
            outline: {
                backgroundColor: 'transparent',
                color: '#007bff',
                border: '1px solid #007bff'
            }
        };

        return {
            ...baseStyles,
            ...sizeStyles[size],
            ...variantStyles[variant]
        };
    };

    const handleClick = (e) => {
        if (disabled || loading) {
            e.preventDefault();
            return;
        }
        onClick(e);
    };

    return (
        <button
            type={type}
            className={`btn btn-${variant} btn-${size} ${className}`}
            style={{...getVariantStyles(), ...style}}
            onClick={handleClick}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid currentColor',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            )}
            {children}
        </button>
    );
};

export default Button;
