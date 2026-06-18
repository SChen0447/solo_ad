import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useCommentStore, TYPE_CONFIG, CommentType } from './commentStore'
import { TextHighlight } from './highlight'
import { CommentPanel } from './commentPanel'
import './App.css'

const ConfirmModal: React.FC<{
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}> = ({ title, message, onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onCancel}>
            取消
          </button>
          <button className="modal-btn-confirm" onClick={onConfirm}>
            确认
          </button>
        </div>
      </div>
    </div>
  )
}

const App: React.FC = () => {
  const { comments, clearAll } = useCommentStore()
  const [leftWidth, setLeftWidth] = useState(70)
  const [dragging, setDragging] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(() => {
    setDragging(true)
  }, [])

  useEffect(() => {
    if (!dragging) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const percent = ((e.clientX - rect.left) / rect.width) * 100
      const clamped = Math.min(Math.max(percent, 30), 80)
      setLeftWidth(clamped)
    }
    const handleMouseUp = () => {
      setDragging(false)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging])

  const handleExport = useCallback(() => {
    const data = comments.map((c) => ({
      textSnippet: c.text,
      type: TYPE_CONFIG[c.type].label,
      typeKey: c.type,
      content: c.content,
      offsetStart: c.offsetStart,
      offsetEnd: c.offsetEnd,
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `comments_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [comments])

  const handleReset = useCallback(() => {
    setConfirmModal({
      title: '重置确认',
      message: '确定要清空所有批注和高亮标记吗？此操作不可撤销。',
      onConfirm: () => {
        clearAll()
        setConfirmModal(null)
      },
    })
  }, [clearAll])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-toolbar">
        <span className="app-toolbar-title">📝 主观题批改与评语标记</span>
        <button
          className="toolbar-btn-export"
          onClick={handleExport}
          disabled={comments.length === 0}
          style={{ opacity: comments.length === 0 ? 0.5 : 1 }}
        >
          导出评语
        </button>
        <button
          className="toolbar-btn-reset"
          onClick={handleReset}
          disabled={comments.length === 0}
          style={{ opacity: comments.length === 0 ? 0.5 : 1 }}
        >
          重置所有
        </button>
      </div>
      <div className="app-main" ref={containerRef}>
        <div className="left-panel" style={{ width: `${leftWidth}%` }}>
          <TextHighlight />
        </div>
        <div
          className={`divider${dragging ? ' dragging' : ''}`}
          onMouseDown={handleMouseDown}
        />
        <div className="right-panel" style={{ width: `${100 - leftWidth}%` }}>
          <CommentPanel />
        </div>
      </div>
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}

export default App
