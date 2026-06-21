import { useState, createContext, useContext, useEffect, ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Activity from './pages/Activity'
import Summary from './pages/Summary'
import { Activity as ActivityType, Member } from './types'

interface ActivityContextType {
  currentActivity: ActivityType | null
  setCurrentActivity: (activity: ActivityType | null) => void
  currentMember: Member | null
  setCurrentMember: (member: Member | null) => void
  refreshActivity: (code: string) => Promise<void>
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined)

export const useActivity = () => {
  const context = useContext(ActivityContext)
  if (!context) {
    throw new Error('useActivity must be used within ActivityProvider')
  }
  return context
}

const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const [currentActivity, setCurrentActivity] = useState<ActivityType | null>(null)
  const [currentMember, setCurrentMember] = useState<Member | null>(null)

  const refreshActivity = async (code: string) => {
    try {
      const response = await fetch(`/api/activities/${code}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentActivity(data)
        if (currentMember) {
          const updatedMember = data.members.find((m: Member) => m.id === currentMember.id)
          if (updatedMember) {
            setCurrentMember(updatedMember)
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh activity:', error)
    }
  }

  return (
    <ActivityContext.Provider
      value={{
        currentActivity,
        setCurrentActivity,
        currentMember,
        setCurrentMember,
        refreshActivity
      }}
    >
      {children}
    </ActivityContext.Provider>
  )
}

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <>
      <div className="sidebar">
        <div
          className={`sidebar-icon ${isActive('/') ? 'active' : ''}`}
          onClick={() => navigate('/')}
          title="活动列表"
        >
          🏔️
        </div>
      </div>

      <div className="bottom-tab-bar">
        <div
          className={`tab-item ${isActive('/') ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <div className="tab-icon">🏔️</div>
          <div>活动</div>
        </div>
      </div>
    </>
  )
}

const AppContent = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/activity/:code" element={<Activity />} />
          <Route path="/activity/:code/summary" element={<Summary />} />
        </Routes>
      </div>
    </div>
  )
}

const App = () => {
  return (
    <Router>
      <ActivityProvider>
        <AppContent />
      </ActivityProvider>
    </Router>
  )
}

export default App
