import React, { useState } from 'react';

export type PageRoute = 'list' | 'form' | 'dashboard';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  currentUser: string | null;
  onLogin: () => void;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (page: PageRoute) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span className="navbar-title">办公用品申购系统</span>
        <div className="navbar-links">
          <button
            className={`navbar-link ${currentPage === 'list' ? 'active' : ''}`}
            onClick={() => handleNavigate('list')}
          >
            申购列表
          </button>
          <button
            className={`navbar-link ${currentPage === 'form' ? 'active' : ''}`}
            onClick={() => handleNavigate('form')}
          >
            新建申购
          </button>
          <button
            className={`navbar-link ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
          >
            审批仪表板
          </button>
        </div>
      </div>
      <div className="navbar-right">
        {currentUser ? (
          <>
            <span className="navbar-username">{currentUser}</span>
            <button className="navbar-btn" onClick={onLogout}>
              登出
            </button>
          </>
        ) : (
          <button className="navbar-btn" onClick={onLogin}>
            管理员登录
          </button>
        )}
      </div>
      <button
        className="hamburger-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        ☰
      </button>
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <button
          className={`navbar-link ${currentPage === 'list' ? 'active' : ''}`}
          onClick={() => handleNavigate('list')}
        >
          申购列表
        </button>
        <button
          className={`navbar-link ${currentPage === 'form' ? 'active' : ''}`}
          onClick={() => handleNavigate('form')}
        >
          新建申购
        </button>
        <button
          className={`navbar-link ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavigate('dashboard')}
        >
          审批仪表板
        </button>
        {currentUser ? (
          <>
            <span className="navbar-username" style={{ padding: '10px 12px' }}>
              {currentUser}
            </span>
            <button
              className="navbar-btn"
              style={{ margin: '4px 0' }}
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
            >
              登出
            </button>
          </>
        ) : (
          <button
            className="navbar-btn"
            style={{ margin: '4px 0' }}
            onClick={() => {
              onLogin();
              setMobileMenuOpen(false);
            }}
          >
            管理员登录
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
