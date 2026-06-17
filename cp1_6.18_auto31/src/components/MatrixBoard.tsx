import { useRef } from 'react'
import { useKanbanStore } from '../store/useKanbanStore'
import Card from './Card'
import { Card as CardType } from '../types'
import '../styles/MatrixBoard.css'

interface MatrixBoardProps {
  onEditCard: (card: CardType) => void
}

const quadrants = [
  { id: 'important-urgent', label: '重要紧急', position: 'top-right' },
  { id: 'important-not-urgent', label: '重要不紧急', position: 'top-left' },
  { id: 'not-important-urgent', label: '不重要紧急', position: 'bottom-right' },
  { id: 'not-important-not-urgent', label: '不重要不紧急', position: 'bottom-left' },
]

function MatrixBoard({ onEditCard }: MatrixBoardProps) {
  const { cards, updateCard } = useKanbanStore()
  const boardRef = useRef<HTMLDivElement>(null)

  const handleDragEnd = (cardId: string, x: number, y: number) => {
    updateCard(cardId, { x, y })
  }

  return (
    <div className="matrix-board" ref={boardRef}>
      <div className="matrix-grid">
        {quadrants.map((quadrant) => (
          <div
            key={quadrant.id}
            className={`quadrant quadrant-${quadrant.id}`}
          >
            <div className="quadrant-label">
              {quadrant.label}
            </div>
          </div>
        ))}
      </div>

      <div className="matrix-cards-container">
        {cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onEdit={onEditCard}
            onDragEnd={handleDragEnd}
            boardRef={boardRef}
          />
        ))}
      </div>

      <div className="matrix-axis">
        <div className="axis-x-label">
          <span className="axis-label-low">不重要</span>
          <span className="axis-label-high">重要 →</span>
        </div>
        <div className="axis-y-label">
          <span className="axis-label-high">↑ 紧急</span>
          <span className="axis-label-low">不紧急</span>
        </div>
      </div>

      <div className="matrix-divider-h" />
      <div className="matrix-divider-v" />
    </div>
  )
}

export default MatrixBoard
