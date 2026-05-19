import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

const ICONS = {
  success: <CheckCircle size={18} />,
  error:   <XCircle    size={18} />,
  warning: <AlertTriangle size={18} />,
  info:    <Info       size={18} />,
};

const Toast = ({ toasts, onClose }) => {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} role="alert">
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-message">{t.message}</span>
          <button
            className="toast-close"
            onClick={() => onClose(t.id)}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
