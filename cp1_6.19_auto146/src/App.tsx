import { useState, useRef, useCallback, useEffect } from 'react'
import Editor from './components/Editor'
import Preview from './components/Preview'
import './App.css'

export type ViewMode = 'desktop' | 'tablet' | 'mobile'

const DEFAULT_HTML = `<button class="primary-btn">
  Click Me
</button>`

const DEFAULT_CSS = `.primary-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.primary-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.primary-btn:active {
  transform: translateY(0);
}

body {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
  background: #f0f0f0;
  font-family: system-ui, -apple-system, sans-serif;
}`

function App() {
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML)
  const [cssCode, setCssCode] = useState(DEFAULT_CSS)
  const [leftWidth, setLeftWidth] = useState(60)
  const [isDragging, setIsDragging] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<{ getHtmlCode: () => string; getCssCode: () => string } | null>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || isMobile) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100
      const clampedWidth = Math.min(Math.max(newWidth, 20), 80)
      setLeftWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isMobile])

  const handleCodeChange = useCallback((type: 'html' | 'css', code: string) => {
    if (type === 'html') {
      setHtmlCode(code)
    } else {
      setCssCode(code)
    }
  }, [])

  return (
    <div className={`app-container ${isDragging ? 'dragging' : ''}`} ref={containerRef}>
      <div
        className="editor-section"
        style={{ flex: isMobile ? '0 0 100%' : `0 0 ${leftWidth}%` }}
      >
        <Editor
          ref={editorRef}
          initialHtml={DEFAULT_HTML}
          initialCss={DEFAULT_CSS}
          onCodeChange={handleCodeChange}
        />
      </div>

      {!isMobile && (
        <div
          className="divider"
          onMouseDown={handleMouseDown}
        />
      )}

      <div
        className="preview-section"
        style={{ flex: isMobile ? '0 0 100%' : `0 0 ${100 - leftWidth}%` }}
      >
        <Preview
          htmlCode={htmlCode}
          cssCode={cssCode}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    </div>
  )
}

export default App
