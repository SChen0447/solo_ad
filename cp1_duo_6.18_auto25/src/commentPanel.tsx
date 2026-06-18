import React, { useState, useRef, useEffect } from 'react'
import { useCommentStore, TYPE_CONFIG, Comment } from './commentStore'

const ConfirmDelete: React.FC<{
  onConfirm: () => void
  onCancel: () => void
}> = ({ onConfirm, onCancel }) => (
  <div className="confirm-delete-bar" onClick={(e) => e.stopPropagation()}>
    <span className="confirm-delete-text">确认删除？</span>
    <button className="confirm-delete-yes" onClick={onConfirm}>删除</button>
    <button className="confirm-delete-no" onClick={onCancel}>取消</button>
  </div>
)

const CommentCard: React.FC<{ comment: Comment }> = ({ comment }) => {
  const { removeComment, updateComment, selectComment, selectedCommentId } =
    useCommentStore()
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(comment.content)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSelected = selectedCommentId === comment.id

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleDoubleClick = () => {
    setEditing(true)
    setEditValue(comment.content)
  }

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== comment.content) {
      updateComment(comment.id, { content: trimmed })
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setEditValue(comment.content)
      setEditing(false)
    }
  }

  const handleDeleteRequest = () => {
    setConfirmDelete(true)
  }

  const handleDeleteConfirm = () => {
    removeComment(comment.id)
    setConfirmDelete(false)
  }

  const handleDeleteCancel = () => {
    setConfirmDelete(false)
  }

  const config = TYPE_CONFIG[comment.type]

  return (
    <div
      className={`comment-card${isSelected ? ' comment-card-selected' : ''}`}
      onClick={() => selectComment(comment.id)}
    >
      <div className="comment-card-header">
        <span
          className="comment-type-icon"
          style={{ backgroundColor: config.color }}
        >
          {config.icon}
        </span>
        <span className="comment-type-label" style={{ color: config.color }}>
          {config.label}
        </span>
        <button className="comment-delete-btn" onClick={(e) => {
          e.stopPropagation()
          handleDeleteRequest()
        }}>
          ✕
        </button>
      </div>
      <div className="comment-text-snippet">"{comment.text}"</div>
      <div className="comment-content" onDoubleClick={handleDoubleClick}>
        {editing ? (
          <input
            ref={inputRef}
            className="comment-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="comment-content-text">{comment.content}</span>
        )}
      </div>
      <div className="comment-card-footer">
        {!editing && !confirmDelete && (
          <button
            className="comment-edit-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleDoubleClick()
            }}
          >
            编辑
          </button>
        )}
        {confirmDelete && (
          <ConfirmDelete
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
          />
        )}
      </div>
    </div>
  )
}

export const CommentPanel: React.FC = () => {
  const { comments, selectedCommentId } = useCommentStore()

  return (
    <div className="comment-panel">
      <div className="comment-panel-header">
        <span className="comment-panel-title">批注列表</span>
        <span className="comment-panel-count">{comments.length}</span>
      </div>
      <div className="comment-panel-list">
        {comments.length === 0 ? (
          <div className="comment-empty">暂无批注</div>
        ) : (
          comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  )
}
