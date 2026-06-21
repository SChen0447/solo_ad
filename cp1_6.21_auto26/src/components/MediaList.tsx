import type { MediaItem } from '../types'
import { Stars } from './Stars'
import { TypeBadge } from './TypeBadge'
import { TagChips } from './TagChips'

interface Props {
  items: MediaItem[]
  onClickItem: (item: MediaItem) => void
  onTagClick?: (tag: string) => void
}

export function MediaList({ items, onClickItem, onTagClick }: Props) {
  return (
    <div className="list-view" role="list">
      {items.map(item => (
        <div
          key={item.id}
          className="list-row"
          role="listitem"
          onClick={() => onClickItem(item)}
        >
          <div className="list-cover">
            <img
              src={item.coverUrl}
              alt=""
              loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div className="list-title-block">
            <div className="list-title">{item.title}</div>
            <div className="list-subtitle">{item.creator} · {item.year}</div>
          </div>
          <TypeBadge type={item.type} variant="pill" />
          <Stars value={item.rating} size="sm" />
          <TagChips tags={item.tags} onTagClick={onTagClick} className="list-tags" />
        </div>
      ))}
    </div>
  )
}
