import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '../store'
import './SplitView.css'

interface SplitViewProps {
  diffLeftLines?: number[]
  diffRightLines?: number[]
}

export function SplitView({ diffLeftLines = [], diffRightLines = [] }: SplitViewProps) {
  const leftIframeRef = useRef<HTMLIFrameElement>(null)
  const rightIframeRef = useRef<HTMLIFrameElement>(null)
  const leftScrollRef = useRef(0)
  const rightScrollRef = useRef(0)
  const isSyncingRef = useRef(false)

  const { appliedLeftCode, appliedRightCode, zoom, syncScroll, diffEnabled } = useAppStore()

  const injectDiffHighlight = useCallback((doc: Document, lines: number[], isLeft: boolean) => {
    if (!diffEnabled || lines.length === 0) return

    const styleId = 'diff-highlight-style'
    let style = doc.getElementById(styleId) as HTMLStyleElement
    if (!style) {
      style = doc.createElement('style')
      style.id = styleId
      doc.head.appendChild(style)
    }

    const color = isLeft ? '#ffcccc' : '#ccffcc'
    style.textContent = `
      body {
        background: linear-gradient(to bottom,
          ${lines.map((_, i) => `
            ${color} ${i * 24}px,
            ${color} ${(i + 1) * 24}px,
            transparent ${(i + 1) * 24}px,
            transparent ${(i + 1) * 24 + 24}px
          `).join(',')}
        );
        background-attachment: local;
      }
    `
  }, [diffEnabled])

  const handleLeftScroll = useCallback(() => {
    if (!syncScroll || isSyncingRef.current) return
    const leftIframe = leftIframeRef.current
    const rightIframe = rightIframeRef.current
    if (!leftIframe?.contentDocument || !rightIframe?.contentDocument) return

    const leftDoc = leftIframe.contentDocument
    const rightDoc = rightIframe.contentDocument
    const leftBody = leftDoc.body
    const rightBody = rightDoc.body

    const scrollTop = leftDoc.documentElement.scrollTop || leftBody.scrollTop
    const scrollHeight = leftDoc.documentElement.scrollHeight || leftBody.scrollHeight
    const clientHeight = leftDoc.documentElement.clientHeight || leftBody.clientHeight
    const scrollRatio = scrollTop / (scrollHeight - clientHeight || 1)

    const rightScrollHeight = rightDoc.documentElement.scrollHeight || rightBody.scrollHeight
    const rightClientHeight = rightDoc.documentElement.clientHeight || rightBody.clientHeight
    const targetScrollTop = scrollRatio * (rightScrollHeight - rightClientHeight)

    isSyncingRef.current = true
    rightDoc.documentElement.scrollTop = targetScrollTop
    rightBody.scrollTop = targetScrollTop
    rightScrollRef.current = targetScrollTop

    requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
  }, [syncScroll])

  const handleRightScroll = useCallback(() => {
    if (!syncScroll || isSyncingRef.current) return
    const leftIframe = leftIframeRef.current
    const rightIframe = rightIframeRef.current
    if (!leftIframe?.contentDocument || !rightIframe?.contentDocument) return

    const leftDoc = leftIframe.contentDocument
    const rightDoc = rightIframe.contentDocument
    const leftBody = leftDoc.body
    const rightBody = rightDoc.body

    const scrollTop = rightDoc.documentElement.scrollTop || rightBody.scrollTop
    const scrollHeight = rightDoc.documentElement.scrollHeight || rightBody.scrollHeight
    const clientHeight = rightDoc.documentElement.clientHeight || rightBody.clientHeight
    const scrollRatio = scrollTop / (scrollHeight - clientHeight || 1)

    const leftScrollHeight = leftDoc.documentElement.scrollHeight || leftBody.scrollHeight
    const leftClientHeight = leftDoc.documentElement.clientHeight || leftBody.clientHeight
    const targetScrollTop = scrollRatio * (leftScrollHeight - leftClientHeight)

    isSyncingRef.current = true
    leftDoc.documentElement.scrollTop = targetScrollTop
    leftBody.scrollTop = targetScrollTop
    leftScrollRef.current = targetScrollTop

    requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
  }, [syncScroll])

  useEffect(() => {
    const leftIframe = leftIframeRef.current
    if (!leftIframe) return

    const handleLoad = () => {
      const doc = leftIframe.contentDocument
      if (!doc) return
      doc.addEventListener('scroll', handleLeftScroll, true)
      injectDiffHighlight(doc, diffLeftLines, true)
    }

    leftIframe.addEventListener('load', handleLoad)
    return () => {
      leftIframe.removeEventListener('load', handleLoad)
      const doc = leftIframe.contentDocument
      if (doc) doc.removeEventListener('scroll', handleLeftScroll, true)
    }
  }, [handleLeftScroll, injectDiffHighlight, diffLeftLines])

  useEffect(() => {
    const rightIframe = rightIframeRef.current
    if (!rightIframe) return

    const handleLoad = () => {
      const doc = rightIframe.contentDocument
      if (!doc) return
      doc.addEventListener('scroll', handleRightScroll, true)
      injectDiffHighlight(doc, diffRightLines, false)
    }

    rightIframe.addEventListener('load', handleLoad)
    return () => {
      rightIframe.removeEventListener('load', handleLoad)
      const doc = rightIframe.contentDocument
      if (doc) doc.removeEventListener('scroll', handleRightScroll, true)
    }
  }, [handleRightScroll, injectDiffHighlight, diffRightLines])

  const scale = zoom / 100

  return (
    <div className="split-view">
      <div className="split-pane">
        <div className="pane-label version-a">
          <span>版本 A</span>
        </div>
        <div className="iframe-container">
          <div
            className="iframe-wrapper"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
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
        </div>
      </div>

      <div className="divider" />

      <div className="split-pane">
        <div className="pane-label version-b">
          <span>版本 B</span>
        </div>
        <div className="iframe-container">
          <div
            className="iframe-wrapper"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
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
        </div>
      </div>
    </div>
  )
}
