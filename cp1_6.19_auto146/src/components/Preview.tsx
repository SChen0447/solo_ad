import { useEffect, useRef, useState, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { v4 as uuidv4 } from 'uuid'
import type { ViewMode } from '../App'
import './Preview.css'

interface PreviewProps {
  htmlCode: string
  cssCode: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

const VIEW_SIZES: Record<ViewMode, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
}

function Preview({ htmlCode, cssCode, viewMode, onViewModeChange }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showViewDropdown, setShowViewDropdown] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const [isScaling, setIsScaling] = useState(false)
  const iframeKeyRef = useRef(uuidv4())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { width: viewWidth, height: viewHeight } = VIEW_SIZES[viewMode]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowViewDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const iframeDocument = iframe.contentDocument
    if (!iframeDocument) return

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${cssCode}</style>
</head>
<body>
  ${htmlCode}
</body>
</html>`

    iframeDocument.open()
    iframeDocument.write(htmlContent)
    iframeDocument.close()
  }, [htmlCode, cssCode, iframeKeyRef.current])

  const handleScreenshot = useCallback(async () => {
    try {
      setIsFlashing(true)
      setTimeout(() => setIsFlashing(false), 150)

      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'fixed'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.width = `${viewWidth}px`
      tempContainer.style.height = `${viewHeight}px`
      tempContainer.style.backgroundColor = '#ffffff'
      tempContainer.innerHTML = `
        <style>${cssCode}</style>
        ${htmlCode}
      `
      document.body.appendChild(tempContainer)

      await new Promise(resolve => requestAnimationFrame(resolve))

      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: viewWidth,
        height: viewHeight
      })

      document.body.removeChild(tempContainer)

      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const filename = `snapshot-${year}${month}${day}-${hours}${minutes}${seconds}.png`

      const link = document.createElement('a')
      link.download = filename
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('Screenshot failed:', error)
    }
  }, [htmlCode, cssCode, viewWidth, viewHeight])

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setIsScaling(true)
    onViewModeChange(mode)
    setShowViewDropdown(false)
    setTimeout(() => setIsScaling(false), 400)
  }, [onViewModeChange])

  const getScale = () => {
    const container = containerRef.current
    if (!container) return 1

    const { width: viewWidth, height: viewHeight } = VIEW_SIZES[viewMode]
    const containerWidth = container.clientWidth - 40
    const containerHeight = container.clientHeight - 80

    const scaleX = containerWidth / viewWidth
    const scaleY = containerHeight / viewHeight

    return Math.min(scaleX, scaleY, 1)
  }

  const scale = getScale()

  const viewModeLabels: Record<ViewMode, string> = {
    desktop: '桌面',
    tablet: '平板',
    mobile: '手机'
  }

  return (
    <div className={`preview-container ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="preview-toolbar">
        <div className="toolbar-left">
          <span className="preview-label">预览</span>
        </div>
        <div className="toolbar-right">
          <div className="view-selector" ref={dropdownRef}>
            <button
              className="toolbar-btn view-mode-btn"
              onClick={() => setShowViewDropdown(!showViewDropdown)}
              title="切换视图"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span className="view-mode-label">{viewModeLabels[viewMode]}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showViewDropdown && (
              <div className="dropdown-menu">
                {(['desktop', 'tablet', 'mobile'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`dropdown-item ${viewMode === mode ? 'active' : ''}`}
                    onClick={() => handleViewModeChange(mode)}
                  >
                    {viewModeLabels[mode]}
                    <span className="view-size">
                      {VIEW_SIZES[mode].width} × {VIEW_SIZES[mode].height}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="toolbar-btn"
            onClick={handleScreenshot}
            title="截图保存"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>

          <button
            className="toolbar-btn"
            onClick={handleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏显示'}
          >
            {isFullscreen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        className={`preview-content ${isFlashing ? 'flashing' : ''}`}
        ref={containerRef}
      >
        <div
          className={`iframe-wrapper ${isScaling ? 'scaling' : ''}`}
          style={{
            width: viewWidth,
            height: viewHeight,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            key={iframeKeyRef.current}
            ref={iframeRef}
            className="preview-iframe"
            title="Preview"
            sandbox="allow-scripts allow-modals"
          />
        </div>
      </div>
    </div>
  )
}

export default Preview
