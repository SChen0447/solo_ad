import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../../services/api';
import './NotificationDrawer.css';

export interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  notifications,
  onMarkAllRead,
  onMarkRead
}) => {
  const navigate = useNavigate();
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) {
      onMarkRead(n.id);
    }
    navigate(n.link);
    onClose();
  };

  return (
    <>
      <div
        className={`drawer-overlay ${open ? 'visible' : ''}`}
        onClick={onClose}
      />
      <div className={`drawer-container ${open ? 'open' : ''}`}>
        <div className="drawer-header">
          <div>
            <h3 className="drawer-title">通知中心</h3>
            {unreadCount > 0 && (
              <span className="drawer-unread-count">{unreadCount} 条未读</span>
            )}
          </div>
          <div className="drawer-header-actions">
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={onMarkAllRead}>
                全部已读
              </button>
            )}
            <button className="drawer-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <div className="empty-text">暂无通知</div>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`notification-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  {!n.read && <div className="unread-dot" />}
                  <div className="item-icon">{n.icon}</div>
                  <div className="item-content">
                    <div className="item-title-row">
                      <span className="item-title">{n.title}</span>
                      <span className="item-time">{formatTime(n.createdAt)}</span>
                    </div>
                    <div className="item-message">{n.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
