import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Home, Package, User, MessageSquare } from 'lucide-react'
import { ItemList } from './pages/ItemList'
import { Profile } from './pages/Profile'
import { Messages } from './pages/Messages'

function Navigation() {
  const location = useLocation()
  const [activeNav, setActiveNav] = useState('/')

  const navItems = [
    { path: '/', icon: Home, label: '首页' },
    { path: '/items', icon: Package, label: '物品' },
    { path: '/messages', icon: MessageSquare, label: '消息' },
    { path: '/profile', icon: User, label: '我的' },
  ]

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <nav className="desktop-nav" style={desktopNavStyle}>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setActiveNav(item.path)}
              style={{
                ...navItemStyle,
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <Icon size={24} color={active ? '#ff7e67' : '#fff'} />
            </Link>
          )
        })}
      </nav>

      <nav className="mobile-nav" style={mobileNavStyle}>
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setActiveNav(item.path)}
              style={mobileNavItemStyle}
            >
              <Icon size={22} color={active ? '#ff7e67' : '#999'} />
              <span
                style={{
                  fontSize: '11px',
                  marginTop: '2px',
                  color: active ? '#ff7e67' : '#999',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <style>{`
        @media (min-width: 769px) {
          .mobile-nav {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding-bottom: 80px !important;
          }
        }
      `}</style>
    </>
  )
}

const desktopNavStyle: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  top: 0,
  width: '60px',
  height: '100vh',
  background: '#2d3436',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '20px 0',
  gap: '8px',
  zIndex: 100,
}

const navItemStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '12px',
  transition: 'background 0.2s ease',
}

const mobileNavStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: '64px',
  background: '#ffffff',
  borderRadius: '20px 20px 0 0',
  boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'center',
  zIndex: 100,
}

const mobileNavItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  flex: 1,
  height: '100%',
  transition: 'all 0.2s ease',
}

function MainContent() {
  return (
    <div className="main-content" style={{ marginLeft: '60px', minHeight: '100vh', background: '#faf8f5' }}>
      <Routes>
        <Route path="/" element={<ItemList />} />
        <Route path="/items" element={<ItemList />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/messages" element={<Messages />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
        <Navigation />
        <MainContent />
      </div>
    </BrowserRouter>
  )
}
