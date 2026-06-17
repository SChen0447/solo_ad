import React, { useState, useRef, useEffect } from 'react'
import type { Card } from '../api'
import { updateCard } from '../api'

interface RetroCardProps {
  card: Card
  onUpdate: (card: Card) => void
  onDragStart: (e: React.DragEvent, card: Card) => void
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}

const RetroCard: React.FC<RetroCardProps> = ({ card, onUpdate, onDragStart }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(card.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = () => {
    setIsEditing(true)
    setEditContent(card.content)
  }

  const handleBlur = async () => {
    if (isEditing && editContent.trim() !== card.content) {
      try {
        const updated = await updateCard(card.id, editContent.trim())
        onUpdate(updated)
      } catch (err) {
        console.error('Failed to update card:', err)
      }
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleBlur()
    }
    if (e.key === 'Escape') {
      setEditContent(card.content)
      setIsEditing(false)
    }
  }

  const cardStyle: React.CSSProperties = isEditing
    ? {
        backgroundColor: '#fef9c3',
        border: '2px solid #eab308'
      }
    : {
        backgroundColor: '#ffffff',
        border: '1px solid transparent'
      }

  return (
    <div
      className="retro-card"
      style={{
        ...cardStyle,
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'grab',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        marginBottom: '12px',
        userSelect: 'none'
      }}
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={(e) => {
        if (!isEditing) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            minHeight: '60px',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            backgroundColor: 'transparent',
            fontFamily: 'inherit',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#1e293b'
          }}
        />
      ) : (
        <p
          style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#1e293b',
            wordBreak: 'break-word'
          }}
        >
          {card.content}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span
          style={{
            fontSize: '12px',
            color: '#6366f1',
            fontWeight: 600
          }}
        >
          {card.author}
        </span>
        <span
          style={{
            fontSize: '12px',
            color: '#9ca3af'
          }}
        >
          {formatTimestamp(card.createdAt)}
        </span>
      </div>
    </div>
  )
}

export default RetroCard
