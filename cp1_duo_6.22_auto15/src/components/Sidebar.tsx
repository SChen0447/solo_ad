import { useMemo } from 'react'
import { TagInfo } from '../api'

interface Props {
  tags: TagInfo[]
  activeTag: string | undefined
  totalCards: number
  dueCount: number
  onTagClick: (tag: string) => void
  onStartReview: () => void
}

function TagCloud({
  tags,
  activeTag,
  onClick,
}: {
  tags: TagInfo[]
  activeTag: string | undefined
  onClick: (t: string) => void
}) {
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

export default function Sidebar({
  tags,
  activeTag,
  totalCards,
  dueCount,
  onTagClick,
  onStartReview,
}: Props) {
  return (
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
            <div className="stat-value">{totalCards}</div>
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
  )
}
