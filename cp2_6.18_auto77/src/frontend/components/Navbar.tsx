import { useState } from 'react';

interface NavbarProps {
  currentUser: string | null;
  isAdmin: boolean;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogin: (username: string) => void;
  onLogout: () => void;
}

export default function Navbar({
  currentUser,
  isAdmin,
  currentPage,
  onNavigate,
  onLogin,
  onLogout,
}: NavbarProps) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === 'admin' && loginPassword === 'admin123') {
      onLogin('admin');
      setShowLoginModal(false);
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
    } else if (loginUsername && loginPassword) {
      onLogin(loginUsername);
      setShowLoginModal(false);
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
    } else {
      setLoginError('请输入用户名和密码');
    }
  };

  const handleLogoutClick = () => {
    onLogout();
    setShowMobileMenu(false);
  };

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setShowMobileMenu(false);
  };

  return (
    <>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="navbar-title">办公用品申购系统</span>
          <div className="nav-links">
            <button
              className={`nav-link ${currentPage === 'list' ? 'active' : ''}`}
              onClick={() => handleNavigate('list')}
            >
              申购列表
            </button>
            <button
              className={`nav-link ${currentPage === 'form' ? 'active' : ''}`}
              onClick={() => handleNavigate('form')}
            >
              新建申购
            </button>
            {isAdmin && (
              <button
                className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavigate('dashboard')}
              >
                审批仪表板
              </button>
            )}
          </div>
        </div>

        <div className="navbar-right">
          {currentUser ? (
            <>
              <span className="navbar-user">
                {currentUser}
                {isAdmin && <span style={{ opacity: 0.7 }}>（管理员）</span>}
              </span>
              <button className="btn btn-outline" onClick={handleLogoutClick}>
                登出
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowLoginModal(true)}>
              登录
            </button>
          )}
        </div>

        <button
          className="btn-ghost"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          aria-label="菜单"
        >
          {showMobileMenu ? '✕' : '☰'}
        </button>
      </nav>

      <div className={`mobile-menu ${showMobileMenu ? 'open' : ''}`}>
        <button className="mobile-menu-item" onClick={() => handleNavigate('list')}>
          申购列表
        </button>
        <button className="mobile-menu-item" onClick={() => handleNavigate('form')}>
          新建申购
        </button>
        {isAdmin && (
          <button className="mobile-menu-item" onClick={() => handleNavigate('dashboard')}>
            审批仪表板
          </button>
        )}
        {currentUser ? (
          <button className="mobile-menu-item" onClick={handleLogoutClick}>
            登出（{currentUser}）
          </button>
        ) : (
          <button
            className="mobile-menu-item"
            onClick={() => {
              setShowLoginModal(true);
              setShowMobileMenu(false);
            }}
          >
            登录
          </button>
        )}
      </div>

      {showLoginModal && (
        <div className="login-modal-backdrop" onClick={() => setShowLoginModal(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="login-title">用户登录</h2>
            {loginError && <div className="login-error">{loginError}</div>}
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">用户名</label>
                <input
                  className="form-input"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="请输入用户名（管理员: admin）"
                />
              </div>
              <div className="form-group">
                <label className="form-label">密码</label>
                <input
                  className="form-input"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="请输入密码（管理员: admin123）"
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ color: '#374151', borderColor: '#d1d5db' }}
                  onClick={() => setShowLoginModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  登录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
