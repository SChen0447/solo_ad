import React, { useState } from 'react'
import type { GameElement } from '../types'

interface LayerPanelProps {
  elements: GameElement[]
  selectedId: string | null
  onSelect: (id: string) => void
  onReorder: (ids: string[]) => void
  onDelete: (id: string) => void
  onAddElement: (type: 'rect' | 'circle' | 'text') => void
  disabled?: boolean
}

const LayerPanel: React.FC<LayerPanelProps> = ({
  elements,
  selectedId,
  onSelect,
  onReorder,
  onDelete,
  onAddElement,
  disabled
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (disabled) return
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (disabled || !draggingId || draggingId === id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (disabled || !draggingId || draggingId === targetId) return
    e.preventDefault()
    const ids = elements.map(el => el.id)
    const fromIdx = ids.indexOf(draggingId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx !== -1 && toIdx !== -1) {
      const newIds = [...ids]
      newIds.splice(fromIdx, 1)
      newIds.splice(toIdx, 0, draggingId)
      onReorder(newIds)
    }
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rect': return '▢'
      case 'circle': return '●'
      case 'text': return 'T'
      default: return '□'
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>图层</span>
      </div>

      <div style={styles.toolbar}>
        <button
          style={styles.addBtn}
          onClick={() => onAddElement('rect')}
          disabled={disabled}
          title="添加矩形"
        >
          ▢ 矩形
        </button>
        <button
          style={styles.addBtn}
          onClick={() => onAddElement('circle')}
          disabled={disabled}
          title="添加圆形"
        >
          ● 圆形
        </button>
        <button
          style={styles.addBtn}
          onClick={() => onAddElement('text')}
          disabled={disabled}
          title="添加文字"
        >
          T 文字
        </button>
      </div>

      <div style={styles.list}>
        {[...elements].reverse().map((el) => {
          const isSelected = el.id === selectedId
          const isDragging = draggingId === el.id
          const isDragOver = dragOverId === el.id

          return (
            <div
              key={el.id}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, el.id)}
              onDragOver={(e) => handleDragOver(e, el.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, el.id)}
              onDragEnd={handleDragEnd}
              onClick={() => !disabled && onSelect(el.id)}
              style={{
                ...styles.item,
                background: isSelected ? '#4A90D9' : '#2A2A2A',
                transform: isDragging ? 'translate(8px, 0)' : 'none',
                boxShadow: isDragging
                  ? '0 4px 12px rgba(255,255,255,0.15)'
                  : isDragOver
                  ? 'inset 0 0 0 2px #4A90D9'
                  : 'none',
                transition: 'all 0.15s ease',
                opacity: isDragging ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
            >
              <span style={styles.itemIcon}>{getTypeIcon(el.type)}</span>
              <span style={styles.itemName}>{el.name}</span>
              <button
                style={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!disabled) onDelete(el.id)
                }}
                disabled={disabled}
                title="删除"
              >
                ✕
              </button>
            </div>
          )
        })}
        {elements.length === 0 && (
          <div style={styles.empty}>
            暂无图层<br />点击上方按钮添加
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    background: '#1E1E1E',
    display: 'flex',
    flexDirection: 'column',
    color: '#fff',
    overflow: 'hidden'
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #2A2A2A'
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff'
  },
  toolbar: {
    padding: '12px',
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap'
  },
  addBtn: {
    flex: 1,
    minWidth: '70px',
    padding: '6px 8px',
    background: '#3A3A3A',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background 0.15s'
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 12px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '4px',
    marginBottom: '6px',
    userSelect: 'none'
  },
  itemIcon: {
    fontSize: '14px',
    width: '20px',
    textAlign: 'center',
    opacity: 0.9
  },
  itemName: {
    flex: 1,
    fontSize: '13px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  deleteBtn: {
    background: 'transparent',
    color: '#aaa',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 6px',
    borderRadius: '3px'
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    fontSize: '13px',
    padding: '40px 16px',
    lineHeight: 1.8
  }
}

export default LayerPanel
