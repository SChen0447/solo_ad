import { useState, useEffect, useRef } from 'react'
import { saveAs } from 'file-saver'
import { useEditorStore, ShapeType, renderShapesToSvg } from './store'

const TOOLS: { type: ShapeType | 'select'; icon: string; label: string }[] = [
  { type: 'select', icon: 'touch_app', label: '选择' },
  { type: 'rect', icon: 'check_box_outline_blank', label: '矩形' },
  { type: 'circle', icon: 'radio_button_unchecked', label: '圆形' },
  { type: 'ellipse', icon: 'panorama_fish_eye', label: '椭圆' },
  { type: 'polygon', icon: 'change_history', label: '多边形' },
  { type: 'line', icon: 'show_chart', label: '线条' },
  { type: 'path', icon: 'timeline', label: '路径' },
]

const PALETTE = [
  '#e53935',
  '#e91e63',
  '#9c27b0',
  '#673ab7',
  '#3f51b5',
  '#2196f3',
  '#00bcd4',
  '#009688',
  '#4caf50',
  '#ffc107',
  '#ff9800',
  '#795548',
]

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (c: string) => void
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [hex, setHex] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setHex(value), [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isValidHex = (s: string) => /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(s)

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 12, color: '#a0a0b8', width: 48 }}>{label}</span>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: '2px solid #3a3a4e',
          background: value,
          cursor: 'pointer',
          padding: 0,
        }}
      />
      {open && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            top: 44,
            left: 0,
            zIndex: 100,
            background: '#2a2a3e',
            padding: 12,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            width: 200,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 6,
              marginBottom: 10,
            }}
          >
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onChange(c)
                  setHex(c)
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  border: c === value ? '2px solid #fff' : '2px solid transparent',
                  background: c,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              style={{
                flex: 1,
                background: '#1e1e2e',
                border: '1px solid #3a3a4e',
                color: '#e0e0e0',
                padding: '6px 8px',
                borderRadius: 4,
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button
              disabled={!isValidHex(hex)}
              onClick={() => isValidHex(hex) && onChange(hex)}
              style={{
                padding: '6px 10px',
                background: isValidHex(hex) ? '#6c6cff' : '#3a3a4e',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: isValidHex(hex) ? 'pointer' : 'not-allowed',
                fontSize: 12,
              }}
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#a0a0b8', width: 56 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 100 }}
      />
      <span style={{ fontSize: 12, color: '#e0e0e0', width: 40 }}>
        {value}
        {unit ?? ''}
      </span>
    </div>
  )
}

export default function Toolbar() {
  const currentTool = useEditorStore((s) => s.currentTool)
  const setTool = useEditorStore((s) => s.setTool)
  const selectedId = useEditorStore((s) => s.selectedId)
  const shapes = useEditorStore((s) => s.shapes)
  const updateShape = useEditorStore((s) => s.updateShape)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const undoStack = useEditorStore((s) => s.undoStack)
  const redoStack = useEditorStore((s) => s.redoStack)
  const saveToLibrary = useEditorStore((s) => s.saveToLibrary)
  const library = useEditorStore((s) => s.library)
  const currentEditingIconId = useEditorStore((s) => s.currentEditingIconId)
  const pushUndo = useEditorStore((s) => s.pushUndo)

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [iconName, setIconName] = useState('')

  const selectedShape = shapes.find((s) => s.id === selectedId)

  const handleUpdate = (updates: Record<string, unknown>) => {
    if (!selectedId) return
    pushUndo()
    updateShape(selectedId, updates)
  }

  const handleExport = () => {
    const svgString = renderShapesToSvg(shapes, 800, 600)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    let filename = '未命名图标.svg'
    if (currentEditingIconId) {
      const icon = library.find((i) => i.id === currentEditingIconId)
      if (icon) filename = `${icon.name}.svg`
    }
    saveAs(blob, filename)
  }

  const handleSaveConfirm = () => {
    if (!iconName.trim()) return
    saveToLibrary(iconName.trim())
    setIconName('')
    setShowSaveDialog(false)
  }

  const IconBtn = ({
    icon,
    onClick,
    active,
    label,
    disabled,
  }: {
    icon: string
    onClick: () => void
    active?: boolean
    label: string
    disabled?: boolean
  }) => (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 40,
        height: 40,
        borderRadius: 24,
        border: 'none',
        background: active ? '#6c6cff' : 'transparent',
        color: disabled ? '#555' : active ? '#fff' : '#c0c0d8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !active) (e.currentTarget as HTMLButtonElement).style.background = '#3a3a4e'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      <span className="material-icons" style={{ fontSize: 22 }}>
        {icon}
      </span>
    </button>
  )

  return (
    <div
      style={{
        height: 64,
        background: '#252535',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        borderBottom: '1px solid #33334a',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <button
        onClick={() => {
          setShowSaveDialog(true)
          const icon = library.find((i) => i.id === currentEditingIconId)
          setIconName(icon?.name ?? '')
        }}
        style={{
          padding: '8px 16px',
          borderRadius: 24,
          border: 'none',
          background: '#6c6cff',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span className="material-icons" style={{ fontSize: 18 }}>
          save
        </span>
        保存到图标库
      </button>

      <button
        onClick={handleExport}
        style={{
          padding: '8px 16px',
          borderRadius: 24,
          border: '1px solid #3a3a4e',
          background: 'transparent',
          color: '#e0e0e0',
          cursor: 'pointer',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span className="material-icons" style={{ fontSize: 18 }}>
          download
        </span>
        导出 SVG
      </button>

      <div style={{ width: 1, height: 32, background: '#3a3a4e', margin: '0 4px' }} />

      {TOOLS.map((t) => (
        <IconBtn
          key={t.type}
          icon={t.icon}
          label={t.label}
          active={currentTool === t.type}
          onClick={() => setTool(t.type)}
        />
      ))}

      <div style={{ width: 1, height: 32, background: '#3a3a4e', margin: '0 4px' }} />

      <IconBtn icon="undo" label="撤销" disabled={undoStack.length === 0} onClick={undo} />
      <IconBtn icon="redo" label="重做" disabled={redoStack.length === 0} onClick={redo} />

      {selectedShape && (
        <>
          <div style={{ width: 1, height: 32, background: '#3a3a4e', margin: '0 4px' }} />
          <ColorPicker
            label="填充"
            value={selectedShape.fill}
            onChange={(c) => handleUpdate({ fill: c })}
          />
          <ColorPicker
            label="描边"
            value={selectedShape.stroke}
            onChange={(c) => handleUpdate({ stroke: c })}
          />
          <Slider
            label="描边宽"
            value={selectedShape.strokeWidth}
            min={0}
            max={10}
            unit="px"
            onChange={(v) => handleUpdate({ strokeWidth: v })}
          />
          <Slider
            label="旋转"
            value={selectedShape.rotation}
            min={0}
            max={360}
            unit="°"
            onChange={(v) => handleUpdate({ rotation: v })}
          />
          <Slider
            label="不透明"
            value={selectedShape.opacity}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => handleUpdate({ opacity: v })}
          />
        </>
      )}

      {showSaveDialog && (
        <div
          className="fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowSaveDialog(false)}
        >
          <div
            style={{
              background: '#2a2a3e',
              padding: 24,
              borderRadius: 12,
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              width: 360,
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#e0e0e0' }}>保存图标</h3>
            <input
              type="text"
              value={iconName}
              onChange={(e) => setIconName(e.target.value.slice(0, 20))}
              placeholder="输入图标名称（最多20字符）"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveConfirm()}
              style={{
                width: '100%',
                background: '#1e1e2e',
                border: '1px solid #3a3a4e',
                color: '#e0e0e0',
                padding: '10px 12px',
                borderRadius: 6,
                fontSize: 14,
                outline: 'none',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #3a3a4e',
                  background: 'transparent',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveConfirm}
                disabled={!iconName.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: iconName.trim() ? '#6c6cff' : '#3a3a4e',
                  color: '#fff',
                  cursor: iconName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
