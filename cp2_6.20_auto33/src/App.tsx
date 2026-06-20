import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import MemberDashboard from './pages/MemberDashboard'
import CoachDashboard from './pages/CoachDashboard'
import AdminDashboard from './pages/AdminDashboard'
import { User, getToken, removeToken } from './services/api'

function AppContent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const token = getToken()
    const savedUser = localStorage.getItem('user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        removeToken()
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = useCallback((userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    const roleRoutes: Record<string, string> = {
      member: '/member',
      coach: '/coach',
      admin: '/admin'
    }
    navigate(roleRoutes[userData.role] || '/login', { replace: true })
  }, [navigate])

  const handleLogout = useCallback(() => {
    setUser(null)
    removeToken()
    localStorage.removeItem('user')
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (loading) return
    if (!user && location.pathname !== '/login') {
      navigate('/login', { replace: true })
    } else if (user) {
      const rolePaths: Record<string, string> = {
        member: '/member',
        coach: '/coach',
        admin: '/admin'
      }
      const currentPath = location.pathname
      if (currentPath === '/' || currentPath === '/login') {
        navigate(rolePaths[user.role], { replace: true })
      }
    }
  }, [user, loading, navigate, location.pathname])

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="app-container page-enter">
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/member/*"
          element={
            user?.role === 'member' ? (
              <MemberDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/coach/*"
          element={
            user?.role === 'coach' ? (
              <CoachDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin/*"
          element={
            user?.role === 'admin' ? (
              <AdminDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return <AppContent />
}
