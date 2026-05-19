import React from 'react';
import Input from '../atoms/Input';
import Typography from '../atoms/Typography';

const FormField = React.forwardRef(({ label, error, helperText, ...props }, ref) => {
  return (
    <div style={{ width: '100%' }}>
      <Input ref={ref} label={label} error={error} {...props} />
      {helperText && !error && (
        <Typography variant="caption" color="muted" style={{ marginTop: '0.25rem' }}>
          {helperText}
        </Typography>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;
