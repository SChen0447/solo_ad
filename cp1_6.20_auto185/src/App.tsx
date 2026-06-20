import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import UploadModule from './components/UploadModule'
import GalleryPage from './pages/GalleryPage'
import RecordPage from './pages/RecordPage'
import ProfilePage from './pages/ProfilePage'

const navItems = [
  { to: '/', label: '上传识别', icon: 'fa-cloud-upload-alt' },
  { to: '/gallery', label: '灵感画廊', icon: 'fa-palette' },
  { to: '/profile', label: '个人主页', icon: 'fa-user' },
]

const Layout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const checkWidth = () => setIsMobile(window.innerWidth < 768)
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF8F0' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 20px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i
              className="fas fa-recycle"
              style={{ fontSize: 24, color: '#D4A373' }}
            />
            <h1 style={{ fontSize: 20, fontFamily: "'Playfair Display', serif" }}>
              社区旧物改造创意工坊
            </h1>
          </div>

          {!isMobile && (
            <nav style={{ display: 'flex', gap: 8 }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  style={({ isActive }) => ({
                    padding: '8px 20px',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    backgroundColor: isActive ? '#D4A373' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#5D4E37',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                  })}
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: 14 }} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          {isMobile && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: '#FFF8F0',
                color: '#4A3728',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {isMobile && menuOpen && (
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                position: 'fixed',
                top: 64,
                left: 0,
                bottom: 0,
                width: 240,
                backgroundColor: '#FFFFFF',
                boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                padding: 16,
                gap: 4,
              }}
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  style={({ isActive }) => ({
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: isActive ? 600 : 400,
                    backgroundColor: isActive ? '#FFF8F0' : 'transparent',
                    color: isActive ? '#D4A373' : '#5D4E37',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  })}
                >
                  <i className={`fas ${item.icon}`} style={{ fontSize: 16, width: 20 }} />
                  {item.label}
                </NavLink>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '40px 20px',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '24px 20px',
          color: '#999999',
          fontSize: 12,
          borderTop: '1px solid #F0E6D8',
        }}
      >
        © 2024 社区旧物改造创意工坊 · 让旧物焕发新生
      </footer>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<UploadModule />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="record/:id" element={<RecordPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  )
}

export default App
