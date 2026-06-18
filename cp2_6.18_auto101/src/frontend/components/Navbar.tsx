import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAppStore } from '../store';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isLoggedIn, username, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  return (
    <nav
      style={{
        height: '56px',
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        backdropFilter: 'blur(8px)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Link
        to="/"
        style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#ffffff',
          textDecoration: 'none',
        }}
        onClick={() => setIsMenuOpen(false)}
      >
        办公用品申购系统
      </Link>

      {isMobile ? (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div
            style={{
              position: 'absolute',
              top: '56px',
              right: '0',
              backgroundColor: '#1f2937',
              minWidth: '200px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxHeight: isMenuOpen ? '500px' : '0',
              overflow: 'hidden',
              transition: 'max-height 0.3s ease-out',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
              <button
                onClick={() => handleNavClick('/')}
                style={getNavItemStyle(location.pathname === '/')}
              >
                申购列表
              </button>
              <button
                onClick={() => handleNavClick('/create')}
                style={getNavItemStyle(location.pathname === '/create')}
              >
                新建申购
              </button>
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => handleNavClick('/admin')}
                    style={getNavItemStyle(location.pathname === '/admin')}
                  >
                    审批仪表板
                  </button>
                  <div style={{ padding: '8px 16px', color: '#9ca3af', fontSize: '14px' }}>
                    当前用户：{username}
                  </div>
                  <button onClick={handleLogout} style={getNavItemStyle(false)}>
                    登出
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleNavClick('/login')}
                  style={getNavItemStyle(location.pathname === '/login')}
                >
                  登录
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <Link to="/" style={getDesktopNavStyle(location.pathname === '/')}>
            申购列表
          </Link>
          <Link to="/create" style={getDesktopNavStyle(location.pathname === '/create')}>
            新建申购
          </Link>
          {isLoggedIn ? (
            <>
              <Link to="/admin" style={getDesktopNavStyle(location.pathname === '/admin')}>
                审批仪表板
              </Link>
              <span style={{ color: '#9ca3af', fontSize: '14px' }}>当前用户：{username}</span>
              <button
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                登出
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              style={{
                background: '#3b82f6',
                border: 'none',
                color: '#ffffff',
                padding: '6px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease-out',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              登录
            </button>
          )}
        </div>
      )}
    </nav>
  );
}

function getNavItemStyle(isActive: boolean) {
  return {
    background: 'none',
    border: 'none',
    color: isActive ? '#3b82f6' : '#ffffff',
    padding: '12px 16px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease-out',
  };
}

function getDesktopNavStyle(isActive: boolean) {
  return {
    color: isActive ? '#3b82f6' : '#ffffff',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'color 0.2s ease-out',
  };
}
