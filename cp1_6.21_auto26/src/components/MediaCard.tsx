import type { MediaItem } from '../types'
import { Stars } from './Stars'
import { TypeBadge } from './TypeBadge'
import { TagChips } from './TagChips'

interface Props {
  item: MediaItem
  onClick: (item: MediaItem) => void
  onTagClick?: (tag: string) => void
}

export function MediaCard({ item, onClick, onTagClick }: Props) {
  return (
    <article
      className="media-card"
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick(item)}
    >
      <div className="cover-wrap">
        <img
          src={item.coverUrl}
          alt={`${item.title} 封面`}
          loading="lazy"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <TypeBadge type={item.type} />
      </div>
      <div className="card-info">
        <div className="card-top">
          <h3 className="card-title">{item.title}</h3>
        </div>
        <div className="card-meta">
          <span>{item.creator}</span>
          <span className="divider">·</span>
          <span>{item.year}</span>
        </div>
        <Stars value={item.rating} />
        <TagChips tags={item.tags} onTagClick={t => { onTagClick?.(t) }} />
      </div>
    </article>
  )
}
