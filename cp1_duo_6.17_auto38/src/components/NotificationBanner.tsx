import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  message: string;
  userId: string;
  lineCount: number;
}

interface NotificationBannerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      {notifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onDismiss={() => onDismiss(notif.id)}
        />
      ))}
    </div>
  );
};

const NotificationItem: React.FC<{
  notification: Notification;
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      style={{
        background: 'rgba(255, 252, 245, 0.95)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 14,
        padding: '12px 20px',
        boxShadow: '0 8px 24px rgba(93, 78, 55, 0.15)',
        border: '1px solid rgba(139, 115, 85, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'auto',
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <span style={{ fontSize: 18 }}>✨</span>
      <div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5D4E37' }}>
          {notification.userId}
        </span>
        <span style={{ fontSize: 12, color: '#8B7355', marginLeft: 6 }}>
          {notification.message}
        </span>
      </div>
      <span
        style={{
          fontSize: 12,
          padding: '2px 10px',
          borderRadius: 10,
          background: 'rgba(139, 115, 85, 0.15)',
          color: '#8B7355',
          fontWeight: 600,
        }}
      >
        +{notification.lineCount} 条
      </span>
    </div>
  );
};
