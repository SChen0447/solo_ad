import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Navbar.css';

interface NavItem {
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { label: '看板', path: '/' },
  { label: '礼物', path: '/gifts' },
  { label: '交换', path: '/exchange' },
];

const Navbar: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const activeTab = document.querySelector('.nav-tab.active');
    if (activeTab) {
      const rect = activeTab.getBoundingClientRect();
      const parentRect = activeTab.parentElement?.getBoundingClientRect();
      if (parentRect) {
        setIndicatorStyle({
          left: rect.left - parentRect.left,
          width: rect.width,
        });
      }
    }
  }, [location.pathname]);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <span className="logo-icon">🎁</span>
          <span className="logo-text">漂流礼物</span>
        </div>

        <div className="nav-tabs">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-tab ${isActive ? 'active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div
            className="nav-indicator"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        </div>

        <button
          className="hamburger-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-menu">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `mobile-nav-item ${isActive ? 'active' : ''}`
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
