import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, X } from 'lucide-react';
import Button from './Button';
import './ConfirmDialog.css';

const ICONS = {
  danger:  <XCircle     size={28} />,
  success: <CheckCircle size={28} />,
  warning: <AlertTriangle size={28} />,
  info:    <Info        size={28} />,
};

/**
 * ConfirmDialog – modal with dark overlay.
 *
 * Props:
 *  open         {bool}
 *  variant      'danger' | 'warning' | 'success' | 'info'  (default 'warning')
 *  title        {string}
 *  message      {string|node}
 *  confirmLabel {string}   default 'Ya'
 *  cancelLabel  {string}   default 'Batal'
 *  isLoading    {bool}
 *  onConfirm    {fn}
 *  onCancel     {fn}
 */
const ConfirmDialog = ({
  open,
  variant = 'warning',
  title,
  message,
  confirmLabel = 'Ya',
  cancelLabel  = 'Batal',
  isLoading    = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const btnVariant = variant === 'danger'  ? 'danger'
                   : variant === 'success' ? 'success'
                   : 'primary';

  return (
    <div className="cdialog-overlay" onClick={!isLoading ? onCancel : undefined}>
      <div
        className={`cdialog cdialog-${variant}`}
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="cdialog-close"
          onClick={onCancel}
          disabled={isLoading}
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        <div className={`cdialog-icon cdialog-icon-${variant}`}>
          {ICONS[variant]}
        </div>

        {title   && <h3 className="cdialog-title">{title}</h3>}
        {message && <p  className="cdialog-message">{message}</p>}

        <div className="cdialog-actions">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={btnVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
