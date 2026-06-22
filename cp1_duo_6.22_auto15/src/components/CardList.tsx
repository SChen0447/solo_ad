import { useMemo } from 'react'
import { Card, TagInfo, formatDate, renderMarkdownSimple } from '../api'

interface Props {
  cards: Card[]
  tags: TagInfo[]
  activeTag: string | undefined
  onTagClick: (tag: string) => void
  onEditCard: (card: Card) => void
  onDeleteCard: (id: string) => void
  onStartReview: () => void
  dueCount: number
  loading: boolean
}

function TagCloud({ tags, activeTag, onClick }: { tags: TagInfo[]; activeTag: string | undefined; onClick: (t: string) => void }) {
  const maxCount = useMemo(() => Math.max(...tags.map(t => t.count), 1), [tags])

  if (tags.length === 0) {
    return <div className="empty-tags">暂未添加标签</div>
  }

  return (
    <div className="tag-cloud">
      {tags.map(tag => {
        const ratio = tag.count / maxCount
        const fontSize = 12 + ratio * 14
        const hue = 210 + ratio * 80
        const lightness = 70 - ratio * 25
        const isActive = activeTag === tag.name
        return (
          <button
            key={tag.name}
            className={`tag-chip ${isActive ? 'active' : ''}`}
            onClick={() => onClick(tag.name)}
            style={{
              fontSize: `${fontSize}px`,
              color: isActive ? '#fff' : `hsl(${hue}, 65%, ${lightness}%)`,
              backgroundColor: isActive ? `hsl(${hue}, 65%, 55%)` : 'transparent',
              transition: 'all 50ms ease',
            }}
            title={`${tag.name} (${tag.count})`}
          >
            {tag.name}
            <span className="tag-count">{tag.count}</span>
          </button>
        )
      })}
    </div>
  )
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
  const previewHtml = renderMarkdownSimple(card.content.slice(0, 200) + (card.content.length > 200 ? '...' : ''))

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
      <div
        className="card-content-preview"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
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

export default function CardList({
  cards,
  tags,
  activeTag,
  onTagClick,
  onEditCard,
  onDeleteCard,
  onStartReview,
  dueCount,
  loading,
}: Props) {
  return (
    <div className="card-list-layout">
      <aside className="sidebar">
        <div className="sidebar-section">
          <h2 className="sidebar-title">快速操作</h2>
          <button className="btn btn-accent btn-block" onClick={onStartReview}>
            🔄 开始复习
            {dueCount > 0 && <span className="badge badge-lg">{dueCount} 张待复习</span>}
          </button>
        </div>
        <div className="sidebar-section">
          <h2 className="sidebar-title">
            标签云
            {activeTag && (
              <button className="clear-tag-btn" onClick={() => onTagClick(activeTag)}>
                清除筛选 ×
              </button>
            )}
          </h2>
          <TagCloud tags={tags} activeTag={activeTag} onClick={onTagClick} />
        </div>
        <div className="sidebar-section">
          <h2 className="sidebar-title">统计信息</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{cards.length}</div>
              <div className="stat-label">总卡片数</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{dueCount}</div>
              <div className="stat-label">待复习</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{tags.length}</div>
              <div className="stat-label">标签数</div>
            </div>
          </div>
        </div>
      </aside>

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
    </div>
  )
}
