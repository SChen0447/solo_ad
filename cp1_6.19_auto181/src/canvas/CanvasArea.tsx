import { useRef, useEffect, useState, useCallback } from 'react'
import {
  createCanvasDrawer,
  drawStroke,
  undoStroke,
  clearCanvas,
  renderStrokes,
  Stroke,
  StrokePoint,
  CanvasDrawerState,
} from './CanvasDrawer'
import './CanvasArea.css'

interface CanvasAreaProps {
  width?: number
  height?: number
  onGenerate: () => void
  canvasRef: React.RefObject<HTMLCanvasElement>
}

const COLORS = ['#000000', '#4A90D9', '#FF6B6B', '#4CAF50']
const LINE_WIDTHS = [2, 4, 6, 8]

export default function CanvasArea({
  width = 800,
  height = 600,
  onGenerate,
  canvasRef,
}: CanvasAreaProps) {
  const localCanvasRef = useRef<HTMLCanvasElement>(null)
  const [drawerState, setDrawerState] = useState<CanvasDrawerState>(
    createCanvasDrawer()
  )
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedLineWidth, setSelectedLineWidth] = useState(4)
  const [showCopied, setShowCopied] = useState(false)

  const canvasElementRef = canvasRef as React.RefObject<HTMLCanvasElement> || localCanvasRef

  useEffect(() => {
    const canvas = canvasElementRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    renderStrokes(ctx, drawerState.strokes, width, height)
  }, [drawerState, width, height, canvasElementRef])

  useEffect(() => {
    if (isDrawing && currentStroke) {
      const canvas = canvasElementRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      renderStrokes(ctx, drawerState.strokes, width, height)
      if (currentStroke.points.length >= 2) {
        ctx.strokeStyle = currentStroke.color
        ctx.lineWidth = currentStroke.lineWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y)
        for (let i = 1; i < currentStroke.points.length; i++) {
          ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y)
        }
        ctx.stroke()
      }
    }
  }, [currentStroke, isDrawing, drawerState.strokes, width, height, canvasElementRef])

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): StrokePoint => {
      const canvas = canvasElementRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    },
    [canvasElementRef]
  )

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e)
    const stroke: Stroke = {
      points: [point],
      color: selectedColor,
      lineWidth: selectedLineWidth,
    }
    setIsDrawing(true)
    setCurrentStroke(stroke)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return
    const point = getCanvasPoint(e)
    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, point],
    })
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentStroke) return
    if (currentStroke.points.length >= 2) {
      setDrawerState((prev) => drawStroke(prev, currentStroke))
    }
    setIsDrawing(false)
    setCurrentStroke(null)
  }

  const handleMouseLeave = () => {
    if (!isDrawing || !currentStroke) return
    if (currentStroke.points.length >= 2) {
      setDrawerState((prev) => drawStroke(prev, currentStroke))
    }
    setIsDrawing(false)
    setCurrentStroke(null)
  }

  const handleUndo = () => {
    setDrawerState((prev) => undoStroke(prev))
  }

  const handleClear = () => {
    setDrawerState((prev) => clearCanvas(prev))
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCopy = async () => {
    const canvas = canvasElementRef.current
    if (!canvas) return
    try {
      await navigator.clipboard.writeText('')
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  return (
    <div className="canvas-area">
      <div className="canvas-toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">颜色</span>
        <div className="color-options">
          {COLORS.map((color) => (
            <button
              key={color}
              className={`color-btn ${selectedColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              title={`颜色 ${color}`}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-label">粗细</span>
        <div className="width-options">
          {LINE_WIDTHS.map((lw) => (
            <button
              key={lw}
              className={`width-btn ${selectedLineWidth === lw ? 'active' : ''}`}
              onClick={() => setSelectedLineWidth(lw)}
              title={`粗细 ${lw}px`}
            >
              {lw}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-actions">
        <button
          className="tool-btn"
          onClick={handleUndo}
          title="撤销 (Ctrl+Z)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
          撤销
        </button>

        <button
          className="tool-btn"
          onClick={handleClear}
          title="清空画布"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          清空
        </button>

        <button
          className="tool-btn generate-btn"
          onClick={onGenerate}
          title="生成代码"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          生成代码
        </button>
      </div>
    </div>

    <div className="canvas-wrapper">
      <canvas
        ref={canvasElementRef}
        width={width}
        height={height}
        className="sketch-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {showCopied && (
        <div className="copy-toast">已复制到剪贴板</div>
      )}
    </div>
  </div>
  )
}
