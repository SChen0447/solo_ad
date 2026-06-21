interface Props {
  tags: string[]
  onTagClick?: (tag: string) => void
  size?: 'sm' | 'md'
  className?: string
}

export function TagChips({ tags, onTagClick, size = 'sm', className = '' }: Props) {
  return (
    <div className={`card-tags ${className}`}>
      {tags.map(tag => (
        <button
          key={tag}
          type="button"
          className={`tag-chip ${size === 'sm' ? '' : ''}`}
          onClick={() => onTagClick?.(tag)}
          style={{ padding: size === 'sm' ? '3px 10px' : '5px 12px', fontSize: size === 'sm' ? '11px' : '12px' }}
        >
          #{tag}
        </button>
      ))}
    </div>
  )
}
