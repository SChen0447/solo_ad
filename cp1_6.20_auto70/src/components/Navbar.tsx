import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface NavbarProps {
  user: string | null;
  onLogout: () => void;
}

function Navbar({ user, onLogout }: NavbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: '仪表盘', icon: '📊' },
    { path: '/market', label: '行情', icon: '📈' },
    { path: '/trade/AAPL', label: '交易', icon: '💼' },
    { path: '/portfolio', label: '持仓', icon: '📋' },
  ];

  const initial = user?.charAt(0).toUpperCase() || 'U';

  return (
    <>
      <div className="sidebar">
        <div style={{ padding: '0 24px 20px' }}>
          <div className="logo">StockSim</div>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="mobile-tabbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="top-nav">
        <div className="logo">StockSim</div>
        <div className="user-menu">
          <div className="user-avatar" onClick={() => setShowDropdown(!showDropdown)}>
            {initial}
          </div>
          {showDropdown && (
            <div className="dropdown-menu">
              <button onClick={handleLogout}>退出登录</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Navbar;
