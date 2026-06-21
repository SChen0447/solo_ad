import React, { useState, useRef, useEffect } from 'react';
import type { AppNotification } from '../types';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onNotificationClick: (id: string) => void;
}

const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
};

const NotificationCenter: React.FC<{
  notifications: AppNotification[];
  onNotificationClick: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}> = ({ notifications, onNotificationClick, isOpen, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const bell = document.querySelector('.notification-bell');
        if (bell && !bell.contains(e.target as Node)) {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return '📅';
      case 'tree': return '🌳';
      case 'achievement': return '🏆';
      default: return '📢';
    }
  };

  return (
    <div className="notification-panel" ref={panelRef}>
      {sortedNotifications.length === 0 ? (
        <div className="empty">暂无通知</div>
      ) : (
        sortedNotifications.map(n => (
          <div
            key={n.id}
            className="notification-item"
            onClick={() => {
              if (!n.read) onNotificationClick(n.id);
            }}
          >
            <span className={`notification-dot ${n.read ? 'read' : 'unread'}`} />
            <div className="notification-content">
              <div className="notification-title">
                {getTypeIcon(n.type)} {n.title}
              </div>
              <div className="notification-message">{n.message}</div>
              <div className="notification-time">{formatRelativeTime(n.timestamp)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

interface NavigationBarProps {
  currentPage: string;
  onNavigate: (page: any) => void;
  notifications: AppNotification[];
  onNotificationClick: (id: string) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  currentPage,
  onNavigate,
  notifications,
  onNotificationClick,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { key: 'home', label: '活动广场', icon: '📅' },
    { key: 'trees', label: '树木地图', icon: '🌳' },
    { key: 'profile', label: '个人中心', icon: '👤' },
    { key: 'stats', label: '数据统计', icon: '📊' },
  ];

  const handleNavigate = (page: any) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const toggleNotifications = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationsOpen(!notificationsOpen);
  };

  return (
    <>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="hamburger" onClick={() => setSidebarOpen(true)}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="navbar-brand" onClick={() => handleNavigate('home')}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
            </svg>
            绿意社区
          </div>
        </div>
        <ul className="navbar-nav">
          {navItems.map(item => (
            <li key={item.key}>
              <a
                className={currentPage === item.key || (item.key === 'trees' && currentPage === 'treeDetail') ? 'active' : ''}
                onClick={() => handleNavigate(item.key)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="navbar-right" style={{ position: 'relative' }}>
          <div
            className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
            onClick={toggleNotifications}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </div>
          <NotificationCenter
            notifications={notifications}
            onNotificationClick={(id) => {
              onNotificationClick(id);
            }}
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
          />
        </div>
      </nav>

      {sidebarOpen && (
        <div className="sidebar-overlay open" onClick={() => setSidebarOpen(false)}>
          <div className="sidebar open" onClick={e => e.stopPropagation()}>
            <div className="sidebar-header">
              🌳 绿意社区
            </div>
            <ul className="sidebar-nav">
              {navItems.map(item => (
                <li key={item.key}>
                  <a onClick={() => handleNavigate(item.key)}>
                    {item.icon} {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default NavigationBar;
