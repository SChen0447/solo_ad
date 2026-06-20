import React, { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import CalendarPage from './pages/CalendarPage';
import EquipmentPage from './pages/EquipmentPage';
import InventoryPage from './pages/InventoryPage';
import StatsPanel from './pages/StatsPanel';

const App: React.FC = () => {
  const location = useLocation();
  const [animationKey, setAnimationKey] = useState(0);
  const [slideDirection, setSlideDirection] = useState('left');

  const navItems = [
    { path: '/', label: '乐队日历', icon: '📅' },
    { path: '/equipment', label: '设备清单', icon: '🎸' },
    { path: '/inventory', label: '库存管理', icon: '📦' },
    { path: '/stats', label: '统计', icon: '📊' }
  ];

  React.useEffect(() => {
    const paths = navItems.map(item => item.path);
    const currentIndex = paths.findIndex(p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p)));
    const prevIndex = paths.findIndex(p => {
      if (p === '/') return animationKey === 0;
      return false;
    });
    setSlideDirection(currentIndex > prevIndex ? 'right' : 'left');
    setAnimationKey(prev => prev + 1);
  }, [location.pathname]);

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🎵</span>
          <span className="logo-text">乐队巡演</span>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                end={item.path === '/'}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-avatar">👤</span>
            <span className="user-name">乐队成员</span>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <div
          className="page-container"
          key={animationKey}
          style={{
            animation: `${slideDirection === 'right' ? 'slideInRight' : 'slideInLeft'} 0.25s ease-out`
          }}
        >
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/stats" element={<StatsPanel />} />
          </Routes>
        </div>
      </main>

      <style>{`
        .app-container {
          display: flex;
          min-height: 100vh;
          background-color: #1a1a2e;
        }

        .sidebar {
          width: 220px;
          background-color: #0f3460;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 100;
        }

        .sidebar-logo {
          padding: 24px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .logo-icon {
          font-size: 28px;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 600;
          color: #e0e0e0;
        }

        .nav-list {
          list-style: none;
          flex: 1;
          padding: 16px 0;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px 12px;
          margin: 4px 12px;
          border-radius: 8px;
          color: #e0e0e0;
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
          cursor: pointer;
        }

        .nav-item:hover {
          background-color: #533483;
        }

        .nav-item.active {
          background-color: #533483;
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: -12px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 60%;
          background: linear-gradient(180deg, #4ECDC4, #45B7D1);
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 10px rgba(78, 205, 196, 0.6);
        }

        .nav-icon {
          font-size: 24px;
          margin-bottom: 6px;
        }

        .nav-label {
          font-size: 13px;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .user-avatar {
          font-size: 32px;
        }

        .user-name {
          font-size: 14px;
          color: #e0e0e0;
        }

        .main-content {
          flex: 1;
          margin-left: 220px;
          padding: 24px;
          overflow-x: hidden;
        }

        .page-container {
          width: 100%;
        }

        @media (max-width: 768px) {
          .app-container {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            height: 64px;
            flex-direction: row;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: auto;
            z-index: 100;
            padding: 0;
          }

          .sidebar-logo {
            display: none;
          }

          .nav-list {
            display: flex;
            flex-direction: row;
            padding: 0;
            flex: 1;
            justify-content: space-around;
          }

          .nav-item {
            flex-direction: row;
            padding: 8px 12px;
            margin: 0;
            gap: 6px;
          }

          .nav-item.active::before {
            display: none;
          }

          .nav-item.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 60%;
            height: 3px;
            background: linear-gradient(90deg, #4ECDC4, #45B7D1);
            border-radius: 3px 3px 0 0;
            box-shadow: 0 0 8px rgba(78, 205, 196, 0.6);
          }

          .nav-icon {
            font-size: 20px;
            margin-bottom: 0;
          }

          .nav-label {
            font-size: 12px;
          }

          .sidebar-footer {
            display: none;
          }

          .main-content {
            margin-left: 0;
            margin-top: 64px;
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
