import { useState, useRef, useEffect } from 'react'
import type { StickyNoteData } from '../server/server'

interface StickyNoteProps {
  note: StickyNoteData
  onMove: (id: string, x: number, y: number) => void
  onEdit: (id: string, text: string) => void
  onDelete: (id: string) => void
}

export default function StickyNote({ note, onMove, onEdit, onDelete }: StickyNoteProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(note.text)
  const dragOffset = useRef({ x: 0, y: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditText(note.text)
  }, [note.text])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    e.stopPropagation()
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - note.x,
      y: e.clientY - note.y,
    }
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.current.x
      const newY = e.clientY - dragOffset.current.y
      onMove(note.id, newX, newY)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, note.id, onMove])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    onEdit(note.id, editText.slice(0, 200))
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(note.id)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
        width: 150,
        height: 150,
        background: '#FFF9C4',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        padding: 12,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        zIndex: 10,
      }}
    >
      <button
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 20,
          height: 20,
          background: '#E74C3C',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: '20px',
          textAlign: 'center',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value.slice(0, 200))}
          onBlur={handleBlur}
          maxLength={200}
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#333',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            fontFamily: 'Arial, sans-serif',
            fontSize: 14,
            lineHeight: 1.5,
            color: '#333',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {note.text || '双击编辑...'}
        </div>
      )}
    </div>
  )
}
