import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const getAvatarColor = (level: number) => {
    return `level-${level}`;
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-icon">❤</div>
            <span>志愿同行</span>
          </Link>

          <ul className="navbar-menu">
            <li className="navbar-menu-item">
              <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                活动列表
              </NavLink>
            </li>
            <li className="navbar-menu-item">
              <NavLink to="/ranking" className={({ isActive }) => isActive ? 'active' : ''}>
                服务排行
              </NavLink>
            </li>
            {user?.isAdmin && (
              <li className="navbar-menu-item">
                <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
                  管理后台
                </NavLink>
              </li>
            )}
          </ul>

          <div className="navbar-right">
            {user ? (
              <div 
                className="navbar-user" 
                onClick={() => navigate('/profile')}
              >
                <div className={`navbar-avatar ${getAvatarColor(user.certificationLevel)}`}>
                  {user.nickname.charAt(0)}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{user.nickname}</span>
              </div>
            ) : (
              <>
                <Link to="/login" className="navbar-btn navbar-btn-secondary">
                  登录
                </Link>
                <Link to="/register" className="navbar-btn navbar-btn-primary">
                  注册
                </Link>
              </>
            )}
          </div>

          <button 
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <button 
          className="mobile-menu-close"
          onClick={() => setMobileMenuOpen(false)}
        >
          ×
        </button>
        <ul className="mobile-menu-list">
          <li>
            <NavLink 
              to="/" 
              end
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              活动列表
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/ranking" 
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              服务排行
            </NavLink>
          </li>
          {user?.isAdmin && (
            <li>
              <NavLink 
                to="/admin" 
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                管理后台
              </NavLink>
            </li>
          )}
          <li style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
            {user ? (
              <>
                <NavLink 
                  to="/profile" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  个人中心
                </NavLink>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLogout();
                  }}
                >
                  退出登录
                </a>
              </>
            ) : (
              <>
                <NavLink 
                  to="/login" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  登录
                </NavLink>
                <NavLink 
                  to="/register" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  注册
                </NavLink>
              </>
            )}
          </li>
        </ul>
      </div>
    </>
  );
}

export default Navbar;
