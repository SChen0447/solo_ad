import { useMemo } from 'react'
import { FURNITURE_TYPE_LIST, FURNITURE_TEMPLATES, FurnitureType } from './types'
import { useAppStore } from './state'

interface FurnitureItemProps {
  type: FurnitureType
}

function FurnitureIcon({ type }: { type: FurnitureType }) {
  const template = FURNITURE_TEMPLATES[type]

  const renderIcon = () => {
    switch (type) {
      case 'sofa':
        return (
          <svg viewBox="0 0 48 48" className="furniture-icon-svg">
            <rect x="6" y="20" width="36" height="16" rx="3" fill={template.color} />
            <rect x="6" y="12" width="6" height="12" rx="2" fill={template.color} />
            <rect x="36" y="12" width="6" height="12" rx="2" fill={template.color} />
            <rect x="6" y="8" width="36" height="8" rx="2" fill={template.color} />
          </svg>
        )
      case 'table':
        return (
          <svg viewBox="0 0 48 48" className="furniture-icon-svg">
            <rect x="4" y="16" width="40" height="4" rx="1" fill={template.color} />
            <rect x="8" y="20" width="3" height="20" fill={template.color} />
            <rect x="37" y="20" width="3" height="20" fill={template.color} />
          </svg>
        )
      case 'chair':
        return (
          <svg viewBox="0 0 48 48" className="furniture-icon-svg">
            <rect x="12" y="22" width="24" height="4" rx="1" fill={template.color} />
            <rect x="12" y="8" width="4" height="18" rx="1" fill={template.color} />
            <rect x="32" y="8" width="4" height="18" rx="1" fill={template.color} />
            <rect x="14" y="26" width="3" height="14" fill={template.color} />
            <rect x="31" y="26" width="3" height="14" fill={template.color} />
          </svg>
        )
      case 'cabinet':
        return (
          <svg viewBox="0 0 48 48" className="furniture-icon-svg">
            <rect x="10" y="4" width="28" height="40" rx="2" fill={template.color} />
            <line x1="24" y1="8" x2="24" y2="40" stroke="#6B4423" strokeWidth="1" />
            <circle cx="20" cy="24" r="1.5" fill="#DAA520" />
            <circle cx="28" cy="24" r="1.5" fill="#DAA520" />
          </svg>
        )
      case 'bed':
        return (
          <svg viewBox="0 0 48 48" className="furniture-icon-svg">
            <rect x="4" y="24" width="40" height="16" rx="2" fill={template.color} />
            <rect x="6" y="20" width="36" height="6" rx="1" fill="#f5f5dc" />
            <rect x="4" y="14" width="8" height="14" rx="2" fill={template.color} />
          </svg>
        )
      case 'lamp':
        return (
          <svg viewBox="0 0 48 48" className="furniture-icon-svg">
            <ellipse cx="24" cy="42" rx="8" ry="2" fill="#4a4a4a" />
            <rect x="22" y="14" width="4" height="28" fill="#4a4a4a" />
            <path d="M12 14 L36 14 L30 4 L18 4 Z" fill={template.color} />
          </svg>
        )
      default:
        return null
    }
  }

  return renderIcon()
}

function FurnitureItem({ type }: FurnitureItemProps) {
  const template = FURNITURE_TEMPLATES[type]
  const setDragging = useAppStore((state) => state.setDragging)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('furniture-type', type)
    e.dataTransfer.effectAllowed = 'copy'
    setDragging(true)
  }

  const handleDragEnd = () => {
    setDragging(false)
  }

  return (
    <div
      className="furniture-item"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={template.name}
    >
      <div className="furniture-icon">
        <FurnitureIcon type={type} />
      </div>
      <span className="furniture-name">{template.name}</span>
    </div>
  )
}

export default function FurniturePanel() {
  const furnitureTypes = useMemo(() => FURNITURE_TYPE_LIST, [])

  return (
    <div className="furniture-panel">
      <div className="panel-header">
        <h3>家具库</h3>
      </div>
      <div className="furniture-grid">
        {furnitureTypes.map((type) => (
          <FurnitureItem key={type} type={type} />
        ))}
      </div>
      <div className="panel-tip">
        <p>拖拽家具到房间中放置</p>
        <p>Ctrl+拖拽移动家具</p>
      </div>
    </div>
  )
}
