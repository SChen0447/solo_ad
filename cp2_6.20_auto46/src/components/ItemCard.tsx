import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Item } from '@/api'
import { Tag } from 'lucide-react'

interface Props {
  item: Item
  showActions?: boolean
  onEdit?: (item: Item) => void
  onDelete?: (item: Item) => void
  deleting?: boolean
}

const conditionColor: Record<string, string> = {
  '全新': '#22c55e',
  '几乎全新': '#16a34a',
  '轻微使用痕迹': '#f59e0b',
  '明显使用痕迹': '#ef4444'
}

export default function ItemCard({ item, showActions, onEdit, onDelete, deleting }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: deleting ? 0 : 1, y: deleting ? -20 : 0, scale: deleting ? 0.3 : 1, rotate: deleting ? 90 : 0 }}
      exit={{ opacity: 0, scale: 0.3, rotate: 90 }}
      transition={{ duration: 0.3 }}
      className={`item-card ${deleting ? 'card-deleting' : ''}`}
    >
      <Link to={`/item/${item.id}`} className="item-card-link">
        <div className="item-image-wrap">
          <img src={item.imageUrl} alt={item.title} loading="lazy" />
        </div>
        <div className="item-info">
          <div className="item-title">{item.title}</div>
          <div className="item-meta">
            <span className="condition-tag" style={{ backgroundColor: conditionColor[item.condition] + '22', color: conditionColor[item.condition], borderColor: conditionColor[item.condition] + '66' }}>
              <Tag size={10} />
              {item.condition}
            </span>
            <span className="item-owner">{item.ownerName}</span>
          </div>
        </div>
      </Link>
      {showActions && (
        <div className="card-actions">
          <button className="btn-edit" onClick={() => onEdit && onEdit(item)}>编辑</button>
          <button className="btn-delete" onClick={() => onDelete && onDelete(item)}>删除</button>
        </div>
      )}
    </motion.div>
  )
}
