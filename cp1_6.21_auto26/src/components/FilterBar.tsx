import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import type { Filter, MediaType } from '../types'
import { Stars } from './Stars'

interface Props {
  filter: Filter
  onChange: (patch: Partial<Filter>) => void
  allTags: string[]
  onReset: () => void
}

const TYPE_OPTIONS: Array<{ v: MediaType | 'all'; label: string }> = [
  { v: 'all', label: '全部' },
  { v: 'book', label: '书籍' },
  { v: 'movie', label: '电影' },
  { v: 'music', label: '音乐' }
]

export function FilterBar({ filter, onChange, allTags, onReset }: Props) {
  const [tagsOpen, setTagsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setTagsOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function toggleTag(t: string) {
    const next = filter.tags.includes(t)
      ? filter.tags.filter(x => x !== t)
      : [...filter.tags, t]
    onChange({ tags: next })
  }

  const hasAny =
    filter.type !== 'all' ||
    filter.ratingMin > 0 ||
    filter.ratingMax > 0 ||
    filter.tags.length > 0 ||
    filter.search.trim().length > 0

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="filter-group search">
          <div className="search-input">
            <Search size={16} />
            <input
              type="search"
              placeholder="搜索标题或创作者…"
              value={filter.search}
              onChange={e => onChange({ search: e.target.value })}
              aria-label="搜索"
            />
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">
            <SlidersHorizontal size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            类型
          </span>
          <div className="type-pill-group" role="tablist">
            {TYPE_OPTIONS.map(o => (
              <button
                key={o.v}
                role="tab"
                aria-selected={filter.type === o.v}
                className={`type-pill ${filter.type === o.v ? 'active' : ''}`}
                onClick={() => onChange({ type: o.v })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">评分 ≥</span>
          <Stars
            value={filter.ratingMin}
            size="sm"
            interactive
            allowClear
            onChange={v => onChange({ ratingMin: v })}
          />
        </div>

        <div className="filter-group">
          <span className="filter-label">≤</span>
          <Stars
            value={filter.ratingMax}
            size="sm"
            interactive
            allowClear
            onChange={v => onChange({ ratingMax: v })}
          />
        </div>

        <div className="filter-group tags-dropdown" ref={ref}>
          <button
            type="button"
            className="tags-trigger"
            onClick={() => setTagsOpen(v => !v)}
            aria-haspopup="listbox"
            aria-expanded={tagsOpen}
          >
            标签
            {filter.tags.length > 0 && (
              <span style={{
                display: 'inline-grid',
                placeItems: 'center',
                minWidth: 20,
                height: 20,
                padding: '0 6px',
                borderRadius: 10,
                background: 'var(--primary)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700
              }}>
                {filter.tags.length}
              </span>
            )}
            <ChevronDown size={14} style={{ transition: 'transform 0.25s ease-out', transform: tagsOpen ? 'rotate(180deg)' : undefined }} />
          </button>
          {tagsOpen && (
            <div className="tags-dropdown-menu" role="listbox">
              {allTags.length === 0 && (
                <div style={{ padding: '12px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                  暂无标签，添加收藏后可使用标签筛选
                </div>
              )}
              {allTags.map(t => {
                const checked = filter.tags.includes(t)
                return (
                  <label key={t} role="option" aria-selected={checked}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTag(t)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    {t}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {hasAny && (
          <button type="button" className="btn btn-ghost" onClick={onReset} title="重置筛选">
            <X size={14} /> 重置
          </button>
        )}
      </div>
    </div>
  )
}
