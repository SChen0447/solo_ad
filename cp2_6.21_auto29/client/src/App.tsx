import { useState, useEffect, useCallback } from 'react';
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

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
      
      const latestUnread = data.find(n => !n.isRead);
      if (latestUnread && !currentBubble) {
        setCurrentBubble(latestUnread);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [currentBubble]);

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
      console.error('Failed to mark notification read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications read:', error);
    }
  };

  const handleNotificationClick = () => {
    setIsDrawerOpen(true);
    setCurrentBubble(null);
  };

  const handleBubbleClose = () => {
    setCurrentBubble(null);
  };

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
          onClose={handleBubbleClose}
          onClick={handleNotificationClick}
        />

        <NotificationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          notifications={notifications}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
        />
      </div>
    </Router>
  );
}

export default App;
