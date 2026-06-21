import { Routes, Route, useLocation } from 'react-router-dom'
import CreateRoom from './pages/CreateRoom'
import AddSongs from './pages/AddSongs'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'
import { useEffect } from 'react'

function App() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/room/:code" element={<AddSongs />} />
        <Route path="/room/:code/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default App
