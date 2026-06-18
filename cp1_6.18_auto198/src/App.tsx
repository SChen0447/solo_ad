import React, { useState, useEffect } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { PreviewArea } from './components/PreviewArea'
import { ProgressModal } from './components/ProgressModal'
import { useProcessingStore } from './store/processingStore'
import './App.css'

const App: React.FC = () => {
  const { isProcessing } = useProcessingStore()
  const [isMobile, setIsMobile] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="app-container">
      <ProgressModal visible={isProcessing} />

      {isMobile && (
        <>
          <div className="mobile-header">
            <button
              className="hamburger-btn"
              onClick={() => setIsPanelOpen(true)}
              aria-label="打开菜单"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
            <span className="mobile-title">批量图片处理器</span>
            <div style={{ width: '32px' }} />
          </div>

          <div
            className={`mobile-panel-overlay ${isPanelOpen ? 'open' : ''}`}
            onClick={() => setIsPanelOpen(false)}
          />

          <div className={`mobile-panel ${isPanelOpen ? 'open' : ''}`}>
            <ControlPanel />
          </div>
        </>
      )}

      {!isMobile && <ControlPanel />}

      <div className="main-content">
        <PreviewArea />
      </div>
    </div>
  )
}

export default App
