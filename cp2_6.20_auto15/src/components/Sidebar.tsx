import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '../styles/sidebar.css';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/artists', label: '艺术家', icon: '🎤' },
    { path: '/calendar', label: '演出日历', icon: '📅' },
    { path: '/releases', label: '发布计划', icon: '🎵' },
    { path: '/dashboard', label: '数据概览', icon: '📊' },
  ];

  const isActive = (path: string) => {
    if (path === '/artists') {
      return location.pathname.startsWith('/artists');
    }
    return location.pathname === path;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🎸</span>
        <span className="logo-text">星光厂牌</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`sidebar-nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="footer-text">© 2025 星光音乐</div>
      </div>
    </aside>
  );
};

export default Sidebar;
