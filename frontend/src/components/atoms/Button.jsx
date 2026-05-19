import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  ...props
}) => {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? (
        <span className="spinner-inline" />
      ) : (
        <>
          {leftIcon && <span className="btn-icon">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="btn-icon">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;
