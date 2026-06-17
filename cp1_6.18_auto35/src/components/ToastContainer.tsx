import React from 'react';
import { useResumeStore } from '../store/resumeStore';

const getToastIcon = (type: 'success' | 'error' | 'info'): string => {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'info':
      return 'ℹ️';
  }
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useResumeStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <span className="toast-icon">{getToastIcon(toast.type)}</span>
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              className="toast-action"
              onClick={() => {
                toast.action?.onClick();
              }}
            >
              {toast.action.label}
            </button>
          )}
          {!toast.action && (
            <button
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '4px',
              }}
              onClick={() => removeToast(toast.id)}
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
