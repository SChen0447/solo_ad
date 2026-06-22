import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  const navItems = [
    { path: '/', icon: '📊', label: '招新看板' },
    { path: '/recruitment', icon: '📋', label: '招新列表' },
    { path: '/portfolios', icon: '🎨', label: '作品展示' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', icon: '⚙️', label: '管理面板' });
  }

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <ul className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={onClose}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
