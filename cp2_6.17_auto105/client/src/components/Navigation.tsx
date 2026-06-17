import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Sparkles } from 'lucide-react';

const Navigation: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/tags', label: '标签管理' },
    { path: '/star-chart', label: '灵感星图' },
  ];

  return (
    <>
      <nav className="nav">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
          <Sparkles style={{ verticalAlign: 'middle', marginRight: '8px' }} size={24} />
            灵感碎片
          </Link>

          <ul className="nav-links">
            {navItems.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link${isActive ? ' active' : ''}`
                  end={item.path === '/'}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <button
            className="hamburger"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="打开菜单"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      <div
        className={`mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
        <button
          className="mobile-menu-close"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="关闭菜单"
        >
          <X size={32} />
        </button>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className="mobile-nav-link"
            onClick={() => setMobileMenuOpen(false)}
            end={item.path === '/'}
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </>
  );
};

export default Navigation;
