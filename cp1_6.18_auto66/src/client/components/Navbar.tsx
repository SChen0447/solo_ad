import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const { isAuthenticated, user, logout } = useAuth();
  const { debouncedSearch, searchKeyword } = useProducts();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.pathname === '/') {
      setSearchInput(searchKeyword);
    }
  }, [location.pathname, searchKeyword]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        debouncedSearch(value);
      }, 100);
    } else {
      debouncedSearch(value);
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <span className="logo-icon">🎮</span>
          <span className="logo-text">虚拟市集</span>
        </Link>

        <div className="navbar-search">
          <input
            type="text"
            placeholder="搜索电子书、课程码、软件激活码..."
            value={searchInput}
            onChange={handleSearchChange}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="navbar-menu">
          {isAuthenticated ? (
            <div className="user-menu-container" ref={userMenuRef}>
              <button
                className="user-avatar-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <img src={user?.avatar} alt={user?.username} className="user-avatar" />
                <span className="user-name">{user?.username}</span>
                <span className={`dropdown-arrow ${userMenuOpen ? 'open' : ''}`}>▼</span>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown-menu">
                  <Link to="/orders" onClick={() => setUserMenuOpen(false)}>
                    <span>📦</span> 我的订单
                  </Link>
                  <Link to="/my-listings" onClick={() => setUserMenuOpen(false)}>
                    <span>📝</span> 我的发布
                  </Link>
                  <Link to="/publish" onClick={() => setUserMenuOpen(false)}>
                    <span>➕</span> 发布商品
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="logout-btn">
                    <span>🚪</span> 退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-outline">登录</Link>
              <Link to="/register" className="btn btn-primary">注册</Link>
            </div>
          )}

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-search">
            <input
              type="text"
              placeholder="搜索商品..."
              value={searchInput}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>

          {isAuthenticated ? (
            <>
              <div className="mobile-user-info">
                <img src={user?.avatar} alt={user?.username} className="mobile-avatar" />
                <span>{user?.username}</span>
              </div>
              <Link to="/orders" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                📦 我的订单
              </Link>
              <Link to="/my-listings" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                📝 我的发布
              </Link>
              <Link to="/publish" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                ➕ 发布商品
              </Link>
              <button onClick={handleLogout} className="mobile-menu-item mobile-logout">
                🚪 退出登录
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                登录
              </Link>
              <Link to="/register" className="mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                注册
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};
