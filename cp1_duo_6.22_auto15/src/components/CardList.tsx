import { Card, formatDate } from '../api'

interface Props {
  cards: Card[]
  onEditCard: (card: Card) => void
  onDeleteCard: (id: string) => void
  loading: boolean
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
}

function CardItem({
  card,
  visible,
  onEdit,
  onDelete,
}: {
  card: Card
  visible: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const isDue = card.nextReviewAt <= Date.now()
  const plainContent = stripMarkdown(card.content)
  const summary = plainContent.length > 50
    ? plainContent.slice(0, 50) + '…'
    : plainContent

  return (
    <div
      className="card-item"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}
      onClick={onEdit}
    >
      {isDue && <div className="card-due-badge">待复习</div>}
      <div className="card-header">
        <h3 className="card-title" title={card.title}>{card.title}</h3>
      </div>
      {summary && <p className="card-summary">{summary}</p>}
      <div className="card-footer">
        <div className="card-tags">
          {card.tags.map((tag, i) => (
            <span key={`${tag}-${i}`} className="card-tag">#{tag}</span>
          ))}
        </div>
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button className="card-btn card-btn-delete" onClick={onDelete} title="删除">
            🗑️
          </button>
        </div>
      </div>
      <div className="card-meta">
        <span>下次复习: {formatDate(card.nextReviewAt)}</span>
        <span>复习 {card.repetitions} 次</span>
      </div>
    </div>
  )
}

export default function CardList({ cards, onEditCard, onDeleteCard, loading }: Props) {
  return (
    <section className="cards-section">
      {loading && <div className="loading">加载中...</div>}
      {!loading && cards.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>还没有卡片</h3>
          <p>点击右上角「新建卡片」开始添加你的第一张知识卡片</p>
        </div>
      )}
      {!loading && cards.length > 0 && (
        <div className="cards-grid">
          {cards.map(card => (
            <CardItem
              key={card.id}
              card={card}
              visible={true}
              onEdit={() => onEditCard(card)}
              onDelete={() => onDeleteCard(card.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
