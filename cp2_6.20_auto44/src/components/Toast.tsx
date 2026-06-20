import React from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  return (
    <div className="toast-container">
      <div className="toast" onClick={onClose}>
        <span>{message}</span>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string }>;
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="toast-wrapper">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};
