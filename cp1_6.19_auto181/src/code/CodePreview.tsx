import { useState, useRef, useEffect } from 'react'
import './CodePreview.css'

interface CodePreviewProps {
  code: string
  onCodeChange?: (code: string) => void
}

export default function CodePreview({ code, onCodeChange }: CodePreviewProps) {
  const [showCopied, setShowCopied] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    updatePreview(code)
  }, [code])

  const updatePreview = (htmlCode: string) => {
    if (!iframeRef.current) return
    const iframe = iframeRef.current
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(htmlCode)
    doc.close()
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    if (onCodeChange) {
      onCodeChange(newCode)
    }
    updatePreview(newCode)
  }

  const handleRun = () => {
    updatePreview(code)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const handleExport = () => {
    const blob = new Blob([code], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sketch-to-html.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="code-preview">
      <div className="code-header">
        <span className="code-title">代码预览</span>
        <div className="code-actions">
          <button className="action-btn" onClick={handleRun} title="运行代码">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            运行
          </button>
          <button className="action-btn" onClick={handleCopy} title="复制代码">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            复制
          </button>
          <button className="action-btn export-btn" onClick={handleExport} title="导出HTML文件">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出
          </button>
        </div>
        {showCopied && (
          <div className="copy-toast-small">已复制到剪贴板</div>
        )}
      </div>

      <div className="code-editor-wrapper">
        <textarea
          ref={textareaRef}
          className="code-editor"
          value={code}
          onChange={handleCodeChange}
          spellCheck={false}
        />
      </div>

      <div className="preview-section">
        <div className="preview-header">
          <span className="preview-title">运行预览</span>
        </div>
        <div className="iframe-wrapper">
          <iframe
            ref={iframeRef}
            className="preview-iframe"
            title="预览"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  )
}
