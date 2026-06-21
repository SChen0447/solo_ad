import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../../services/api';
import './NotificationBubble.css';

export interface NotificationBubbleProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationBubble: React.FC<NotificationBubbleProps> = ({ notification, onClose }) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const fadeTimer = setTimeout(() => setFading(true), 2700);
    const closeTimer = setTimeout(onClose, 3100);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  const handleClick = () => {
    navigate(notification.link);
    onClose();
  };

  return (
    <div
      className={`notification-bubble ${visible ? 'visible' : ''} ${fading ? 'fading' : ''}`}
      onClick={handleClick}
    >
      <div className="bubble-icon">{notification.icon}</div>
      <div className="bubble-content">
        <div className="bubble-title">{notification.title}</div>
        <div className="bubble-message">{notification.message}</div>
        <div className="bubble-link">点击查看 →</div>
      </div>
      <button
        className="bubble-close"
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default NotificationBubble;
