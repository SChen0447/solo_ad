import { Book, Film, Music } from 'lucide-react'
import type { MediaType } from '../types'

const LABEL: Record<MediaType, string> = {
  book: '书籍',
  movie: '电影',
  music: '音乐'
}

const ICON = {
  book: Book,
  movie: Film,
  music: Music
}

interface Props {
  type: MediaType
  variant?: 'badge' | 'pill'
}

export function TypeBadge({ type, variant = 'badge' }: Props) {
  const Icon = ICON[type]
  if (variant === 'pill') {
    return (
      <span className={`list-type-badge`} style={{ background: `var(--${type}-color)` }}>
        <Icon size={12} />
        {LABEL[type]}
      </span>
    )
  }
  return (
    <span className={`type-badge ${type}`}>
      <Icon size={12} style={{ verticalAlign: '-2px', marginRight: '3px' }} />
      {LABEL[type]}
    </span>
  )
}
