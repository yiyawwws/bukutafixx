import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Toast from '../components/atoms/Toast';

const ToastContext = createContext(null);

let _id = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((type, message, duration = 4000) => {
    const id = ++_id;
    setToasts(prev => [...prev, { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => add('success', msg, dur),
    error:   (msg, dur) => add('error',   msg, dur),
    warning: (msg, dur) => add('warning', msg, dur),
    info:    (msg, dur) => add('info',    msg, dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Toast toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
