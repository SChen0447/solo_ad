import { useState, ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/', label: '订单看板', icon: '📋' },
  { path: '/materials', label: '素材库', icon: '🖼️' },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = menuItems.find(m => m.path === location.pathname)?.label || '手工艺工作室';

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">艺</span>
            <span className="logo-text">手工艺工作室</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="main-wrapper">
        <header className="top-nav">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="菜单"
          >
            <span />
            <span />
            <span />
          </button>
          <h1 className="page-title">{currentTitle}</h1>
          <div className="user-avatar" title="工作室主">
            主
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
