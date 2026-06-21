import { useState, useMemo } from 'react'
import type { MediaItem } from '../types'
import { Stars } from './Stars'
import { TypeBadge } from './TypeBadge'
import { TagChips } from './TagChips'

interface Props {
  items: MediaItem[]
  onClickItem: (item: MediaItem) => void
  onTagClick?: (tag: string) => void
}

const PAGE_SIZE = 12

function formatDate(ts: number) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export function MediaTimeline({ items, onClickItem, onTagClick }: Props) {
  const [page, setPage] = useState(1)
  const visible = useMemo(() => items.slice(0, page * PAGE_SIZE), [items, page])
  const hasMore = visible.length < items.length

  return (
    <div>
      <div className="timeline-view">
        {visible.map(item => (
          <div
            key={item.id}
            className={`timeline-item ${item.type}`}
            onClick={() => onClickItem(item)}
          >
            <div className="timeline-row">
              <div className="timeline-cover">
                <img
                  src={item.coverUrl}
                  alt=""
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div>
                <div className="timeline-date">添加于 {formatDate(item.createdAt)}</div>
                <div className="timeline-title">{item.title}</div>
                <div className="timeline-subtitle">{item.creator} · {item.year}</div>
                <Stars value={item.rating} />
                <div className="timeline-tags">
                  <TagChips tags={item.tags} onTagClick={onTagClick} />
                </div>
              </div>
              <div className="timeline-type-side">
                <TypeBadge type={item.type} variant="pill" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)}>
            加载更多
          </button>
        </div>
      )}
    </div>
  )
}
