import { useKanbanStore } from '../store/useKanbanStore'
import { Card as CardType, getQuadrant } from '../types'
import '../styles/Sidebar.css'

interface SidebarProps {
  onEditCard: (card: CardType) => void
  onClose: () => void
  isMobile: boolean
}

function Sidebar({ onEditCard, onClose, isMobile }: SidebarProps) {
  const { cards, setSelectedCardId } = useKanbanStore()

  const sortedCards = [...cards].sort((a, b) => {
    const aScore = a.urgency * 2 + a.importance
    const bScore = b.urgency * 2 + b.importance
    return bScore - aScore
  })

  const handleCardClick = (card: CardType) => {
    setSelectedCardId(card.id)
    if (isMobile) {
      onClose()
    }
  }

  return (
    <aside className={`sidebar ${isMobile ? 'sidebar-mobile' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">需求列表</h2>
        {isMobile && (
          <button className="sidebar-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>

      <div className="sidebar-list">
        {sortedCards.length === 0 ? (
        <div className="sidebar-empty">
          <p>暂无需求卡片</p>
          <p className="empty-hint">点击右上角 + 添加</p>
        </div>
      ) : (
        sortedCards.map((card) => {
          const quadrant = getQuadrant(card.urgency, card.importance)
          return (
            <div
              key={card.id}
              className={`sidebar-item sidebar-item-${quadrant}`}
              onClick={() => handleCardClick(card)}
              onDoubleClick={() => onEditCard(card)}
            >
              <div className="sidebar-item-icon">
                <div className={`icon-dot icon-dot-${quadrant}`} />
              </div>
              <div className="sidebar-item-content">
                <h3 className="sidebar-item-title">{card.title}</h3>
                <div className="sidebar-item-ratings">
                  <span className="sidebar-rating urgency">
                    紧急 {card.urgency}
                  </span>
                  <span className="sidebar-rating importance">
                    重要 {card.importance}
                  </span>
                </div>
              </div>
              <div className="sidebar-item-votes">
                👍 {card.votes}
              </div>
            </div>
          )
        })
      )}
      </div>

      <div className="sidebar-footer">
        <p>共 {cards.length} 个需求</p>
      </div>
    </aside>
  )
}

export default Sidebar
