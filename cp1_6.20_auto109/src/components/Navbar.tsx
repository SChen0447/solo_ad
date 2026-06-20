import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-logo">
          摄影比赛
        </Link>

        <div className="navbar-menu">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `navbar-menu-item ${isActive ? 'active' : ''}`
            }
          >
            首页
          </NavLink>
          <NavLink
            to="/rankings"
            className={({ isActive }) =>
              `navbar-menu-item ${isActive ? 'active' : ''}`
            }
          >
            排行榜
          </NavLink>
          {user && (
            <NavLink
              to="/upload"
              className={({ isActive }) =>
                `navbar-menu-item ${isActive ? 'active' : ''}`
              }
            >
              上传作品
            </NavLink>
          )}
          {user?.is_judge && (
            <NavLink
              to="/judge"
              className={({ isActive }) =>
                `navbar-menu-item ${isActive ? 'active' : ''}`
              }
            >
              评委打分
            </NavLink>
          )}
        </div>

        <div className="navbar-user">
          {user ? (
            <>
              <span>
                欢迎，{user.username}
                {user.is_judge && ' (评委)'}
              </span>
              <button className="btn btn-secondary" onClick={handleLogout}>
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">
                登录
              </Link>
              <Link to="/register" className="btn btn-primary">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
