import { Link, useLocation } from 'react-router-dom';
import { CURRENT_USER } from '../api';

export default function Navbar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">邻里交换</Link>
      <div className="navbar-links">
        <Link to="/" className={isActive('/') && location.pathname === '/' ? 'active' : ''}>
          首页
        </Link>
        <Link to="/qa" className={isActive('/qa') ? 'active' : ''}>
          社区问答
        </Link>
        <Link to={`/profile/${CURRENT_USER.id}`} className={isActive('/profile') ? 'active' : ''}>
          个人中心
        </Link>
      </div>
    </nav>
  );
}
