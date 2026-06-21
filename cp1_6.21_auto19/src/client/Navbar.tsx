import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './Navbar.css';

interface NavbarProps {
  onNavigate?: (path: string) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    if (onNavigate) onNavigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🍳</span>
          <span className="logo-text">美食分享</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">
            首页
          </Link>
          {user ? (
            <>
              <Link to="/create-recipe" className="nav-link nav-link-primary">
                + 发布食谱
              </Link>
              <Link to="/profile" className="nav-link">
                <span className="nav-avatar">{user.username.charAt(0)}</span>
                {user.username}
              </Link>
              <button className="nav-logout" onClick={handleLogout}>
                退出
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-link nav-link-primary">
              登录/注册
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
