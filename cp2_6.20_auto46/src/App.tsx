import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, MessageCircle, User } from 'lucide-react'
import HomePage from '@/pages/Home'
import ItemDetail from '@/pages/ItemDetail'
import QA from '@/pages/QA'
import Ask from '@/pages/Ask'
import Profile from '@/pages/Profile'
import { useState } from 'react'

export const CURRENT_USER_ID = 'u1'
export const CURRENT_USER_NAME = '邻居小明'

function NavBar() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname.startsWith(path)
  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">🏡</span>
          <span>闲邻</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${isActive('/item') || location.pathname === '/' ? 'active' : ''}`}>
            <Home size={18} />
            <span>物品交换</span>
          </Link>
          <Link to="/qa" className={`nav-link ${isActive('/qa') || isActive('/ask') ? 'active' : ''}`}>
            <MessageCircle size={18} />
            <span>社区问答</span>
          </Link>
          <Link to={`/profile/${CURRENT_USER_ID}`} className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
            <User size={18} />
            <span>个人中心</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname.split('/')[1] || 'home'}>
        <Route path="/" element={<HomePage />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route path="/qa" element={<QA />} />
        <Route path="/ask" element={<Ask />} />
        <Route path="/profile/:userId" element={<Profile />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const [ready, setReady] = useState(true)
  return (
    <Router>
      <div className="app-shell">
        <NavBar />
        <motion.main
          className="app-main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {ready && <AnimatedRoutes />}
        </motion.main>
      </div>
    </Router>
  )
}
