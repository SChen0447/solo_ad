import React, { useState, useRef, useCallback } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useStore, PaletteColor } from './store'
import { normalizeHex, isValidHex, getReadableTextColor, generateRandomColor } from './utils'

const PalettePanel: React.FC = () => {
  const {
    palette,
    addColor,
    editColor,
    deleteColor,
    reorderColors
  } = useStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [pickerColor, setPickerColor] = useState('#007BFF')
  const [pickerName, setPickerName] = useState('')
  const [addMode, setAddMode] = useState(false)
  const [newHexInput, setNewHexInput] = useState('')
  const [newNameInput, setNewNameInput] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressIndex = useRef<number | null>(null)
  const [draggingColor, setDraggingColor] = useState<PaletteColor | null>(null)
  const [isReorderMode, setIsReorderMode] = useState(false)

  const startEdit = (color: PaletteColor) => {
    setEditingId(color.id)
    setPickerColor(color.hex)
    setPickerName(color.name)
    setAddMode(false)
  }

  const saveEdit = () => {
    if (editingId && isValidHex(pickerColor)) {
      editColor(editingId, pickerColor, pickerName)
    }
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const openAddPicker = () => {
    setAddMode(true)
    setEditingId(null)
    const newColor = generateRandomColor()
    setPickerColor(newColor)
    setNewHexInput(newColor)
    setNewNameInput(`颜色 ${palette.length + 1}`)
  }

  const confirmAdd = () => {
    if (isValidHex(newHexInput) || isValidHex(pickerColor)) {
      const hex = isValidHex(newHexInput) ? normalizeHex(newHexInput) : pickerColor
      addColor(hex, newNameInput.trim() || undefined)
    }
    setAddMode(false)
    setNewHexInput('')
    setNewNameInput('')
  }

  const handlePickerColorChange = useCallback((color: string) => {
    const normalized = normalizeHex(color)
    setPickerColor(normalized)
    if (addMode) {
      setNewHexInput(normalized)
    }
  }, [addMode])

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (addMode) {
      setNewHexInput(val)
      if (isValidHex(val)) {
        setPickerColor(normalizeHex(val))
      }
    } else {
      if (isValidHex(val)) {
        setPickerColor(normalizeHex(val))
      }
    }
  }

  const onDragStart = (e: React.DragEvent, color: PaletteColor, index: number) => {
    setDraggingColor(color)
    setIsReorderMode(false)
    e.dataTransfer.effectAllowed = 'copyMove'
    e.dataTransfer.setData('text/plain', JSON.stringify({
      hex: color.hex,
      name: color.name,
      id: color.id
    }))

    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement
    dragImage.style.transform = 'scale(1.2)'
    dragImage.style.opacity = '0.9'
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 30, 30)
    setTimeout(() => document.body.removeChild(dragImage), 0)

    setDragIndex(index)
  }

  const onDragEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setDraggingColor(null)
    setDragIndex(null)
    setDragOverIndex(null)
    setIsReorderMode(false)
    longPressIndex.current = null
  }

  const onMouseDown = (_e: React.MouseEvent, index: number) => {
    longPressIndex.current = index
    longPressTimer.current = setTimeout(() => {
      setIsReorderMode(true)
      setDragIndex(index)
    }, 400)
  }

  const onMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressIndex.current = null
  }

  const onTouchStart = (_e: React.TouchEvent, index: number) => {
    longPressIndex.current = index
    longPressTimer.current = setTimeout(() => {
      setIsReorderMode(true)
      setDragIndex(index)
    }, 400)
  }

  const onTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    longPressIndex.current = null
  }

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (isReorderMode && dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const onDropReorder = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    if (isReorderMode && dragIndex !== null && dragIndex !== toIndex) {
      reorderColors(dragIndex, toIndex)
    }
    setDragIndex(null)
    setDragOverIndex(null)
    setIsReorderMode(false)
  }

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>🎨 调色板</h2>
        <button
          style={{
            ...styles.addButton,
            background: '#007BFF',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            transition: 'all 0.2s ease'
          }}
          onClick={openAddPicker}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#0056b3' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#007BFF' }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          + 添加颜色
        </button>
      </div>

      <div style={styles.paletteHint}>
        <span style={{ fontSize: '11px', color: '#6C757D' }}>
          💡 点击色块编辑 · 长按拖拽排序 · 直接拖到预览区应用
        </span>
      </div>

      {(addMode || editingId) && (
        <div style={styles.pickerContainer}>
          <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '13px', color: '#212529' }}>
            {addMode ? '添加新颜色' : '编辑颜色'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <HexColorPicker
              color={pickerColor}
              onChange={handlePickerColorChange}
              style={{ width: '100%', maxWidth: '220px' }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={styles.inputLabel}>颜色名称</label>
            <input
              type="text"
              value={addMode ? newNameInput : pickerName}
              onChange={(e) => {
                if (addMode) setNewNameInput(e.target.value)
                else setPickerName(e.target.value)
              }}
              style={styles.textInput}
              placeholder="输入颜色名称"
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={styles.inputLabel}>十六进制值</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={addMode ? newHexInput : pickerColor}
                onChange={handleHexInputChange}
                style={{ ...styles.textInput, textTransform: 'uppercase' }}
                placeholder="#FFFFFF"
              />
              <div
                style={{
                  width: '40px',
                  height: '36px',
                  borderRadius: '6px',
                  background: isValidHex(addMode ? newHexInput : pickerColor)
                    ? (addMode ? (isValidHex(newHexInput) ? normalizeHex(newHexInput) : pickerColor) : pickerColor)
                    : '#EEE',
                  border: '1px solid #DEE2E6',
                  flexShrink: 0
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={addMode ? confirmAdd : saveEdit}
              style={{
                ...styles.actionBtn,
                flex: 1,
                background: '#28A745',
                color: '#fff'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#1e7e34' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#28A745' }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              ✓ 确认
            </button>
            <button
              onClick={() => {
                if (addMode) setAddMode(false)
                else cancelEdit()
              }}
              style={{
                ...styles.actionBtn,
                background: '#E9ECEF',
                color: '#495057'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#DEE2E6' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#E9ECEF' }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div style={styles.colorGrid}>
        {palette.map((color, index) => {
          const textColor = getReadableTextColor(color.hex)
          const isDragging = dragIndex === index
          const isDropTarget = dragOverIndex === index && isReorderMode

          return (
            <div
              key={color.id}
              draggable
              onDragStart={(e) => onDragStart(e, color, index)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => onDragOver(e, index)}
              onDrop={(e) => onDropReorder(e, index)}
              onMouseDown={(e) => onMouseDown(e, index)}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={(e) => onTouchStart(e, index)}
              onTouchEnd={onTouchEnd}
              onClick={(e) => {
                if (!isReorderMode && longPressIndex.current === null) {
                  startEdit(color)
                }
                e.preventDefault()
              }}
              style={{
                ...styles.colorCard,
                opacity: isDragging && !isReorderMode ? 0.5 : 1,
                transform: isDragging && isReorderMode ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isDragging && !isReorderMode
                  ? '0 8px 16px rgba(0,0,0,0.2)'
                  : (isDropTarget ? '0 0 0 2px #007BFF' : '0 1px 3px rgba(0,0,0,0.1)'),
                border: editingId === color.id ? '2px solid #007BFF' : '1px solid rgba(0,0,0,0.08)',
                transition: 'all 0.2s ease',
                cursor: isReorderMode ? 'grabbing' : 'grab'
              }}
            >
              <div
                style={{
                  ...styles.colorSwatch,
                  background: color.hex,
                  color: textColor
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px' }}>
                  {color.hex}
                </span>
              </div>
              <div style={styles.colorInfo}>
                <div style={styles.colorName} title={color.name}>
                  {color.name}
                </div>
                <div style={styles.colorHex}>{color.hex}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (palette.length > 1) deleteColor(color.id)
                }}
                style={styles.deleteBtn}
                title="删除颜色"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(220, 53, 69, 0.9)'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
                  e.currentTarget.style.color = '#6C757D'
                }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      <div style={styles.countBadge}>
        共 {palette.length} 种颜色
      </div>
    </aside>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '280px',
    minWidth: '280px',
    background: '#F8F9FA',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    borderRight: '1px solid #DEE2E6'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #DEE2E6',
    background: '#fff'
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#212529',
    margin: 0
  },
  addButton: {
    fontWeight: 500
  },
  paletteHint: {
    padding: '8px 16px',
    background: '#F8F9FA',
    borderBottom: '1px solid #E9ECEF'
  },
  pickerContainer: {
    padding: '14px 16px',
    background: '#fff',
    borderBottom: '1px solid #DEE2E6'
  },
  inputLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#6C757D',
    marginBottom: '4px',
    fontWeight: 500
  },
  textInput: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #DEE2E6',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
    background: '#fff'
  },
  actionBtn: {
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  colorGrid: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 12px 12px 12px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    alignContent: 'start'
  },
  colorCard: {
    position: 'relative',
    background: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    userSelect: 'none'
  },
  colorSwatch: {
    width: '100%',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease-in-out'
  },
  colorInfo: {
    padding: '6px 8px 8px'
  },
  colorName: {
    fontSize: '12px',
    color: '#212529',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  colorHex: {
    fontSize: '12px',
    color: '#6C757D',
    fontFamily: 'monospace',
    marginTop: '1px'
  },
  deleteBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    fontSize: '14px',
    lineHeight: '18px',
    color: '#6C757D',
    background: 'rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease'
  },
  countBadge: {
    padding: '10px 16px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#6C757D',
    background: '#fff',
    borderTop: '1px solid #DEE2E6'
  }
}

export default PalettePanel
