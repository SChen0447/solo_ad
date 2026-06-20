import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import RecorderPanel from './RecorderPanel'
import WallCanvas from './WallCanvas'
import AnalysisPanel from './AnalysisPanel'
import type { MoodType } from './types'

interface ViewOption {
  id: string
  label: string
  icon: string
}

const views: ViewOption[] = [
  { id: 'wall', label: '情绪墙', icon: '🖼️' },
  { id: 'record', label: '记录情绪', icon: '✏️' },
]

const moodFilters: { type: MoodType | 'all'; label: string }[] = [
  { type: 'all', label: '全部' },
  { type: 'happy', label: '开心' },
  { type: 'calm', label: '平静' },
  { type: 'anxious', label: '焦虑' },
  { type: 'sad', label: '忧伤' },
  { type: 'angry', label: '愤怒' },
  { type: 'tired', label: '疲惫' },
]

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [moodFilter, setMoodFilter] = useState<MoodType | 'all'>('all')
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const activeView = location.pathname.includes('/record') ? 'record' : 'wall'

  const handleNavClick = (viewId: string) => {
    if (viewId === 'record') {
      navigate('/record')
    } else {
      navigate('/')
    }
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-left">
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            <span style={{ fontSize: '20px' }}>{sidebarCollapsed ? '☰' : '✕'}</span>
          </button>
          <h1 className="navbar-title">灵感拼贴墙</h1>
        </div>
        <div className="navbar-right">
          <button
            className="sidebar-toggle"
            onClick={() => setAnalysisOpen(!analysisOpen)}
            style={{ display: activeView === 'wall' ? 'flex' : 'none' }}
          >
            <span style={{ fontSize: '18px' }}>📊</span>
          </button>
        </div>
      </nav>

      <div className="main-content">
        <AnimatePresence mode="wait">
          <motion.aside
            key={sidebarCollapsed ? 'collapsed' : 'expanded'}
            className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
            initial={false}
            animate={{ width: sidebarCollapsed ? 60 : 240 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="sidebar-nav">
              {views.map(view => (
                <div
                  key={view.id}
                  className={`sidebar-item ${activeView === view.id ? 'active' : ''}`}
                  onClick={() => handleNavClick(view.id)}
                >
                  <span className="sidebar-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {view.icon}
                  </span>
                  <span className="sidebar-label">{view.label}</span>
                </div>
              ))}

              {activeView === 'wall' && (
                <>
                  <div style={{ height: 12 }} />
                  <div style={{ padding: '0 12px', fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }} className="sidebar-label">
                    情绪筛选
                  </div>
                  {moodFilters.map(filter => (
                    <div
                      key={filter.type}
                      className={`sidebar-item ${moodFilter === filter.type ? 'active' : ''}`}
                      onClick={() => setMoodFilter(filter.type)}
                    >
                      <span className="sidebar-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                        ●
                      </span>
                      <span className="sidebar-label">{filter.label}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.aside>
        </AnimatePresence>

        <div className="content-area">
          <Routes>
            <Route path="/" element={<WallView moodFilter={moodFilter} analysisOpen={analysisOpen} />} />
            <Route path="/record" element={<RecordView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

function WallView({ moodFilter, analysisOpen }: { moodFilter: MoodType | 'all'; analysisOpen: boolean }) {
  return (
    <div className="wall-page">
      <div className="wall-area">
        <WallCanvas moodFilter={moodFilter} />
      </div>
      <div className={`analysis-panel ${analysisOpen ? 'open' : ''}`}>
        <h3 className="analysis-title">情绪分析</h3>
        <AnalysisPanel />
      </div>
    </div>
  )
}

function RecordView() {
  return (
    <div className="recorder-page">
      <RecorderPanel />
    </div>
  )
}

export default App
