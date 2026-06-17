import { useState, useRef, useCallback, useEffect, RefObject } from 'react'
import { Card as CardType, getQuadrant } from '../types'
import { useKanbanStore } from '../store/useKanbanStore'
import '../styles/Card.css'

interface CardProps {
  card: CardType
  onEdit: (card: CardType) => void
  onDragEnd: (cardId: string, x: number, y: number) => void
  boardRef: RefObject<HTMLDivElement>
}

function Card({ card, onEdit, onDragEnd, boardRef }: CardProps) {
  const { setSelectedCardId, updateCardPosition } = useKanbanStore()
  const [isDragging, setIsDragging] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const lastUpdateTime = useRef(0)
  const cardStartPos = useRef({ x: card.x, y: card.y })
  const hasMoved = useRef(false)

  const quadrant = getQuadrant(card.urgency, card.importance)

  useEffect(() => {
    setIsNew(true)
    const timer = setTimeout(() => setIsNew(false), 600)
    return () => clearTimeout(timer)
  }, [card.id])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-rating')) return
    e.preventDefault()
    setIsDragging(true)
    hasMoved.current = false
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
    }
    cardStartPos.current = {
      x: card.x,
      y: card.y,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const now = Date.now()
      if (now - lastUpdateTime.current < 16) return
      lastUpdateTime.current = now

      const board = boardRef.current
      if (!board) return

      const boardRect = board.getBoundingClientRect()
      const deltaX = (moveEvent.clientX - dragStartPos.current.x) / boardRect.width * 100
      const deltaY = (moveEvent.clientY - dragStartPos.current.y) / boardRect.height * 100

      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        hasMoved.current = true
      }

      let newX = cardStartPos.current.x + deltaX
      let newY = cardStartPos.current.y + deltaY

      const margin = 5
      const isLeft = quadrant === 'important-not-urgent' || quadrant === 'not-important-not-urgent'
      const isBottom = quadrant === 'not-important-urgent' || quadrant === 'not-important-not-urgent'

      const minX = isLeft ? margin : 50 + margin
      const maxX = isLeft ? 50 - margin : 100 - margin
      const minY = isBottom ? 50 + margin : margin
      const maxY = isBottom ? 100 - margin : 50 - margin

      newX = Math.max(minX, Math.min(maxX, newX))
      newY = Math.max(minY, Math.min(maxY, newY))

      updateCardPosition(card.id, newX, newY)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      onDragEnd(card.id, card.x, card.y)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [card, quadrant, updateCardPosition, onDragEnd, boardRef])

  const handleDoubleClick = (_e: React.MouseEvent) => {
    if (!hasMoved.current) {
      onEdit(card)
    }
  }

  const handleClick = (_e: React.MouseEvent) => {
    if (!hasMoved.current) {
      setSelectedCardId(card.id)
    }
  }

  const urgencyColor = card.urgency >= 4 ? '#ff6b6b' : card.urgency >= 3 ? '#ffa94d' : '#69db7c'
  const importanceColor = card.importance >= 4 ? '#ff6b6b' : card.importance >= 3 ? '#ffa94d' : '#69db7c'

  return (
    <div
      ref={cardRef}
      className={`kanban-card card-${quadrant} ${isDragging ? 'dragging' : ''} ${isNew ? 'fly-in' : ''}`}
      style={{
        left: `${card.x}%`,
        top: `${card.y}%`,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
    >
      <div className="card-glow" />
      
      <div className="card-ratings">
        <span
          className="card-rating urgency"
          style={{ boxShadow: `0 0 8px ${urgencyColor}80` }}
        >
          U{card.urgency}
        </span>
        <span
          className="card-rating importance"
          style={{ boxShadow: `0 0 8px ${importanceColor}80` }}
        >
          I{card.importance}
        </span>
      </div>

      <h3 className="card-title">{card.title}</h3>
      <p className="card-description">{card.description}</p>

      <div className="card-footer">
        <span className="card-votes">👍 {card.votes}</span>
      </div>
    </div>
  )
}

export default Card
