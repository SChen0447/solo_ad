import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useAppStore } from '../store'
import './SplitView.css'

interface SplitViewProps {
  diffLeftLines?: number[]
  diffRightLines?: number[]
}

const LINE_HEIGHT = 24

function buildDiffBackground(lines: number[], color: string): string {
  if (lines.length === 0) return 'transparent'
  const parts: string[] = []
  lines.forEach((lineNum) => {
    const top = lineNum * LINE_HEIGHT
    parts.push(`${color} ${top}px, ${color} ${top + LINE_HEIGHT}px, transparent ${top + LINE_HEIGHT}px`)
  })
  return `linear-gradient(to bottom, ${parts.join(', ')})`
}

export function SplitView({ diffLeftLines = [], diffRightLines = [] }: SplitViewProps) {
  const leftIframeRef = useRef<HTMLIFrameElement>(null)
  const rightIframeRef = useRef<HTMLIFrameElement>(null)
  const isSyncingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)

  const {
    appliedLeftCode,
    appliedRightCode,
    zoom,
    syncScroll,
    diffEnabled,
    leftPaneWidth,
    setLeftPaneWidth,
  } = useAppStore()

  const leftOverlayBg = useMemo(
    () => buildDiffBackground(diffLeftLines, 'rgba(255, 107, 107, 0.35)'),
    [diffLeftLines]
  )
  const rightOverlayBg = useMemo(
    () => buildDiffBackground(diffRightLines, 'rgba(81, 207, 102, 0.35)'),
    [diffRightLines]
  )

  const handleScrollSync = useCallback((source: 'left' | 'right') => {
    if (!syncScroll || isSyncingRef.current) return
    const leftIframe = leftIframeRef.current
    const rightIframe = rightIframeRef.current
    if (!leftIframe?.contentDocument || !rightIframe?.contentDocument) return

    const leftDoc = leftIframe.contentDocument
    const rightDoc = rightIframe.contentDocument

    if (source === 'left') {
      const leftBody = leftDoc.body
      const scrollTop = leftDoc.documentElement.scrollTop || leftBody.scrollTop
      const scrollHeight = leftDoc.documentElement.scrollHeight || leftBody.scrollHeight
      const clientHeight = leftDoc.documentElement.clientHeight || leftBody.clientHeight
      const scrollRatio = scrollTop / Math.max(scrollHeight - clientHeight, 1)

      const rightBody = rightDoc.body
      const rightScrollHeight = rightDoc.documentElement.scrollHeight || rightBody.scrollHeight
      const rightClientHeight = rightDoc.documentElement.clientHeight || rightBody.clientHeight
      const targetScrollTop = scrollRatio * Math.max(rightScrollHeight - rightClientHeight, 0)

      isSyncingRef.current = true
      rightDoc.documentElement.scrollTop = targetScrollTop
      rightBody.scrollTop = targetScrollTop
    } else {
      const rightBody = rightDoc.body
      const scrollTop = rightDoc.documentElement.scrollTop || rightBody.scrollTop
      const scrollHeight = rightDoc.documentElement.scrollHeight || rightBody.scrollHeight
      const clientHeight = rightDoc.documentElement.clientHeight || rightBody.clientHeight
      const scrollRatio = scrollTop / Math.max(scrollHeight - clientHeight, 1)

      const leftBody = leftDoc.body
      const leftScrollHeight = leftDoc.documentElement.scrollHeight || leftBody.scrollHeight
      const leftClientHeight = leftDoc.documentElement.clientHeight || leftBody.clientHeight
      const targetScrollTop = scrollRatio * Math.max(leftScrollHeight - leftClientHeight, 0)

      isSyncingRef.current = true
      leftDoc.documentElement.scrollTop = targetScrollTop
      leftBody.scrollTop = targetScrollTop
    }

    requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
  }, [syncScroll])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const containerWidth = rect.width
    const mouseX = e.clientX - rect.left
    const newWidthPercent = (mouseX / containerWidth) * 100

    setLeftPaneWidth(newWidthPercent)
  }, [setLeftPaneWidth])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    const leftIframe = leftIframeRef.current
    if (!leftIframe) return

    const handleLeftScroll = () => handleScrollSync('left')
    const handleLoad = () => {
      const doc = leftIframe.contentDocument
      if (!doc) return
      doc.addEventListener('scroll', handleLeftScroll, true)
    }

    leftIframe.addEventListener('load', handleLoad)
    return () => {
      leftIframe.removeEventListener('load', handleLoad)
      const doc = leftIframe.contentDocument
      if (doc) doc.removeEventListener('scroll', handleLeftScroll, true)
    }
  }, [handleScrollSync])

  useEffect(() => {
    const rightIframe = rightIframeRef.current
    if (!rightIframe) return

    const handleRightScroll = () => handleScrollSync('right')
    const handleLoad = () => {
      const doc = rightIframe.contentDocument
      if (!doc) return
      doc.addEventListener('scroll', handleRightScroll, true)
    }

    rightIframe.addEventListener('load', handleLoad)
    return () => {
      rightIframe.removeEventListener('load', handleLoad)
      const doc = rightIframe.contentDocument
      if (doc) doc.removeEventListener('scroll', handleRightScroll, true)
    }
  }, [handleScrollSync])

  const scale = zoom / 100
  const rightPaneWidth = 100 - leftPaneWidth

  return (
    <div className="split-view" ref={containerRef}>
      <div className="split-pane" style={{ width: `${leftPaneWidth}%` }}>
        <div className="pane-label version-a">
          <span>版本 A</span>
        </div>
        <div className="iframe-container">
          <div
            className="iframe-wrapper"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'left top',
              width: `${100 / scale}%`,
              height: `${100 / scale}%`,
            }}
          >
            <iframe
              ref={leftIframeRef}
              srcDoc={appliedLeftCode}
              title="Version A"
              className="preview-iframe"
            />
          </div>
          {diffEnabled && diffLeftLines.length > 0 && (
            <div
              className="diff-overlay"
              style={{ background: leftOverlayBg }}
            />
          )}
        </div>
      </div>

      <div className="divider" onMouseDown={handleMouseDown} />

      <div className="split-pane" style={{ width: `${rightPaneWidth}%` }}>
        <div className="pane-label version-b">
          <span>版本 B</span>
        </div>
        <div className="iframe-container">
          <div
            className="iframe-wrapper"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'left top',
              width: `${100 / scale}%`,
              height: `${100 / scale}%`,
            }}
          >
            <iframe
              ref={rightIframeRef}
              srcDoc={appliedRightCode}
              title="Version B"
              className="preview-iframe"
            />
          </div>
          {diffEnabled && diffRightLines.length > 0 && (
            <div
              className="diff-overlay"
              style={{ background: rightOverlayBg }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
