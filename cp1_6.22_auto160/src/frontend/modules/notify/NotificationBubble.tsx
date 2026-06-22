import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import './NotificationBubble.css';

export default function NotificationBubble() {
  const { notifications, unreadCount, markNotificationRead, markAllRead } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (id: string) => {
    markNotificationRead(id);
  };

  const handleMarkAll = () => {
    markAllRead();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="notification-bubble-container" ref={dropdownRef}>
      <button className="notification-bubble" onClick={toggleDropdown}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">通知</span>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={handleMarkAll}>
                全部已读
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">暂无通知</div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleItemClick(notification.id)}
                >
                  <div className="notification-item-title">{notification.title}</div>
                  <div className="notification-item-message">{notification.message}</div>
                  <div className="notification-item-time">
                    {formatTime(notification.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
