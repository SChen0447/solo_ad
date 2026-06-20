import React, { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import { Notification } from '../types';
import { apiService } from '../services/apiService';
import { websocketService } from '../services/websocketService';

interface NotificationCenterProps {
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNotificationClick }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    const unsub = websocketService.onNotification(handleNewNotification);
    return unsub;
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await apiService.fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await apiService.markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
      } catch (error) {
        console.error('Failed to mark notification read:', error);
      }
    }
    onNotificationClick?.(notification);
    setIsOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          width: '40px',
          height: '40px',
          border: 'none',
          borderRadius: '8px',
          backgroundColor: isOpen ? '#0f3460' : 'transparent',
          color: '#e0e0e0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          fontSize: '18px',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(15, 52, 96, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
          }
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              minWidth: '18px',
              height: '18px',
              padding: '0 5px',
              backgroundColor: '#e94560',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: 0,
            width: '360px',
            maxHeight: '480px',
            backgroundColor: '#16213e',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h4
              style={{
                margin: 0,
                color: '#e0e0e0',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              通知
            </h4>
            <span
              style={{
                color: '#8892b0',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {unreadCount} 条未读
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#8892b0',
                  fontSize: '13px',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                暂无通知
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    backgroundColor: notification.read ? 'transparent' : 'rgba(233, 69, 96, 0.08)',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = notification.read
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(233, 69, 96, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = notification.read
                      ? 'transparent'
                      : 'rgba(233, 69, 96, 0.08)';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        color: '#e0e0e0',
                        fontSize: '13px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500,
                        flex: 1,
                      }}
                    >
                      {notification.message}
                    </span>
                    {!notification.read && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#e94560',
                          marginLeft: '8px',
                          marginTop: '5px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      color: '#8892b0',
                      fontSize: '11px',
                      fontFamily: 'Inter, sans-serif',
                      marginTop: '4px',
                    }}
                  >
                    {notification.projectName} · {moment(notification.createdAt).fromNow()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
