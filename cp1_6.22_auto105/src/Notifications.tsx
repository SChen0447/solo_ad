import { useEffect } from 'react';
import type { Notification } from './types';

interface NotificationsProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

function Notifications({ notifications, onRemove }: NotificationsProps) {
  useEffect(() => {
    notifications.forEach(notification => {
      const timer = setTimeout(() => {
        onRemove(notification.id);
      }, 5000);
      return () => clearTimeout(timer);
    });
  }, [notifications, onRemove]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '!';
      default: return 'i';
    }
  };

  return (
    <div className="toast-container">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`toast ${notification.type}`}
        >
          <div className="toast-icon">
            {getIcon(notification.type)}
          </div>
          <span className="toast-message">{notification.message}</span>
        </div>
      ))}
    </div>
  );
}

export default Notifications;
