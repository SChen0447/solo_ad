import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PawPrint, Menu, X, Shield } from 'lucide-react'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const links = [
    { path: '/', label: '首页' },
    { path: '/admin', label: '管理后台', icon: Shield },
  ]

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <PawPrint size={28} color="#F5A623" />
          <span>温暖之家</span>
        </Link>

        <div className={`${styles.links} ${menuOpen ? styles.linksOpen : ''}`}>
          {links.map((link, idx) => {
            const Icon = link.icon
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`${styles.link} ${isActive ? styles.linkActive : ''}`}
                style={{ animationDelay: menuOpen ? `${idx * 0.05}s` : undefined }}
              >
                {Icon && <Icon size={18} />}
                {link.label}
              </Link>
            )
          })}
        </div>

        <button
          className={styles.burger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="切换菜单"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  )
}
