import React from 'react'

export type BorderStyle = 'none' | 'white-rounded' | 'gray-dashed'
export type LayoutMode = 'compact' | 'loose'

interface ToolbarProps {
  backgroundColor: string
  onBackgroundColorChange: (color: string) => void
  borderStyle: BorderStyle
  onBorderStyleChange: (style: BorderStyle) => void
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
}

const PRESET_COLORS: string[] = [
  '#f3f4f6', '#ffffff', '#fef3c7', '#fce7f3',
  '#dbeafe', '#d1fae5', '#e9d5ff', '#fed7aa',
  '#fecaca', '#bae6fd', '#d9f99d', '#fde68a'
]

const BORDER_OPTIONS: { value: BorderStyle; label: string; preview: React.ReactNode }[] = [
  {
    value: 'none',
    label: '无边框',
    preview: <div style={{ width: 40, height: 40, background: '#cbd5e1', borderRadius: 4 }} />
  },
  {
    value: 'white-rounded',
    label: '白色圆角',
    preview: (
      <div
        style={{
          width: 40,
          height: 40,
          background: '#cbd5e1',
          borderRadius: 4,
          border: '2px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      />
    )
  },
  {
    value: 'gray-dashed',
    label: '灰色虚线',
    preview: (
      <div
        style={{
          width: 40,
          height: 40,
          background: '#cbd5e1',
          borderRadius: 4,
          border: '1px dashed #9ca3af'
        }}
      />
    )
  }
]

const Toolbar: React.FC<ToolbarProps> = ({
  backgroundColor,
  onBackgroundColorChange,
  borderStyle,
  onBorderStyleChange,
  layoutMode,
  onLayoutModeChange
}) => {
  return (
    <div
      style={{
        width: 240,
        padding: 20,
        background: '#ffffff',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        boxSizing: 'border-box',
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
        编辑工具栏
      </h3>

      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 12 }}>
          背景颜色
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onBackgroundColorChange(color)}
              title={color}
              style={{
                width: 28,
                height: 28,
                background: color,
                borderRadius: 6,
                border: backgroundColor === color ? '2px solid #3b82f6' : '1px solid #d1d5db',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.2s ease-out',
                outline: 'none',
                boxShadow: backgroundColor === color ? '0 0 0 3px rgba(59,130,246,0.2)' : 'none',
                transform: backgroundColor === color ? 'scale(1.1)' : 'scale(1)'
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 12 }}>
          边框样式
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BORDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onBorderStyleChange(option.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                border: borderStyle === option.value ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                background: borderStyle === option.value ? '#eff6ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                outline: 'none'
              }}
            >
              {option.preview}
              <span style={{ fontSize: 13, color: '#374151', fontWeight: borderStyle === option.value ? 600 : 400 }}>
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 12 }}>
          布局模式
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onLayoutModeChange('compact')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: layoutMode === 'compact' ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              background: layoutMode === 'compact' ? '#eff6ff' : '#ffffff',
              color: layoutMode === 'compact' ? '#2563eb' : '#374151',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
              outline: 'none'
            }}
          >
            紧凑模式
          </button>
          <button
            onClick={() => onLayoutModeChange('loose')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: layoutMode === 'loose' ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              background: layoutMode === 'loose' ? '#eff6ff' : '#ffffff',
              color: layoutMode === 'loose' ? '#2563eb' : '#374151',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease-out',
              outline: 'none'
            }}
          >
            宽松模式
          </button>
        </div>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 0 }}>
          {layoutMode === 'compact' ? '图片间距：8px' : '图片间距：20px'}
        </p>
      </div>
    </div>
  )
}

export default Toolbar
