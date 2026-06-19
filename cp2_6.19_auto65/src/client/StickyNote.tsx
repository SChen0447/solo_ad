import React, { useState, useRef, useEffect } from 'react'
import { type StickyNoteData, type NoteColor, NOTE_COLOR_MAP } from '../shared/types'

interface StickyNoteProps {
  note: StickyNoteData
  scale: number
  offsetX: number
  offsetY: number
  onUpdate: (note: StickyNoteData) => void
  onDelete: (id: string) => void
}

const StickyNote: React.FC<StickyNoteProps> = ({
  note,
  scale,
  offsetX,
  offsetY,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(note.content)
  const [isDragging, setIsDragging] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [colorCycleIdx, setColorCycleIdx] = useState<number>(
    (['yellow', 'pink', 'blue'] as NoteColor[]).indexOf(note.color)
  )
  const dragStart = useRef({ x: 0, y: 0, noteX: 0, noteY: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const noteColors: NoteColor[] = ['yellow', 'pink', 'blue']

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    e.stopPropagation()
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      noteX: note.x,
      noteY: note.y
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - dragStart.current.x) / scale
      const dy = (moveEvent.clientY - dragStart.current.y) / scale
      onUpdate({
        ...note,
        x: dragStart.current.noteX + dx,
        y: dragStart.current.noteY + dy
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditContent(note.content)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setIsEditing(false)
      onUpdate({ ...note, content: editContent })
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditContent(note.content)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const nextIdx = (colorCycleIdx + 1) % noteColors.length
    setColorCycleIdx(nextIdx)
    onUpdate({ ...note, color: noteColors[nextIdx] })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    setTimeout(() => {
      onDelete(note.id)
    }, 300)
  }

  const bgColor = NOTE_COLOR_MAP[note.color]

  return (
    <div
      className={`sticky-note ${isDragging ? 'dragging' : ''} ${isDeleting ? 'deleting' : ''}`}
      style={{
        left: note.x * scale + offsetX,
        top: note.y * scale + offsetY,
        width: 120 * scale,
        height: 80 * scale,
        backgroundColor: bgColor,
        transition: isDeleting
          ? 'all 0.3s ease'
          : isDragging
          ? 'none'
          : 'background-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="note-envelope-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>

      <button
        className="note-delete-btn"
        onClick={handleDelete}
        title="删除便签"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          className="note-input"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onBlur={() => {
            setIsEditing(false)
            onUpdate({ ...note, content: editContent })
          }}
          style={{ fontSize: 12 * scale }}
        />
      ) : (
        <div className="note-content" style={{ fontSize: 12 * scale }}>
          {note.content || <span className="note-placeholder">双击编辑</span>}
        </div>
      )}
    </div>
  )
}

export default StickyNote
