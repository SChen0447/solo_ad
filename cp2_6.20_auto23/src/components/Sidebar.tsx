import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const navItems = [
  { id: 'artists', label: '艺术家管理', icon: '🎤', path: '/artists' },
  { id: 'calendar', label: '演出日历', icon: '📅', path: '/calendar' },
  { id: 'releases', label: '作品发布', icon: '🎵', path: '/releases' },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { artists, tracks, shows } = useAppContext();

  const isActive = (path: string) => {
    if (path === '/artists') return location.pathname.startsWith('/artists');
    return location.pathname === path;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎧</div>
        <span className="sidebar-logo-text">IndieLabel Hub</span>
      </div>

      <nav className="nav-list">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="footer-label">数据概览</div>
        <div className="footer-stat">
          <span>艺术家</span>
          <strong>{artists.length}</strong>
        </div>
        <div className="footer-stat">
          <span>音乐作品</span>
          <strong>{tracks.length}</strong>
        </div>
        <div className="footer-stat">
          <span>演出场次</span>
          <strong>{shows.length}</strong>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
