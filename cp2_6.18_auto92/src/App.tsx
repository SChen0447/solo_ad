import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import TimeEntry from './components/TimeEntry'
import MemberDetail from './components/MemberDetail'
import './App.css'

function Navbar() {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <span className="logo-icon">📊</span>
          <span className="logo-text">工时绩效仪表板</span>
        </div>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            仪表板
          </Link>
          <Link
            to="/time-entry"
            className={`nav-link ${isActive('/time-entry') ? 'active' : ''}`}
          >
            工时录入
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/time-entry" element={<TimeEntry />} />
            <Route path="/member/:id" element={<MemberDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
