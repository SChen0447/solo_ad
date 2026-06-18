import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Disc, Menu, X, Settings } from 'lucide-react';

const PublicLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: '首页' }
  ];

  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="header-content">
          <NavLink to="/" className="brand">
            <Disc size={28} style={{ color: '#667eea' }} />
            <span className="brand-text">音乐作品集</span>
          </NavLink>

          <nav className="desktop-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/admin" className="admin-link">
              <Settings size={18} />
              <span>管理后台</span>
            </NavLink>
          </nav>

          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/admin"
              className="mobile-nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings size={18} />
              <span>管理后台</span>
            </NavLink>
          </div>
        )}
      </header>

      <main className="public-content">
        <div className="page-transition">
          <Outlet />
        </div>
      </main>

      <style>{`
        .public-layout {
          min-height: 100vh;
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
        }

        .public-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(10, 10, 26, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-color);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 32px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-text {
          font-size: 20px;
          font-weight: 700;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-link {
          padding: 8px 16px;
          border-radius: 6px;
          color: var(--text-secondary);
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .nav-link:hover {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .nav-link.active {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .admin-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          color: var(--text-secondary);
          font-weight: 500;
          transition: all 0.2s ease;
          margin-left: 16px;
          border-left: 1px solid var(--border-color);
        }

        .admin-link:hover {
          color: var(--text-primary);
          background: var(--bg-secondary);
        }

        .mobile-menu-btn {
          display: none;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          border-radius: 8px;
        }

        .mobile-menu-btn:hover {
          background: var(--bg-secondary);
        }

        .mobile-nav {
          display: none;
          flex-direction: column;
          padding: 12px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          border-radius: 8px;
          color: var(--text-secondary);
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .mobile-nav-link:hover, .mobile-nav-link.active {
          color: var(--text-primary);
          background: var(--bg-tertiary);
        }

        .public-content {
          flex: 1;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 32px;
        }

        @media (max-width: 768px) {
          .header-content {
            padding: 0 20px;
            height: 60px;
          }

          .desktop-nav {
            display: none;
          }

          .mobile-menu-btn {
            display: flex;
          }

          .mobile-nav {
            display: flex;
          }

          .public-content {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicLayout;
