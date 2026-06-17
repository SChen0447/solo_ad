import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { Stroke, StrokePoint } from './Analyzer'
import { analyzeStrokes } from './Analyzer'
import type { EmotionResult } from './EmotionMapper'
import { mapEmotion } from './EmotionMapper'
import { ParticleEngine } from './ParticleEngine'

export interface CanvasBoardHandle {
  clear: () => void
  save: () => void
}

interface CanvasBoardProps {
  onEmotionChange: (emotion: EmotionResult | null) => void
  onStrokesChange: (strokes: Stroke[]) => void
}

interface PendingPoint {
  x: number
  y: number
  pressure: number
  timestamp: number
}

const STROKE_COLOR = '#2b2b44'
const MIN_WIDTH = 2
const MAX_WIDTH = 6
const IDLE_DELAY = 1500
const MAX_POINTS_PER_FRAME = 10

export const CanvasBoard = forwardRef<CanvasBoardHandle, CanvasBoardProps>(function CanvasBoard(
  { onEmotionChange, onStrokesChange },
  ref
) {
  const boardContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particleCanvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const particleEngineRef = useRef<ParticleEngine | null>(null)

  const isDrawingRef = useRef(false)
  const strokesRef = useRef<Stroke[]>([])
  const currentStrokeRef = useRef<Stroke | null>(null)
  const lastDrawnPointRef = useRef<StrokePoint | null>(null)
  const pendingPointsRef = useRef<PendingPoint[]>([])
  const animationFrameRef = useRef<number | null>(null)

  const idleTimerRef = useRef<number | null>(null)
  const haloTimeoutsRef = useRef<number[]>([])

  const getCanvasCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1),
      y: (clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1)
    }
  }, [])

  const pressureToWidth = useCallback((pressure: number): number => {
    const p = Math.max(0, Math.min(1, pressure))
    return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * p
  }, [])

  const drawBackgroundGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#fafafa'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = '#d0d0d0'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])

    for (let x = 0; x <= width; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(width, y + 0.5)
      ctx.stroke()
    }

    ctx.setLineDash([])
  }, [])

  const redrawAllStrokes = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const cssWidth = rect.width
    const cssHeight = rect.height

    drawBackgroundGrid(ctx, cssWidth, cssHeight)

    ctx.strokeStyle = STROKE_COLOR
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 2) continue
      for (let i = 1; i < stroke.points.length; i++) {
        const p1 = stroke.points[i - 1]
        const p2 = stroke.points[i]
        const avgPressure = (p1.pressure + p2.pressure) / 2
        ctx.beginPath()
        ctx.lineWidth = pressureToWidth(avgPressure)
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }
    }
  }, [drawBackgroundGrid, pressureToWidth])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !boardContainerRef.current) return
    const container = boardContainerRef.current
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctxRef.current = ctx
    }

    redrawAllStrokes()

    if (particleEngineRef.current) {
      particleEngineRef.current.resize()
    }
  }, [redrawAllStrokes])

  const triggerHalo = useCallback(() => {
    const container = boardContainerRef.current
    if (!container) return
    container.classList.add('halo-active')
    const timeout = window.setTimeout(() => {
      container.classList.remove('halo-active')
    }, 600)
    haloTimeoutsRef.current.push(timeout)
  }, [])

  const processPendingPoints = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    const pointsToProcess = pendingPointsRef.current.splice(0, MAX_POINTS_PER_FRAME)

    for (const point of pointsToProcess) {
      const strokePoint: StrokePoint = {
        x: point.x,
        y: point.y,
        pressure: point.pressure,
        timestamp: point.timestamp
      }

      if (currentStrokeRef.current) {
        currentStrokeRef.current.points.push(strokePoint)

        const lastPoint = lastDrawnPointRef.current
        if (lastPoint) {
          ctx.strokeStyle = STROKE_COLOR
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          const avgPressure = (lastPoint.pressure + strokePoint.pressure) / 2
          ctx.beginPath()
          ctx.lineWidth = pressureToWidth(avgPressure)
          ctx.moveTo(lastPoint.x, lastPoint.y)
          ctx.lineTo(strokePoint.x, strokePoint.y)
          ctx.stroke()
        }
        lastDrawnPointRef.current = strokePoint
      }
    }

    if (pendingPointsRef.current.length > 0) {
      animationFrameRef.current = requestAnimationFrame(processPendingPoints)
    } else {
      animationFrameRef.current = null
    }
  }, [pressureToWidth])

  const queuePoint = useCallback((x: number, y: number, pressure: number) => {
    pendingPointsRef.current.push({
      x,
      y,
      pressure,
      timestamp: performance.now()
    })
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(processPendingPoints)
    }
  }, [processPendingPoints])

  const flushPendingPoints = useCallback(() => {
    while (pendingPointsRef.current.length > 0) {
      processPendingPoints()
    }
  }, [processPendingPoints])

  const performAnalysis = useCallback(() => {
    flushPendingPoints()

    if (strokesRef.current.length === 0) return

    const features = analyzeStrokes(strokesRef.current)
    const emotion = mapEmotion(features)

    onEmotionChange(emotion)

    const validStrokes = strokesRef.current.filter(s => s.points.length > 0)
    if (validStrokes.length > 0 && particleEngineRef.current) {
      particleEngineRef.current.trigger(validStrokes, emotion)
    }
  }, [flushPendingPoints, onEmotionChange])

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    idleTimerRef.current = window.setTimeout(() => {
      performAnalysis()
    }, IDLE_DELAY)
  }, [performAnalysis])

  const startDrawing = useCallback((x: number, y: number, pressure: number) => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }

    isDrawingRef.current = true
    triggerHalo()

    currentStrokeRef.current = {
      points: [{ x, y, pressure, timestamp: performance.now() }]
    }
    lastDrawnPointRef.current = currentStrokeRef.current.points[0]
    strokesRef.current.push(currentStrokeRef.current)

    queuePoint(x, y, pressure)
    onStrokesChange([...strokesRef.current])
  }, [triggerHalo, queuePoint, onStrokesChange])

  const continueDrawing = useCallback((x: number, y: number, pressure: number) => {
    if (!isDrawingRef.current) return
    queuePoint(x, y, pressure)
  }, [queuePoint])

  const endDrawing = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    currentStrokeRef.current = null
    lastDrawnPointRef.current = null

    flushPendingPoints()
    onStrokesChange([...strokesRef.current])
    resetIdleTimer()
  }, [flushPendingPoints, onStrokesChange, resetIdleTimer])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    ;(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
    const { x, y } = getCanvasCoords(e.clientX, e.clientY)
    startDrawing(x, y, e.pressure > 0 ? e.pressure : 0.5)
  }, [getCanvasCoords, startDrawing])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const { x, y } = getCanvasCoords(e.clientX, e.clientY)
    continueDrawing(x, y, e.pressure > 0 ? e.pressure : 0.5)
  }, [getCanvasCoords, continueDrawing])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    try { (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId) } catch {}
    endDrawing()
  }, [endDrawing])

  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      handlePointerUp(e)
    }
  }, [handlePointerUp])

  const clearBoard = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    strokesRef.current = []
    currentStrokeRef.current = null
    lastDrawnPointRef.current = null
    pendingPointsRef.current = []
    onEmotionChange(null)
    onStrokesChange([])
    if (particleEngineRef.current) {
      particleEngineRef.current.stop()
    }
    redrawAllStrokes()
  }, [onEmotionChange, onStrokesChange, redrawAllStrokes])

  const saveBoard = useCallback(() => {
    flushPendingPoints()
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `handwriting-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [flushPendingPoints])

  useImperativeHandle(ref, () => ({
    clear: clearBoard,
    save: saveBoard
  }), [clearBoard, saveBoard])

  useEffect(() => {
    particleEngineRef.current = new ParticleEngine()
    if (particleCanvasRef.current) {
      particleEngineRef.current.attach(particleCanvasRef.current)
    }
    resizeCanvas()

    const handleResize = () => resizeCanvas()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      for (const t of haloTimeoutsRef.current) {
        clearTimeout(t)
      }
      if (particleEngineRef.current) {
        particleEngineRef.current.destroy()
        particleEngineRef.current = null
      }
    }
  }, [resizeCanvas])

  return (
    <div
      ref={boardContainerRef}
      className="board-container"
      style={{
        position: 'relative',
        width: '60%',
        margin: '0 auto',
        aspectRatio: '16 / 10',
        minHeight: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}
    >
      <style>{`
        .board-container::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 12px;
          pointer-events: none;
          box-shadow: inset 0 0 50px 0 rgba(108, 99, 255, 0);
          transition: box-shadow 0.6s ease-out;
          z-index: 10;
        }
        .board-container.halo-active::after {
          box-shadow: inset 0 0 50px 0 rgba(108, 99, 255, 0.6);
          transition: box-shadow 0.05s ease-in;
        }
      `}</style>
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          touchAction: 'none'
        }}
      />
      <canvas
        ref={particleCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5
        }}
      />
    </div>
  )
})
