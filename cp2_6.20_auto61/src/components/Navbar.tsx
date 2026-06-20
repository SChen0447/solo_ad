import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Palette, User, Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <Palette size={24} />
          <span>手工艺工坊</span>
        </Link>
        
        <div className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          >
            课程列表
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={18} />
              个人中心
            </span>
          </NavLink>
        </div>
        
        <button className="hamburger" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          onClick={closeMenu}
        >
          课程列表
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          onClick={closeMenu}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={18} />
            个人中心
          </span>
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
