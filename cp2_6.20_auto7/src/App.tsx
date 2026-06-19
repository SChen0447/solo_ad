import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { CreatePoll } from './pages/CreatePoll'
import { PollDetail } from './pages/PollDetail'
import { NotificationProvider } from './components/Notification'

function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            在线投票系统
          </h1>
        </Link>
        <nav className="header-actions">
          <Link
            to="/"
            className="btn"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
          >
            投票列表
          </Link>
          <Link
            to="/create"
            className="btn"
            style={{ background: 'white', color: 'var(--primary)' }}
          >
            创建投票
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <div className="app">
          <AppHeader />
          <main className="container">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create" element={<CreatePoll />} />
              <Route path="/poll/:id" element={<PollDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </NotificationProvider>
    </BrowserRouter>
  )
}
