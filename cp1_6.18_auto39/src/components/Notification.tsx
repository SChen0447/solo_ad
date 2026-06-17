import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { v4 as uuidv4 } from 'uuid';

interface NotificationItem {
  id: string;
  deviceId: string;
  deviceName: string;
  message: string;
}

export default function Notification() {
  const { notifications, removeNotification } = useStore();

  const handleConfirm = (id: string) => {
    removeNotification(id);
  };

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onConfirm={handleConfirm}
        />
      ))}
    </div>
  );
}

function NotificationItem({ notification, onConfirm }: { notification: NotificationItem; onConfirm: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onConfirm(notification.id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [notification.id, onConfirm]);

  return (
    <div className="notification">
      <div className="notification-title">设备空闲提醒</div>
      <div className="notification-message">{notification.message}</div>
      <div className="notification-actions">
        <button
          className="notification-btn confirm"
          onClick={() => onConfirm(notification.id)}
        >
          确认
        </button>
      </div>
      <div className="notification-timer"></div>
    </div>
  );
}

export function showNotification(message: string, deviceId: string, deviceName: string) {
  const { addNotification } = useStore.getState();
  addNotification({
    id: uuidv4(),
    deviceId,
    deviceName,
    message,
  });
}
