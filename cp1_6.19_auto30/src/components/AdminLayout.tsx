import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Music, Disc, Menu, X, LogOut } from 'lucide-react';
import useStore from '../store/useStore';

const AdminLayout: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, isAuthenticated, logout } = useStore();
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setSidebarOpen]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: '/admin/tracks', label: '曲目管理', icon: Music },
    { path: '/admin/albums', label: '专辑管理', icon: Disc }
  ];

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1 className="login-title">管理后台登录</h1>
          <p className="login-subtitle">音乐作品集管理系统</p>
          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: '20px' }}
            onClick={() => useStore.getState().login()}
          >
            进入管理后台
          </button>
        </div>
        <style>{`
          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
            padding: 20px;
          }
          .login-box {
            background: var(--bg-secondary);
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
          }
          .login-title {
            font-size: 24px;
            margin-bottom: 8px;
            color: var(--text-primary);
          }
          .login-subtitle {
            color: var(--text-secondary);
            margin-bottom: 24px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {isMobile && (
        <div className="mobile-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="mobile-title">管理后台</span>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        </div>
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Disc size={28} style={{ color: '#667eea' }} />
            <span className="logo-text">音乐作品集</span>
          </div>
          {!isMobile && (
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={20} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => isMobile && setSidebarOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/" target="_blank" className="nav-item">
            <Disc size={20} />
            <span>查看公开页面</span>
          </NavLink>
        </div>
      </aside>

      {sidebarOpen && isMobile && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="admin-content">
        <div className="page-transition">
          <Outlet />
        </div>
      </main>

      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg-primary);
        }

        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: var(--bg-secondary);
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 100;
          border-bottom: 1px solid var(--border-color);
        }

        .menu-btn, .logout-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: var(--text-primary);
          transition: background 0.2s;
        }

        .menu-btn:hover, .logout-btn:hover {
          background: var(--bg-tertiary);
        }

        .mobile-title {
          font-size: 16px;
          font-weight: 600;
        }

        .sidebar {
          width: 260px;
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          z-index: 200;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 150;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 600;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .nav-item.active {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .sidebar-footer {
          padding: 12px;
          border-top: 1px solid var(--border-color);
        }

        .admin-content {
          flex: 1;
          margin-left: 260px;
          padding: 32px;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .mobile-header {
            display: flex;
          }

          .sidebar {
            transform: translateX(-100%);
            top: 60px;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .admin-content {
            margin-left: 0;
            margin-top: 60px;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
