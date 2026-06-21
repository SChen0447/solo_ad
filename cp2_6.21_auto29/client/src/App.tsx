import { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import NotificationBubble from './components/NotificationBubble';
import NotificationDrawer from './components/NotificationDrawer';
import CourseList from './pages/CourseList';
import CourseDetail from './pages/CourseDetail';
import AssignmentList from './pages/AssignmentList';
import AssignmentDetail from './pages/AssignmentDetail';
import { api } from './services/api';
import type { Notification } from './types';

function App() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentBubble, setCurrentBubble] = useState<Notification | null>(null);
  const [displayedNotificationIds, setDisplayedNotificationIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFirstLoad = useRef(true);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 3000);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
      
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
        return;
      }
      
      const latestUnread = data.find(n => !n.isRead && !displayedNotificationIds.has(n.id));
      if (latestUnread && !currentBubble) {
        setCurrentBubble(latestUnread);
        setDisplayedNotificationIds(prev => new Set([...prev, latestUnread.id]));
      }
    } catch (error) {
      if (error instanceof Error) {
        showError(error.message);
      }
    }
  }, [currentBubble, displayedNotificationIds, showError]);

  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      if (error instanceof Error) {
        showError(error.message);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setDisplayedNotificationIds(new Set());
    } catch (error) {
      if (error instanceof Error) {
        showError(error.message);
      }
    }
  };

  const handleNotificationClick = async () => {
    if (currentBubble) {
      await handleMarkRead(currentBubble.id);
    }
    setIsDrawerOpen(true);
    setCurrentBubble(null);
  };

  const handleBubbleClose = useCallback(async () => {
    if (currentBubble) {
      await handleMarkRead(currentBubble.id);
    }
    setCurrentBubble(null);
  }, [currentBubble]);

  const handleBubbleDismiss = useCallback(() => {
    setCurrentBubble(null);
  }, []);

  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
        <Navbar 
          unreadCount={unreadCount} 
          onNotificationClick={() => setIsDrawerOpen(true)} 
        />
        
        <Routes>
          <Route path="/" element={<CourseList />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          <Route path="/assignments" element={<AssignmentList />} />
          <Route path="/assignments/:id" element={<AssignmentDetail />} />
        </Routes>

        <NotificationBubble
          notification={currentBubble}
          onClose={handleBubbleDismiss}
          onAutoClose={handleBubbleClose}
          onClick={handleNotificationClick}
        />

        <NotificationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
        />

        {errorMessage && (
          <div style={errorToastStyle}>
            <span style={{ marginRight: '8px' }}>⚠️</span>
            {errorMessage}
          </div>
        )}
      </div>
    </Router>
  );
}

const errorToastStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '100px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '12px 20px',
  backgroundColor: '#FEE2E2',
  color: '#991B1B',
  borderRadius: '8px',
  fontSize: '14px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  zIndex: 2000,
  animation: 'slideInBottom 0.3s ease',
  display: 'flex',
  alignItems: 'center'
};

export default App;
