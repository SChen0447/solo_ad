import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        匠心市集
      </Link>
      <ul className="navbar-links">
        <li>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            首页
          </Link>
        </li>
        <li>
          <Link to="/orders" className={location.pathname === '/orders' ? 'active' : ''}>
            我的订单
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
