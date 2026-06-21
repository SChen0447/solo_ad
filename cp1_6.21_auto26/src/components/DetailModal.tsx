import { Pencil, Trash2, X } from 'lucide-react'
import type { MediaItem } from '../types'
import { Stars } from './Stars'
import { TagChips } from './TagChips'
import { TypeBadge } from './TypeBadge'

interface Props {
  open: boolean
  item: MediaItem | null
  onClose: () => void
  onEdit: (item: MediaItem) => void
  onDelete: (item: MediaItem) => void
}

const TYPE_LABEL: Record<string, string> = {
  book: '书籍', movie: '电影', music: '音乐'
}

function formatAdded(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function DetailModal({ open, item, onClose, onEdit, onDelete }: Props) {
  if (!open || !item) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">收藏详情</h3>
          <button type="button" className="modal-close" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="detail-cover">
            <img
              src={item.coverUrl}
              alt={item.title}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 22, color: 'var(--primary-dark)' }}>{item.title}</h2>
            <TypeBadge type={item.type} variant="pill" />
          </div>

          <div className="detail-section">
            <div className="detail-label">创作者</div>
            <div className="detail-value">{item.creator}</div>
            <div className="detail-label">年份</div>
            <div className="detail-value">{item.year}</div>
            <div className="detail-label">媒体类型</div>
            <div className="detail-value">{TYPE_LABEL[item.type]}</div>
            <div className="detail-label">个人评分</div>
            <div className="detail-value">
              <Stars value={item.rating} size="md" />
              <span style={{ marginLeft: 8, color: 'var(--text-muted)', fontSize: 12 }}>{item.rating} / 5</span>
            </div>
            <div className="detail-label">添加时间</div>
            <div className="detail-value" style={{ fontSize: 13 }}>{formatAdded(item.createdAt)}</div>
            <div className="detail-label">标签</div>
            <div className="detail-value">
              {item.tags.length ? (
                <TagChips tags={item.tags} size="md" />
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>暂无标签</span>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onDelete(item)}
          >
            <Trash2 size={16} /> 删除
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>关闭</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onEdit(item)}
            >
              <Pencil size={16} /> 编辑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
