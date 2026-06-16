import React from 'react'
import type { HistoryItem } from '../utils/emotionAnalyzer'

interface HistoryPanelProps {
  history: HistoryItem[]
  activeId: string | null
  onSelect: (id: string) => void
  onExport: (item: HistoryItem) => void
  onDelete?: (id: string) => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - ts
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  const dd = d.getDate().toString().padStart(2, '0')
  const hh = d.getHours().toString().padStart(2, '0')
  const mi = d.getMinutes().toString().padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  if (m === 0) return `${sec}s`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  activeId,
  onSelect,
  onExport,
}) => {
  if (history.length === 0) {
    return (
      <section className="history-section">
        <h2 className="section-title" style={{ marginBottom: '1rem' }}>📜 历史记录</h2>
        <div className="history-grid">
          <div className="glass empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">🎼</div>
            <div className="empty-state-text">
              还没有生成过音乐，输入情绪关键词和描述来开始创作吧！
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="history-section">
      <h2 className="section-title" style={{ marginBottom: '1rem' }}>
        📜 历史记录 <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({history.length}/20)</span>
      </h2>
      <div className="history-grid">
        {history.map((item) => (
          <div
            key={item.id}
            className={`history-card glass ${activeId === item.id ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <div className="history-emotions">
              {item.keywords.map((kw, idx) => (
                <span key={idx} className="history-emotion-chip">{kw}</span>
              ))}
            </div>
            <div className="history-time">{formatDate(item.createdAt)}</div>
            <div className="history-meta">
              <span>🎵 BPM {item.bpm}</span>
              <span>⏱ {formatDuration(item.duration)}</span>
            </div>
            <div className="history-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="history-play-btn"
                onClick={() => onSelect(item.id)}
              >
                {activeId === item.id ? '▶ 播放中' : '▶ 播放'}
              </button>
              <button
                className="history-export-btn"
                onClick={() => onExport(item)}
                title="导出为WAV"
              >
                ⬇
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HistoryPanel
