import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  visible,
  type = 'success',
  duration = 2000,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  if (!isVisible && !visible) return null;

  const bgColor = type === 'success' ? '#27AE60' : type === 'error' ? '#E74C3C' : '#3498DB';

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: isVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-100%)',
        backgroundColor: bgColor,
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 2000,
        fontSize: '14px',
        fontWeight: 500,
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
        opacity: isVisible ? 1 : 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      {message}
    </div>
  );
};
