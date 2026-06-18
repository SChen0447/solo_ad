import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export default function NotificationBell() {
  const hasNewContent = useAppStore(s => s.hasNewContent);
  const dismissNewContent = useAppStore(s => s.dismissNewContent);
  const notifications = useAppStore(s => s.notifications);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (hasNewContent) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasNewContent, notifications.length]);

  return (
    <div className="nav-bell-wrapper">
      <button
        className={`nav-bell ${shaking ? 'bell-shake' : ''}`}
        onClick={dismissNewContent}
        aria-label="通知"
      >
        🔔
        {(hasNewContent || notifications.length > 0) && (
          <span className="bell-badge" />
        )}
      </button>
    </div>
  );
}
