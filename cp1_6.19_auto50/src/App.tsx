import React, { useState, useEffect } from 'react'
import { MapCanvas } from './modules/map/MapCanvas'
import { StoryEditor } from './modules/story/StoryEditor'
import { PreviewPlayer } from './modules/preview/PreviewPlayer'

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < 900)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile])

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <span className="app-icon">🗺️</span>
          <span>故事地图规划器</span>
        </div>
        <div className="app-subtitle">交互式故事流程设计工具</div>
      </header>

      <div className="app-main">
        <MapCanvas />

        {isMobile && !sidebarOpen && (
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            title="打开编辑面板"
          >
            ☰
          </button>
        )}

        {sidebarOpen && <StoryEditor />}

        {isMobile && sidebarOpen && (
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            title="关闭编辑面板"
          >
            ✕
          </button>
        )}
      </div>

      <PreviewPlayer />
    </div>
  )
}

export default App
