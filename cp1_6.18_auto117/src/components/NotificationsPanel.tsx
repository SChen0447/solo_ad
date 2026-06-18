import { useAppStore } from '../store/useAppStore';

const iconMap = {
  success: '✅',
  info: 'ℹ️',
  error: '⚠️',
};

export default function NotificationsPanel() {
  const notifications = useAppStore(s => s.notifications);
  const clearNotification = useAppStore(s => s.clearNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="notifications-panel">
      {notifications.map(n => (
        <div key={n.id} className={`notification-card ${n.type}`}>
          <span className="notification-icon">{iconMap[n.type]}</span>
          <span className="notification-msg">{n.message}</span>
          <button
            className="notification-close"
            onClick={() => clearNotification(n.id)}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
