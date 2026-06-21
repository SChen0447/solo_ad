import { useNavigate } from 'react-router-dom';
import type { Notification } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const NotificationDrawer = ({ isOpen, onClose, notifications, onMarkRead, onMarkAllRead }: NotificationDrawerProps) => {
  const navigate = useNavigate();

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_assignment': return '📝';
      case 'graded': return '✅';
      case 'course_change': return '🔔';
      default: return '🔔';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    onMarkRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={drawerStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>通知中心</h2>
          <button onClick={onClose} style={closeButtonStyle}>✕</button>
        </div>
        
        <div style={actionBarStyle}>
          <span style={countStyle}>
            {notifications.filter(n => !n.isRead).length} 条未读
          </span>
          <button onClick={onMarkAllRead} style={markAllButtonStyle}>
            全部已读
          </button>
        </div>

        <div style={listStyle}>
          {notifications.length === 0 ? (
            <div style={emptyStyle}>
              <div style={emptyIconStyle}>📭</div>
              <p style={emptyTextStyle}>暂无通知</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                style={{
                  ...itemStyle,
                  backgroundColor: notification.isRead ? '#FFFFFF' : '#F5F3FF'
                }}
                onClick={() => handleNotificationClick(notification)}
              >
                <div style={itemIconStyle}>{getIcon(notification.type)}</div>
                <div style={itemContentStyle}>
                  <p style={itemTitleStyle}>{notification.title}</p>
                  <p style={itemTextStyle}>{notification.content}</p>
                  <p style={itemTimeStyle}>{formatTime(notification.createdAt)}</p>
                </div>
                {!notification.isRead && <div style={unreadDotStyle} />}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  zIndex: 1100,
  animation: 'fadeIn 0.3s ease'
};

const drawerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: '380px',
  height: '100vh',
  backgroundColor: '#FFFFFF',
  boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.1)',
  zIndex: 1101,
  display: 'flex',
  flexDirection: 'column',
  animation: 'slideInRight 0.3s ease'
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid #E5E7EB',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const titleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#1F2937'
};

const closeButtonStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#F3F4F6',
  cursor: 'pointer',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const actionBarStyle: React.CSSProperties = {
  padding: '12px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #F3F4F6'
};

const countStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6B7280'
};

const markAllButtonStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#7C3AED',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontWeight: '500'
};

const listStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto'
};

const itemStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderBottom: '1px solid #F3F4F6',
  display: 'flex',
  gap: '12px',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  position: 'relative'
};

const itemIconStyle: React.CSSProperties = {
  fontSize: '20px',
  flexShrink: 0,
  lineHeight: 1
};

const itemContentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0
};

const itemTitleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1F2937',
  marginBottom: '4px'
};

const itemTextStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6B7280',
  lineHeight: '1.5',
  marginBottom: '4px'
};

const itemTimeStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF'
};

const unreadDotStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  right: '24px',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#EF4444',
  flexShrink: 0
};

const emptyStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 24px'
};

const emptyIconStyle: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '16px'
};

const emptyTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#9CA3AF'
};

export default NotificationDrawer;
