import { useState } from 'react'
import type { Board, Card } from '../types'

const PRESET_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db',
  '#9b59b6', '#8e44ad', '#ec407a', '#533483', '#00bcd4', '#ff5722',
]

interface Props {
  boards: Board[]
  onEnter: (id: string) => void
  onCreate: (name: string, themeColor: string) => void
}

function renderThumbSlot(card: Card, idx: number) {
  if (card.type === 'color') {
    const c = card.content as { color: string; name: string }
    return (
      <div key={idx} className="thumb-slot" style={{ background: c.color }} />
    )
  }
  if (card.type === 'image') {
    const c = card.content as { url: string }
    return (
      <div key={idx} className="thumb-slot" style={{ padding: 0 }}>
        {c.url && (
          <img
            src={c.url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
      </div>
    )
  }
  const c = card.content as { title: string }
  return (
    <div key={idx} className="thumb-slot" style={{ color: '#a0a0b0', padding: 4 }}>
      {c.title?.slice(0, 6) || '文字'}
    </div>
  )
}

export default function BoardList({ boards, onEnter, onCreate }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [themeColor, setThemeColor] = useState(PRESET_COLORS[9])

  const handleSubmit = () => {
    if (!name.trim()) return
    onCreate(name.trim(), themeColor)
    setShowModal(false)
    setName('')
    setThemeColor(PRESET_COLORS[9])
  }

  return (
    <div className="board-view">
      <div className="board-view-header">
        <h1 className="board-view-title">我的画板</h1>
        <button className="btn" onClick={() => setShowModal(true)}>
          <svg className="icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建画板
        </button>
      </div>

      <div className="board-grid">
        {boards.map(b => (
          <div
            key={b.id}
            className="board-card"
            onClick={() => onEnter(b.id)}
            style={{
              borderColor: b.themeColor,
              boxShadow: `0 4px 20px ${b.themeColor}33, 0 0 0 1px ${b.themeColor}55`,
            }}
          >
            <div className="board-card-thumb">
              {[0, 1, 2, 3, 4, 5].map(i =>
                b.cards[i]
                  ? renderThumbSlot(b.cards[i], i)
                  : <div key={i} className="thumb-slot" />
              )}
            </div>
            <div className="board-card-name">{b.name}</div>
            <div className="board-card-meta">
              <span>{b.cards.length} 张卡片</span>
              <span>{new Date(b.updatedAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        ))}

        <div className="board-card-add" onClick={() => setShowModal(true)}>
          <div>＋</div>
          <span>新建画板</span>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2 className="modal-title">创建新画板</h2>

            <div className="form-group">
              <label className="form-label">画板名称</label>
              <input
                className="form-input"
                placeholder="输入画板名称..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">主题色</label>
              <div className="color-picker-ring">
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-dot ${c === themeColor ? 'selected' : ''}`}
                    style={{ background: c, color: c }}
                    onClick={() => setThemeColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn" onClick={handleSubmit} disabled={!name.trim()}>
                创建并进入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
