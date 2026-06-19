import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navLinks = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/profile', label: '我的活动', icon: '👤' }
  ]

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setIsMenuOpen(false)}>
          <span>🎉</span>
          <span>聚乐</span>
        </Link>
        
        <div className="navbar-links">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${isActive(link.path) ? 'active' : ''}`}
            >
              <span style={{ marginRight: '6px' }}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
          <Link to="/create" className="btn btn-primary">
            <span>＋</span>
            创建活动
          </Link>
        </div>

        <button
          className="hamburger"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="菜单"
        >
          <span style={{ transform: isMenuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
          <span style={{ opacity: isMenuOpen ? '0' : '1' }} />
          <span style={{ transform: isMenuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
        </button>
      </div>

      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        {navLinks.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`navbar-link ${isActive(link.path) ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(false)}
          >
            <span style={{ marginRight: '6px' }}>{link.icon}</span>
            {link.label}
          </Link>
        ))}
        <Link
          to="/create"
          className="btn btn-primary"
          onClick={() => setIsMenuOpen(false)}
          style={{ marginTop: '8px' }}
        >
          <span>＋</span>
          创建活动
        </Link>
      </div>
    </nav>
  )
}

export default Navbar
