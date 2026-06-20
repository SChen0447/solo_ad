import { useState, useRef, useEffect, useCallback } from 'react'
import CoffeeCup from './CoffeeCup'
import DrawingControls from './DrawingControls'

export interface StrokePoint {
  x: number
  y: number
}

export interface Stroke {
  points: StrokePoint[]
  color: string
  size: number
  timestamp: number
  isSpreading?: boolean
  spreadProgress?: number
  easeInProgress?: number
}

const PRESET_COLORS = ['#ffffff', '#fff8dc', '#d4a574', '#8b4513']
const BRUSH_SIZES = [2, 6, 12]
const MAX_UNDO_STEPS = 15

function App() {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [selectedColor, setSelectedColor] = useState<string>('#ffffff')
  const [brushSize, setBrushSize] = useState<number>(6)
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#8b6914'
      ctx.beginPath()
      ctx.arc(256, 256, 240, 0, Math.PI * 2)
      ctx.fill()
    }
    textureCanvasRef.current = canvas
  }, [])

  const addStroke = useCallback((stroke: Stroke) => {
    setStrokes((prev) => {
      const newStrokes = [...prev, stroke]
      if (newStrokes.length > MAX_UNDO_STEPS) {
        return newStrokes.slice(newStrokes.length - MAX_UNDO_STEPS)
      }
      return newStrokes
    })
  }, [])

  const updateLastStroke = useCallback((point: StrokePoint) => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev
      const newStrokes = [...prev]
      const lastStroke = { ...newStrokes[newStrokes.length - 1] }
      lastStroke.points = [...lastStroke.points, point]
      newStrokes[newStrokes.length - 1] = lastStroke
      return newStrokes
    })
  }, [])

  const finishLastStroke = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev
      const newStrokes = [...prev]
      const lastStroke = { ...newStrokes[newStrokes.length - 1] }
      lastStroke.isSpreading = true
      lastStroke.spreadProgress = 0
      newStrokes[newStrokes.length - 1] = lastStroke
      return newStrokes
    })
  }, [])

  const undo = useCallback(() => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev
      return prev.slice(0, prev.length - 1)
    })
  }, [])

  const undoCount = Math.min(strokes.length, MAX_UNDO_STEPS)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo])

  const saveScreenshot = useCallback(() => {
    if (!textureCanvasRef.current) return

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = 1280
    exportCanvas.height = 720
    const ctx = exportCanvas.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, 0, 720)
    gradient.addColorStop(0, '#2c1810')
    gradient.addColorStop(1, '#8b4513')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1280, 720)

    const cupX = 640
    const cupY = 380
    const cupRadius = 220

    ctx.fillStyle = '#f5e6d3'
    ctx.beginPath()
    ctx.ellipse(cupX, cupY + 60, cupRadius, cupRadius * 0.28, 0, 0, Math.PI * 2)
    ctx.fill()

    const cupGradient = ctx.createLinearGradient(cupX - cupRadius, cupY - 120, cupX + cupRadius, cupY + 60)
    cupGradient.addColorStop(0, '#e8d5c4')
    cupGradient.addColorStop(0.3, '#f5e6d3')
    cupGradient.addColorStop(0.7, '#f5e6d3')
    cupGradient.addColorStop(1, '#dcc9b8')
    ctx.fillStyle = cupGradient
    ctx.beginPath()
    ctx.moveTo(cupX - cupRadius, cupY + 60)
    ctx.lineTo(cupX - cupRadius + 25, cupY - 100)
    ctx.quadraticCurveTo(cupX, cupY - 160, cupX + cupRadius - 25, cupY - 100)
    ctx.lineTo(cupX + cupRadius, cupY + 60)
    ctx.fill()

    ctx.fillStyle = '#f5e6d3'
    ctx.beginPath()
    ctx.ellipse(cupX, cupY - 90, cupRadius * 0.88, cupRadius * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#8b6914'
    ctx.beginPath()
    ctx.ellipse(cupX, cupY - 85, cupRadius * 0.82, cupRadius * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()

    if (textureCanvasRef.current) {
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cupX, cupY - 85, cupRadius * 0.82, cupRadius * 0.2, 0, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(
        textureCanvasRef.current,
        cupX - cupRadius * 0.82,
        cupY - 85 - cupRadius * 0.1,
        cupRadius * 1.64,
        cupRadius * 0.2
      )
      ctx.restore()
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(cupX, cupY - 90, cupRadius * 0.88, cupRadius * 0.22, 0, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.ellipse(cupX - 60, cupY - 50, 20, 50, -0.3, 0, Math.PI * 2)
    ctx.fill()

    const handleGradient = ctx.createLinearGradient(cupX + cupRadius - 10, cupY - 40, cupX + cupRadius + 80, cupY + 20)
    handleGradient.addColorStop(0, '#f5e6d3')
    handleGradient.addColorStop(1, '#e0d0c0')
    ctx.fillStyle = handleGradient
    ctx.beginPath()
    ctx.ellipse(cupX + cupRadius + 30, cupY - 10, 50, 25, 0.2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = 'rgba(139, 69, 19, 0.3)'
    ctx.beginPath()
    ctx.ellipse(cupX, cupY + 65, cupRadius * 1.1, cupRadius * 0.15, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = '12px Arial'
    ctx.fillStyle = 'rgba(136, 136, 136, 0.8)'
    const now = new Date()
    const timestamp = now.toLocaleString('zh-CN')
    const textWidth = ctx.measureText(timestamp).width
    ctx.fillText(timestamp, 1280 - textWidth - 20, 30)

    const link = document.createElement('a')
    link.download = `coffee-latte-art-${Date.now()}.png`
    link.href = exportCanvas.toDataURL('image/png')
    link.click()
  }, [])

  return (
    <div style={styles.appContainer}>
      <div style={styles.previewArea}>
        <CoffeeCup
          strokes={strokes}
          selectedColor={selectedColor}
          brushSize={brushSize}
          onStrokeStart={addStroke}
          onStrokeMove={updateLastStroke}
          onStrokeEnd={finishLastStroke}
          textureCanvasRef={textureCanvasRef}
        />
      </div>
      <div style={styles.controlPanel}>
        <DrawingControls
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          presetColors={PRESET_COLORS}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          brushSizes={BRUSH_SIZES}
          undoCount={undoCount}
          onUndo={undo}
          onSave={saveScreenshot}
        />
      </div>
    </div>
  )
}

const styles = {
  appContainer: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: 'linear-gradient(135deg, #2c1810 0%, #5c3317 50%, #8b4513 100%)',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  } as React.CSSProperties,
  previewArea: {
    width: '70%',
    height: '100%',
    position: 'relative' as const,
  },
  controlPanel: {
    width: '30%',
    minWidth: '320px',
    height: '100%',
    padding: '24px',
    boxSizing: 'border-box' as const,
    background: 'rgba(62, 39, 35, 0.65)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
    overflowY: 'auto' as const,
  },
}

export default App
