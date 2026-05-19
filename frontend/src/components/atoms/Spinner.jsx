import React from 'react';
import './Spinner.css';

const Spinner = ({ size = 'md', className = '' }) => {
  return (
    <div className={`spinner-container ${className}`}>
      <div className={`spinner spinner-${size}`}></div>
    </div>
  );
};

export default Spinner;
