import React, { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  useEffect(() => {
    closeMenu()
  }, [location.pathname])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.hamburger-btn')
      ) {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const navLinkBaseClass = 'nav-link'
  const mobileLinkBaseClass = 'mobile-menu-item'

  return (
    <>
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand" style={{ minHeight: 44, minWidth: 44 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2l2.39 4.84L20 7.27l-4 3.9.94 5.5L12 14.77 7.06 16.67 8 11.17l-4-3.9 5.61-.43L12 2z"
              fill="#F5A623"
            />
          </svg>
          <span>动物领养平台</span>
        </NavLink>

        <div className="navbar-menu">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${navLinkBaseClass} ${isActive ? 'active' : ''}`}
          >
            首页
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => `${navLinkBaseClass} ${isActive ? 'active' : ''}`}
          >
            管理后台
          </NavLink>
        </div>

        <button
          className="hamburger-btn"
          onClick={toggleMenu}
          aria-label={isOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={isOpen}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#333"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
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
        <div className="mobile-menu" ref={mobileMenuRef} role="menu">
          <NavLink
            to="/"
            end
            role="menuitem"
            className={({ isActive }) =>
              `${mobileLinkBaseClass} ${isActive ? 'active' : ''}`
            }
            onClick={closeMenu}
            style={({ isActive }) => ({
              color: isActive ? '#F5A623' : '#333',
              background: isActive ? 'rgba(245, 166, 35, 0.08)' : 'transparent'
            })}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 12 }}
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            首页
          </NavLink>
          <NavLink
            to="/admin"
            role="menuitem"
            className={({ isActive }) =>
              `${mobileLinkBaseClass} ${isActive ? 'active' : ''}`
            }
            onClick={closeMenu}
            style={({ isActive }) => ({
              color: isActive ? '#F5A623' : '#333',
              background: isActive ? 'rgba(245, 166, 35, 0.08)' : 'transparent'
            })}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 12 }}
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            管理后台
          </NavLink>
        </div>
      )}
    </>
  )
}
