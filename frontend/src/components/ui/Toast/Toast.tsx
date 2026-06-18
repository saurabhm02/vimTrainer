import React, { useEffect } from 'react';
import type { Toast as ToastType } from '../../../types/stores';
import { useUIStore } from '../../../stores/uiStore';

interface ToastProps {
  toast: ToastType;
}

export const Toast = React.memo(function Toast({ toast }: ToastProps) {
  const removeToast = useUIStore((s) => s.removeToast);

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const timer = setTimeout(() => removeToast(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <div className={`toast toast--${toast.type}`} role="alert" aria-live="polite">
      <div className="toast__icon">
        {toast.type === 'success' && '✓'}
        {toast.type === 'error' && '✗'}
        {toast.type === 'info' && 'i'}
      </div>
      <span className="toast__message">{toast.message}</span>
      <button
        className="toast__close"
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
});
