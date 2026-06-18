import { useState, useEffect } from 'react'
import { useCanvasStore } from '../store'
import type { ToolType } from '../store'

interface ToolbarProps {
  onAddNote: () => void
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearCanvas: () => void
  imageInputRef: React.RefObject<HTMLInputElement>
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
const LINE_WIDTHS = [2, 5, 10]

export default function Toolbar({ onAddNote, onUploadImage, onClearCanvas, imageInputRef }: ToolbarProps) {
  const currentColor = useCanvasStore((s) => s.currentColor)
  const currentLineWidth = useCanvasStore((s) => s.currentLineWidth)
  const currentTool = useCanvasStore((s) => s.currentTool)
  const setColor = useCanvasStore((s) => s.setColor)
  const setLineWidth = useCanvasStore((s) => s.setLineWidth)
  const setTool = useCanvasStore((s) => s.setTool)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toolButtonStyle = (tool: ToolType) => ({
    background: currentTool === tool ? '#34495E' : 'transparent',
    width: 44,
    height: 44,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
    fontSize: 18,
    borderRadius: 6,
    transition: 'background 0.2s ease',
  })

  const transparentButtonStyle = {
    ...toolButtonStyle('pen' as ToolType),
    background: 'transparent',
  }

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: 60,
        background: '#2C3E50',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        zIndex: 100,
        overflowX: 'auto',
      }
    : {
        position: 'fixed',
        left: 0,
        top: 50,
        bottom: 0,
        width: 60,
        background: '#2C3E50',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 8,
        zIndex: 100,
      }

  const colorGroupStyle: React.CSSProperties = isMobile
    ? {
        display: 'flex',
        flexDirection: 'row',
        gap: 4,
        padding: '0 8px',
        borderLeft: '1px solid #34495E',
        borderRight: '1px solid #34495E',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 0',
        borderTop: '1px solid #34495E',
        borderBottom: '1px solid #34495E',
      }

  const widthGroupStyle: React.CSSProperties = isMobile
    ? {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 0',
      }

  const spacerStyle: React.CSSProperties = isMobile ? { display: 'none' } : { flex: 1 }

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        style={{ display: 'none' }}
        onChange={onUploadImage}
      />
      <div style={containerStyle}>
        <button
          onClick={() => setTool('pen')}
          style={toolButtonStyle('pen')}
          title="画笔"
        >
          ✏️
        </button>

        <div style={colorGroupStyle}>
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                setColor(color)
                setTool('pen')
              }}
              title={color}
              style={{
                width: 28,
                height: 28,
                background: color,
                border: currentColor === color ? '2px solid #fff' : '2px solid transparent',
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 0,
                transition: 'border-color 0.2s ease',
              }}
            />
          ))}
        </div>

        <div style={widthGroupStyle}>
          {LINE_WIDTHS.map((width) => (
            <button
              key={width}
              onClick={() => {
                setLineWidth(width)
                setTool('pen')
              }}
              title={`线宽 ${width}px`}
              style={{
                width: 36,
                height: 24,
                background: 'transparent',
                border: currentLineWidth === width ? '1px solid #fff' : '1px solid transparent',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.2s ease',
              }}
            >
              <div style={{
                width: 20,
                height: width,
                background: currentColor,
                borderRadius: width / 2,
              }} />
            </button>
          ))}
        </div>

        <button
          onClick={onAddNote}
          style={transparentButtonStyle}
          title="添加便签"
          onMouseEnter={(e) => (e.currentTarget.style.background = '#34495E')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          📝
        </button>

        <button
          onClick={() => imageInputRef.current?.click()}
          style={transparentButtonStyle}
          title="上传图片"
          onMouseEnter={(e) => (e.currentTarget.style.background = '#34495E')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          🖼️
        </button>

        <div style={spacerStyle} />

        <button
          onClick={onClearCanvas}
          style={transparentButtonStyle}
          title="清空画布"
          onMouseEnter={(e) => (e.currentTarget.style.background = '#34495E')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          🗑️
        </button>
      </div>
    </>
  )
}
