import { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Toolbar from './components/Toolbar'
import Editor, { type EditorRef } from './components/Editor'
import Preview, { type PreviewRef } from './components/Preview'
import HistoryPanel from './components/HistoryPanel'
import html2canvas from 'html2canvas'

export interface HistoryItem {
  id: string
  formula: string
  timestamp: number
}

function App() {
  const [formula, setFormula] = useState<string>('\\frac{a}{b} + \\sqrt{x}')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState<boolean>(true)
  const [copyToast, setCopyToast] = useState<boolean>(false)
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<PreviewRef>(null)
  const editorRef = useRef<EditorRef>(null)
  const lastSaveRef = useRef<number>(0)

  const handleInsertSymbol = useCallback((template: string, cursorOffset: number = 1) => {
    if (editorRef.current) {
      editorRef.current.insertText(template, cursorOffset)
    } else {
      setFormula(prev => prev + template)
    }
  }, [])

  const handleEditorChange = useCallback((value: string) => {
    setFormula(value)
    const now = Date.now()
    if (now - lastSaveRef.current > 2000 && value.trim().length > 0) {
      lastSaveRef.current = now
      setHistory(prev => {
        if (prev.length > 0 && prev[0].formula === value) {
          return prev
        }
        const newItem: HistoryItem = {
          id: uuidv4(),
          formula: value,
          timestamp: now
        }
        return [newItem, ...prev].slice(0, 5)
      })
    }
  }, [])

  const handleSelectHistory = useCallback((item: HistoryItem) => {
    setFormula(item.formula)
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formula)
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 1500)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }, [formula])

  const handleExportPNG = useCallback(async () => {
    try {
      const hasError = previewRef.current?.hasError() ?? false
      const isEmpty = previewRef.current?.isEmpty() ?? formula.trim().length === 0

      if (hasError || isEmpty) {
        const width = 600
        const height = 120
        const canvas = document.createElement('canvas')
        canvas.width = width * 3
        canvas.height = height * 3
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(3, 3)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
          ctx.fillStyle = hasError ? '#dc2626' : '#9ca3af'
          ctx.font = '16px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          const msg = hasError ? '公式存在错误，请修正后再导出' : '请先输入公式'
          ctx.fillText(msg, width / 2, height / 2)
          if (hasError && formula.trim().length > 0) {
            ctx.font = '13px Consolas, Monaco, monospace'
            ctx.fillStyle = '#6b7280'
            const displayFormula = formula.length > 40 ? formula.substring(0, 40) + '...' : formula
            ctx.fillText(displayFormula, width / 2, height / 2 + 28)
          }
        }
        const link = document.createElement('a')
        link.download = `formula-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        return
      }

      if (!previewWrapRef.current) return
      const canvas = await html2canvas(previewWrapRef.current, {
        backgroundColor: '#ffffff',
        width: 600,
        windowWidth: 600,
        scale: 3,
        useCORS: true,
        logging: false
      })
      const link = document.createElement('a')
      link.download = `formula-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('导出失败:', err)
    }
  }, [formula])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'f' && !e.shiftKey) {
          e.preventDefault()
          handleInsertSymbol('\\frac{}{}', 7)
        } else if (e.key.toLowerCase() === 'r' && !e.shiftKey) {
          e.preventDefault()
          handleInsertSymbol('\\sqrt{}', 7)
        } else if (e.key.toLowerCase() === 'u' && e.shiftKey) {
          e.preventDefault()
          handleInsertSymbol('^{}', 2)
        } else if (e.key.toLowerCase() === 'l' && e.shiftKey) {
          e.preventDefault()
          handleInsertSymbol('_{}', 2)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleInsertSymbol])

  return (
    <div className="app-container">
      <div className="main-area">
        <div className="editor-section">
          <Toolbar onInsertSymbol={handleInsertSymbol} />
          <Editor ref={editorRef} value={formula} onChange={handleEditorChange} />
          <div style={{ marginTop: '12px' }} ref={previewWrapRef}>
            <Preview ref={previewRef} formula={formula} />
          </div>
          <div className="action-bar">
            <button className="action-btn" onClick={handleCopy} title="复制LaTeX源码">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>复制</span>
            </button>
            <button className="action-btn" onClick={handleExportPNG} title="导出为PNG图片">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>导出PNG</span>
            </button>
            <button
              className={`action-btn history-toggle mobile-only ${showHistory ? 'active' : ''}`}
              onClick={() => setShowHistory(!showHistory)}
              title="历史记录"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"></path>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              <span>历史</span>
            </button>
          </div>
        </div>
      </div>

      <HistoryPanel
        history={history}
        isOpen={showHistory}
        onToggle={() => setShowHistory(!showHistory)}
        onSelect={handleSelectHistory}
      />

      {copyToast && (
        <div className="copy-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>已复制</span>
        </div>
      )}
    </div>
  )
}

export default App
