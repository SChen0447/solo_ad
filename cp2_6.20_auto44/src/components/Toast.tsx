import { useEffect, useState, type FC } from 'react';

interface ToastItemProps {
  id: string;
  message: string;
  duration: number;
  onRemove: (id: string) => void;
}

const ToastItem: FC<ToastItemProps> = ({ id, message, duration, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onRemove(id), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onRemove]);

  return (
    <div
      className={`toast-item ${isVisible ? 'toast-visible' : ''}`}
      onClick={() => {
        setIsVisible(false);
        setTimeout(() => onRemove(id), 300);
      }}
    >
      <span>{message}</span>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; duration: number }>;
  onRemove: (id: string) => void;
}

export const ToastContainer: FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="toast-wrapper">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          duration={toast.duration}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};
