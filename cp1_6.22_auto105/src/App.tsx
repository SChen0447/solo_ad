import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import type { Notification as NotificationType } from './types';
import ToolMarket from './ToolMarket';
import TaskBoard from './TaskBoard';
import IntegralPanel from './IntegralPanel';
import Notifications from './Notifications';

function App() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const location = useLocation();

  const addNotification = useCallback((message: string, type: NotificationType['type'] = 'info') => {
    const id = Date.now().toString();
    const newNotification: NotificationType = {
      id,
      message,
      type,
      createdAt: new Date().toISOString(),
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    if (location.pathname === '/tasks') {
      addNotification('欢迎来到任务看板，查看邻居们的求助吧！', 'info');
    } else if (location.pathname === '/integral') {
      addNotification('您的积分记录已更新', 'info');
    }
  }, [location.pathname, addNotification]);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-text">邻里</span>
          </div>
          <div className="nav-links">
            <NavLink 
              to="/" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end
            >
              工具市场
            </NavLink>
            <NavLink 
              to="/tasks" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              任务看板
            </NavLink>
            <NavLink 
              to="/integral" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              积分面板
            </NavLink>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<ToolMarket onNotify={addNotification} />} />
          <Route path="/tasks" element={<TaskBoard onNotify={addNotification} />} />
          <Route path="/integral" element={<IntegralPanel />} />
        </Routes>
      </main>

      <Notifications 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </div>
  );
}

export default App;
