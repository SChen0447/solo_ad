import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const id = 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const newNotification: Notification = {
        ...notification,
        id,
        timestamp: Date.now(),
      };
      setNotifications((prev) => [...prev, newNotification]);

      setTimeout(() => {
        removeNotification(id);
      }, 2500);
    },
    [removeNotification]
  );

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/portfolios?page=1&pageSize=20');
        const data = await response.json();
        if (data.rankChanges && data.rankChanges.length > 0) {
          data.rankChanges.forEach((change: any) => {
            addNotification({
              type: change.change > 0 ? 'rank-up' : 'rank-down',
              title: change.title,
              change: Math.abs(change.change),
            });
          });
        }
      } catch (e) {
        // 静默失败
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification }}
    >
      {children}
      <div className="notification-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification notification-${notification.type}`}
          >
            <div className="notification-content">
              <div className="notification-title">
                {notification.type === 'rank-up' ? '↑ 排名上升' : '↓ 排名下降'}
              </div>
              <div className="notification-message">
                《{notification.title}》排名{notification.type === 'rank-up' ? '上升' : '下降'}了{' '}
                {notification.change} 名
              </div>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
