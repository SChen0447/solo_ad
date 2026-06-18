import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAnnotationStore } from '../store/annotationStore'
import { useCommentStore } from '../store/commentStore'
import type { Comment } from '../types'

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

interface CommentPanelProps {
  isCollapsed?: boolean
  onToggle?: () => void
  onWidthChange?: (width: number) => void
  width?: number
}

export const CommentPanel: React.FC<CommentPanelProps> = ({
  isCollapsed = false, onToggle, onWidthChange, width = 320 }) => {
  const { selectedAnnotationId, annotations } = useAnnotationStore()
  const { comments, addComment, getCommentsForAnnotation } = useCommentStore()
  const [newComment, setNewComment] = useState('')
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(320)
  const panelRef = useRef<HTMLDivElement>(null)

  const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId)
  const annotationComments = selectedAnnotationId ? getCommentsForAnnotation(selectedAnnotationId) : []

  const handleSubmit = useCallback(() => {
    if (selectedAnnotationId && newComment.trim()) {
      addComment(selectedAnnotationId, newComment.trim())
      setNewComment('')
    }
  }, [selectedAnnotationId, newComment, addComment])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = width
  }, [width])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const deltaX = resizeStartX.current - e.clientX
      const newWidth = Math.min(500, Math.max(240, resizeStartWidth.current + deltaX))
      onWidthChange?.(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, onWidthChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const renderComment = (comment: Comment) => (
    <div key={comment.id} className="comment-item">
      <div className="comment-header">
        <span className="comment-author">{comment.author}</span>
        <span className="comment-time">{formatTime(comment.createdAt)}</span>
      </div>
      <div className="comment-bubble">
        <p>{comment.text}</p>
      </div>
    </div>
  )

  return (
    <>
      {isCollapsed && (
        <button className="comment-fab" onClick={onToggle}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}

      {!isCollapsed && (
        <div
          ref={panelRef}
          className={`comment-panel ${isResizing ? 'resizing' : ''}`}
          style={{ width: `${width}px` }}
        >
          <div
            className="comment-resize-handle"
            onMouseDown={handleResizeStart}
          />
          <div className="comment-panel-header">
            <h3>评论</h3>
            <button className="comment-close" onClick={onToggle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="comment-panel-content">
            {!selectedAnnotationId ? (
              <div className="comment-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p>选择一个标注查看评论</p>
                <p className="comment-hint">双击标注锚点添加评论</p>
              </div>
            ) : (
                <>
                  <div className="comment-annotation-info">
                    <span className="annotation-type-badge">
                      {selectedAnnotation?.type === 'arrow' && '箭头'}
                      {selectedAnnotation?.type === 'rectangle' && '矩形'}
                      {selectedAnnotation?.type === 'ellipse' && '椭圆'}
                      {selectedAnnotation?.type === 'brush' && '画笔'}
                    </span>
                    <span className="annotation-id">#{selectedAnnotationId.slice(0, 6)}</span>
                  </div>

                  <div className="comments-list">
                    {annotationComments.length === 0 ? (
                      <div className="comment-empty small">
                      <p>暂无评论</p>
                      <p className="comment-hint">双击标注锚点添加第一条评论</p>
                    </div>
                    ) : (
                      annotationComments.map(renderComment)
                    )}
                  </div>

                  <div className="comment-input">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="添加评论..."
                      className="comment-input-field"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!newComment.trim()}
                      className="comment-submit"
                    >
                      发送
                    </button>
                  </div>
                </>
              )}
          </div>
        </div>
      )}
    </>
  )
}
