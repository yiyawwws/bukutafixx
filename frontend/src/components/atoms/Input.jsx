import React, { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(({ label, error, className = '', id, ...props }, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`input-group ${className}`}>
      {label && <label htmlFor={inputId} className="input-label">{label}</label>}
      <input
        id={inputId}
        ref={ref}
        className={`input-control ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
