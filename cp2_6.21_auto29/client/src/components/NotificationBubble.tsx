import { useEffect, useState } from 'react';
import type { Notification } from '../types';

interface NotificationBubbleProps {
  notification: Notification | null;
  onClose: () => void;
  onClick: () => void;
}

const NotificationBubble = ({ notification, onClose, onClick }: NotificationBubbleProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      setIsFadingOut(false);
      
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose();
        }, 300);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification || !isVisible) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_assignment': return '📝';
      case 'graded': return '✅';
      case 'course_change': return '🔔';
      default: return '🔔';
    }
  };

  return (
    <div 
      style={{
        ...bubbleStyle,
        animation: isFadingOut ? 'fadeOut 0.3s ease forwards' : 'slideInRight 0.4s ease'
      }}
      onClick={onClick}
    >
      <div style={iconStyle}>{getIcon(notification.type)}</div>
      <div style={contentStyle}>
        <p style={titleStyle}>{notification.title}</p>
        <p style={textStyle}>{notification.content}</p>
        <span style={linkStyle}>点击查看详情 →</span>
      </div>
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          setIsFadingOut(true);
          setTimeout(() => {
            setIsVisible(false);
            onClose();
          }, 300);
        }} 
        style={closeBtnStyle}
      >
        ✕
      </button>
    </div>
  );
};

const bubbleStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  width: '320px',
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  padding: '16px',
  display: 'flex',
  gap: '12px',
  cursor: 'pointer',
  zIndex: 900,
  alignItems: 'flex-start'
};

const iconStyle: React.CSSProperties = {
  fontSize: '24px',
  flexShrink: 0,
  lineHeight: 1
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0
};

const titleStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1F2937',
  marginBottom: '4px'
};

const textStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6B7280',
  lineHeight: '1.5',
  marginBottom: '8px'
};

const linkStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#7C3AED',
  fontWeight: '500'
};

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  width: '24px',
  height: '24px',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  fontSize: '12px',
  color: '#9CA3AF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

export default NotificationBubble;
