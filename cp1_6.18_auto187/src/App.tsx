import React, { useState, useEffect } from 'react'
import { AnnotationToolbar } from './canvas/AnnotationToolbar'
import { CanvasRenderer } from './canvas/CanvasRenderer'
import { TimelineSlider } from './timeline/TimelineSlider'
import { CommentPanel } from './comments/CommentPanel'

export const App: React.FC = () => {
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [commentPanelWidth, setCommentPanelWidth] = useState(320)
  const [isCommentPanelCollapsed, setIsCommentPanelCollapsed] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth)
      if (window.innerWidth < 1024) {
        setIsCommentPanelCollapsed(true)
      } else {
        setIsCommentPanelCollapsed(false)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = viewportWidth < 768
  const isTablet = viewportWidth >= 768 && viewportWidth < 1024

  return (
    <div className={`app ${isMobile ? 'mobile' : ''} ${isTablet ? 'tablet' : ''}`}>
      {isMobile ? (
        <header className="top-toolbar">
          <AnnotationToolbar />
        </header>
      ) : (
        <aside className="left-sidebar">
          <AnnotationToolbar />
        </aside>
      )}

      <main className="main-content">
        <div className="canvas-wrapper">
          <CanvasRenderer />
        </div>

        <footer className="bottom-timeline">
          <TimelineSlider />
        </footer>
      </main>

      <CommentPanel
        isCollapsed={isCommentPanelCollapsed}
        onToggle={() => setIsCommentPanelCollapsed(!isCommentPanelCollapsed)}
        onWidthChange={setCommentPanelWidth}
        width={commentPanelWidth}
      />
    </div>
  )
}
