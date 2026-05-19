import React from 'react';
import './Typography.css';

const Typography = ({ variant = 'p', children, className = '', color = 'main', weight = 'normal', ...props }) => {
  const Component = variant.startsWith('h') ? variant : 'p';
  const classes = `typography typography-${variant} text-${color} font-${weight} ${className}`;

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

export default Typography;
