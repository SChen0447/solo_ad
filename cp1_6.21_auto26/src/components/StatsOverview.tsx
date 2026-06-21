import { Book, Film, Hash, Layers, Music, Star } from 'lucide-react'
import type { StatsData } from '../types'

interface Props {
  stats: StatsData
  onTagClick: (tag: string) => void
  activeTags: string[]
}

function iconStyle(color: string) {
  return { background: color, borderRadius: 10 }
}

export function StatsOverview({ stats, onTagClick, activeTags }: Props) {
  return (
    <section className="stats-section" aria-label="收藏统计">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={iconStyle('var(--primary)')}>
            <Layers size={18} />
          </div>
          <div className="stat-label">总收藏数</div>
          <div className="stat-value">{stats.total}<span className="unit">条</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={iconStyle('var(--book-color)')}>
            <Book size={18} />
          </div>
          <div className="stat-label">书籍</div>
          <div className="stat-value">{stats.byType.book}<span className="unit">本</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={iconStyle('var(--movie-color)')}>
            <Film size={18} />
          </div>
          <div className="stat-label">电影</div>
          <div className="stat-value">{stats.byType.movie}<span className="unit">部</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ ...iconStyle('var(--music-color)') }}>
            <Music size={18} />
          </div>
          <div className="stat-label">音乐 · 平均评分</div>
          <div className="stat-value">
            {stats.byType.music}<span className="unit">张</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 14, fontSize: 22 }}>
              <Star size={20} style={{ color: 'var(--star)', fill: 'var(--star)', marginRight: 4 }} />
              {stats.avgRating}
            </span>
          </div>
        </div>
      </div>

      {stats.tagCloud.length > 0 && (
        <div className="tag-cloud">
          <div className="tag-cloud-title">
            <Hash size={16} style={{ verticalAlign: '-3px', marginRight: 6, color: 'var(--primary)' }} />
            热门标签（点击筛选）
          </div>
          <div className="tag-cloud-inner">
            {stats.tagCloud.map(({ tag, count }) => {
              const active = activeTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip ${active ? 'active' : ''}`}
                  onClick={() => onTagClick(tag)}
                  style={{
                    fontSize: `${Math.min(11 + Math.min(count, 8) * 0.5, 15)}px`,
                    padding: `${5 + Math.min(count, 4)}px ${12 + Math.min(count, 4) * 2}px`
                  }}
                  title={`包含 ${count} 条收藏`}
                >
                  #{tag}
                  <span className="tag-chip-count">· {count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
