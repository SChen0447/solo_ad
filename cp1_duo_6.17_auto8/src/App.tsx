import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Search, Star, Loader2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import SearchPage from './pages/SearchPage'
import CollectionPage from './pages/CollectionPage'

interface ToastItem {
  id: number
  message: string
}

function App() {
  const location = useLocation()
  const [bookmarkCount, setBookmarkCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const updateCount = () => {
      const bookmarks = JSON.parse(localStorage.getItem('docrover_bookmarks') || '[]')
      setBookmarkCount(bookmarks.length)
    }
    updateCount()
    window.addEventListener('storage', updateCount)
    window.addEventListener('bookmarkChange', updateCount)
    return () => {
      window.removeEventListener('storage', updateCount)
      window.removeEventListener('bookmarkChange', updateCount)
    }
  }, [])

  const showToast = useCallback((message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 1500)
  }, [])

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string }>
      if (customEvent.detail?.message) {
        showToast(customEvent.detail.message)
      }
    }
    window.addEventListener('toast', handleToast)
    return () => window.removeEventListener('toast', handleToast)
  }, [showToast])

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader2 className="loading-gear" />
      </div>
    )
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/" className="logo">
            <Search className="logo-icon" />
            <span className="logo-text">DocRover</span>
          </Link>

          <div className="nav-links">
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              <Search size={18} />
              <span>搜索</span>
            </Link>
            <Link
              to="/collection"
              className={`nav-link ${location.pathname === '/collection' ? 'active' : ''}`}
            >
              <Star size={18} />
              <span>收藏</span>
              {bookmarkCount > 0 && (
                <span className="bookmark-badge">{bookmarkCount}</span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/collection" element={<CollectionPage />} />
        </Routes>
      </main>

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
