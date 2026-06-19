import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2l2.39 4.84L20 7.27l-4 3.9.94 5.5L12 14.77 7.06 16.67 8 11.17l-4-3.9 5.61-.43L12 2z"
              fill="#F5A623"
            />
          </svg>
          动物领养平台
        </div>

        <div className="navbar-menu">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            首页
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            管理后台
          </NavLink>
        </div>

        <button className="hamburger-btn" onClick={toggleMenu} aria-label="菜单">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            {isOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {isOpen && (
        <div className="mobile-menu">
          <NavLink
            to="/"
            end
            className={`mobile-menu-item ${isActive('/') ? 'active' : ''}`}
            onClick={closeMenu}
            style={{ color: isActive('/') ? '#F5A623' : '#333' }}
          >
            首页
          </NavLink>
          <NavLink
            to="/admin"
            className={`mobile-menu-item ${isActive('/admin') ? 'active' : ''}`}
            onClick={closeMenu}
            style={{ color: isActive('/admin') ? '#F5A623' : '#333' }}
          >
            管理后台
          </NavLink>
        </div>
      )}
    </>
  )
}
