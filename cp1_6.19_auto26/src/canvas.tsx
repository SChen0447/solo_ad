import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useEditorStore, Shape } from './store'

type DragState =
  | { mode: 'none' }
  | { mode: 'create'; startX: number; startY: number; tempShape: Shape | null; polygonPoints?: string }
  | { mode: 'move'; shapeId: string; offsetX: number; offsetY: number; origX: number; origY: number }
  | {
      mode: 'resize'
      shapeId: string
      handle: 'tl' | 'tr' | 'bl' | 'br'
      origX: number
      origY: number
      origW: number
      origH: number
    }

const CANVAS_W = 800
const CANVAS_H = 600

function getShapeBounds(shape: Shape): { x: number; y: number; width: number; height: number } {
  return { x: shape.x, y: shape.y, width: shape.width, height: shape.height }
}

function renderShape(shape: Shape, onClick?: (e: React.MouseEvent) => void, extraStyle?: React.CSSProperties) {
  const commonProps = {
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    opacity: shape.opacity / 100,
    style: { transition: 'fill 0.1s ease-out, stroke 0.1s ease-out, opacity 0.1s ease-out', cursor: 'move', ...extraStyle } as React.CSSProperties,
    onClick,
  }

  const transform = `rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})`

  switch (shape.type) {
    case 'rect':
      return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} transform={transform} {...commonProps} />
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} transform={transform} {...commonProps} />
    case 'ellipse':
      return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} transform={transform} {...commonProps} />
    case 'polygon':
      return <polygon points={shape.points} transform={transform} {...commonProps} />
    case 'line':
      return <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} transform={transform} {...commonProps} />
    case 'path':
      return <path d={shape.d} transform={transform} {...commonProps} />
    default:
      return null
  }
}

export default function Canvas() {
  const svgRef = useRef<SVGSVGElement>(null)
  const shapes = useEditorStore((s) => s.shapes)
  const selectedId = useEditorStore((s) => s.selectedId)
  const currentTool = useEditorStore((s) => s.currentTool)
  const selectShape = useEditorStore((s) => s.selectShape)
  const addShape = useEditorStore((s) => s.addShape)
  const updateShape = useEditorStore((s) => s.updateShape)
  const pushUndo = useEditorStore((s) => s.pushUndo)

  const [drag, setDrag] = useState<DragState>({ mode: 'none' })
  const [polygonPoints, setPolygonPoints] = useState<string>('')

  const getSvgPoint = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H
    return { x, y }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== svgRef.current) return
      const { x, y } = getSvgPoint(e)

      if (currentTool === 'select') {
        selectShape(null)
        setDrag({ mode: 'none' })
        return
      }

      if (currentTool === 'polygon') {
        if (!polygonPoints) {
          setPolygonPoints(`${x},${y}`)
        } else {
          setPolygonPoints((prev) => `${prev} ${x},${y}`)
        }
        return
      }

      pushUndo()

      const tempBase = {
        fill: '#6c6cff',
        stroke: '#ffffff',
        strokeWidth: 2,
        rotation: 0,
        opacity: 100,
      }

      let tempShape: Shape | null = null

      if (currentTool === 'rect') {
        tempShape = {
          id: 'temp',
          type: 'rect',
          x,
          y,
          width: 0,
          height: 0,
          ...tempBase,
        }
      } else if (currentTool === 'ellipse') {
        tempShape = {
          id: 'temp',
          type: 'ellipse',
          x,
          y,
          width: 0,
          height: 0,
          cx: x,
          cy: y,
          rx: 0,
          ry: 0,
          ...tempBase,
        }
      } else if (currentTool === 'circle') {
        tempShape = {
          id: 'temp',
          type: 'circle',
          x,
          y,
          width: 0,
          height: 0,
          cx: x,
          cy: y,
          r: 0,
          ...tempBase,
        }
      } else if (currentTool === 'line') {
        tempShape = {
          id: 'temp',
          type: 'line',
          x: Math.min(x, x),
          y: Math.min(y, y),
          width: 0,
          height: 0,
          x1: x,
          y1: y,
          x2: x,
          y2: y,
          ...tempBase,
        }
      } else if (currentTool === 'path') {
        tempShape = {
          id: 'temp',
          type: 'path',
          x,
          y,
          width: 0,
          height: 0,
          d: `M ${x} ${y}`,
          ...tempBase,
        }
      }

      setDrag({ mode: 'create', startX: x, startY: y, tempShape })
    },
    [currentTool, polygonPoints, getSvgPoint, selectShape, pushUndo]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (drag.mode === 'none') return
      const { x, y } = getSvgPoint(e)

      if (drag.mode === 'create' && drag.tempShape) {
        const { startX, startY, tempShape } = drag
        const minX = Math.min(startX, x)
        const minY = Math.min(startY, y)
        const w = Math.abs(x - startX)
        const h = Math.abs(y - startY)

        if (tempShape.type === 'rect') {
          setDrag({
            mode: 'create',
            startX,
            startY,
            tempShape: { ...tempShape, x: minX, y: minY, width: w, height: h },
          })
        } else if (tempShape.type === 'ellipse') {
          setDrag({
            mode: 'create',
            startX,
            startY,
            tempShape: {
              ...tempShape,
              x: minX,
              y: minY,
              width: w,
              height: h,
              cx: minX + w / 2,
              cy: minY + h / 2,
              rx: w / 2,
              ry: h / 2,
            },
          })
        } else if (tempShape.type === 'circle') {
          const r = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2)
          setDrag({
            mode: 'create',
            startX,
            startY,
            tempShape: {
              ...tempShape,
              x: startX - r,
              y: startY - r,
              width: r * 2,
              height: r * 2,
              cx: startX,
              cy: startY,
              r,
            },
          })
        } else if (tempShape.type === 'line') {
          setDrag({
            mode: 'create',
            startX,
            startY,
            tempShape: {
              ...tempShape,
              x: minX,
              y: minY,
              width: w,
              height: h,
              x1: startX,
              y1: startY,
              x2: x,
              y2: y,
            },
          })
        } else if (tempShape.type === 'path') {
          setDrag({
            mode: 'create',
            startX,
            startY,
            tempShape: {
              ...tempShape,
              x: minX,
              y: minY,
              width: w,
              height: h,
              d: `${tempShape.d} L ${x} ${y}`,
            },
          })
        }
      } else if (drag.mode === 'move') {
        const newX = x - drag.offsetX
        const newY = y - drag.offsetY
        const dx = newX - drag.origX
        const dy = newY - drag.origY
        const shape = shapes.find((s) => s.id === drag.shapeId)
        if (!shape) return

        const updates: Partial<Shape> = { x: newX, y: newY }
        if (shape.type === 'circle' || shape.type === 'ellipse') {
          updates.cx = (shape.cx ?? 0) + dx
          updates.cy = (shape.cy ?? 0) + dy
        }
        if (shape.type === 'line') {
          updates.x1 = (shape.x1 ?? 0) + dx
          updates.y1 = (shape.y1 ?? 0) + dy
          updates.x2 = (shape.x2 ?? 0) + dx
          updates.y2 = (shape.y2 ?? 0) + dy
        }
        if (shape.type === 'polygon' && shape.points) {
          const pts = shape.points
            .trim()
            .split(/\s+/)
            .map((p) => p.split(',').map(Number))
            .map(([px, py]) => `${px + dx},${py + dy}`)
            .join(' ')
          updates.points = pts
        }
        if (shape.type === 'path' && shape.d) {
          const updatedD = shape.d.replace(/([ML])\s*(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (_m, cmd, px, py) => {
            return `${cmd} ${parseFloat(px) + dx} ${parseFloat(py) + dy}`
          })
          updates.d = updatedD
        }
        updateShape(drag.shapeId, updates)
        setDrag({ ...drag, origX: newX, origY: newY })
      } else if (drag.mode === 'resize') {
        let { origX, origY, origW, origH } = drag
        let newX = origX
        let newY = origY
        let newW = origW
        let newH = origH

        if (drag.handle === 'br') {
          newW = Math.max(4, x - origX)
          newH = Math.max(4, y - origY)
        } else if (drag.handle === 'tr') {
          newW = Math.max(4, x - origX)
          newH = Math.max(4, origY + origH - y)
          newY = origY + origH - newH
        } else if (drag.handle === 'bl') {
          newW = Math.max(4, origX + origW - x)
          newH = Math.max(4, y - origY)
          newX = origX + origW - newW
        } else if (drag.handle === 'tl') {
          newW = Math.max(4, origX + origW - x)
          newH = Math.max(4, origY + origH - y)
          newX = origX + origW - newW
          newY = origY + origH - newH
        }

        const shape = shapes.find((s) => s.id === drag.shapeId)
        if (!shape) return

        const updates: Partial<Shape> = { x: newX, y: newY, width: newW, height: newH }

        if (shape.type === 'ellipse') {
          updates.cx = newX + newW / 2
          updates.cy = newY + newH / 2
          updates.rx = newW / 2
          updates.ry = newH / 2
        } else if (shape.type === 'circle') {
          const r = Math.min(newW, newH) / 2
          updates.cx = newX + newW / 2
          updates.cy = newY + newH / 2
          updates.r = r
        } else if (shape.type === 'line') {
          const scaleX = origW > 0 ? newW / origW : 1
          const scaleY = origH > 0 ? newH / origH : 1
          updates.x1 = origX + ((shape.x1 ?? origX) - origX) * scaleX + (newX - origX)
          updates.y1 = origY + ((shape.y1 ?? origY) - origY) * scaleY + (newY - origY)
          updates.x2 = origX + ((shape.x2 ?? origX + origW) - origX) * scaleX + (newX - origX)
          updates.y2 = origY + ((shape.y2 ?? origY + origH) - origY) * scaleY + (newY - origY)
        }

        updateShape(drag.shapeId, updates)
      }
    },
    [drag, getSvgPoint, shapes, updateShape]
  )

  const handleMouseUp = useCallback(() => {
    if (drag.mode === 'create' && drag.tempShape) {
      const s = drag.tempShape
      if (s.width > 4 || s.height > 4 || s.type === 'line') {
        const { id: _id, ...shapeData } = s
        addShape(shapeData as Omit<Shape, 'id'>)
      }
    }
    setDrag({ mode: 'none' })
  }, [drag, addShape])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPolygonPoints('')
        setDrag({ mode: 'none' })
        selectShape(null)
      }
      if (e.key === 'Enter' && currentTool === 'polygon' && polygonPoints) {
        const pts = polygonPoints.trim().split(/\s+/).map((p) => p.split(',').map(Number))
        const xs = pts.map((p) => p[0])
        const ys = pts.map((p) => p[1])
        const x = Math.min(...xs)
        const y = Math.min(...ys)
        const w = Math.max(...xs) - x
        const h = Math.max(...ys) - y
        pushUndo()
        addShape({
          type: 'polygon',
          x,
          y,
          width: w,
          height: h,
          points: polygonPoints,
          fill: '#6c6cff',
          stroke: '#ffffff',
          strokeWidth: 2,
          rotation: 0,
          opacity: 100,
        })
        setPolygonPoints('')
      }
      if (e.key === 'Delete' && selectedId) {
        pushUndo()
        useEditorStore.getState().deleteShape(selectedId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [polygonPoints, currentTool, selectedId, addShape, pushUndo, selectShape])

  const selectedShape = shapes.find((s) => s.id === selectedId)

  const handleShapeMouseDown = (e: React.MouseEvent, shape: Shape) => {
    e.stopPropagation()
    if (currentTool !== 'select') return
    const { x, y } = getSvgPoint(e)
    selectShape(shape.id)
    pushUndo()
    const bounds = getShapeBounds(shape)
    setDrag({
      mode: 'move',
      shapeId: shape.id,
      offsetX: x - bounds.x,
      offsetY: y - bounds.y,
      origX: bounds.x,
      origY: bounds.y,
    })
  }

  const handleHandleMouseDown = (e: React.MouseEvent, handle: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation()
    if (!selectedShape) return
    pushUndo()
    const bounds = getShapeBounds(selectedShape)
    setDrag({
      mode: 'resize',
      shapeId: selectedShape.id,
      handle,
      origX: bounds.x,
      origY: bounds.y,
      origW: bounds.width,
      origH: bounds.height,
    })
  }

  const renderGrid = () => {
    const dots: JSX.Element[] = []
    for (let gx = 0; gx <= CANVAS_W; gx += 20) {
      for (let gy = 0; gy <= CANVAS_H; gy += 20) {
        dots.push(<circle key={`${gx}-${gy}`} cx={gx} cy={gy} r={1} fill="#d0d0d0" />)
      }
    }
    return <g>{dots}</g>
  }

  return (
    <div
      style={{
        flex: 1,
        background: '#1e1e2e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflow: 'auto',
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        width="100%"
        height="100%"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          cursor: currentTool === 'select' ? 'default' : 'crosshair',
        }}
        onMouseDown={handleMouseDown}
      >
        {renderGrid()}
        {shapes.map((shape) => (
          <g key={shape.id}>{renderShape(shape, (e) => handleShapeMouseDown(e, shape))}</g>
        ))}
        {drag.mode === 'create' && drag.tempShape && (
          <g opacity={0.7} style={{ pointerEvents: 'none' }}>
            {renderShape(drag.tempShape, undefined, { transition: 'none' })}
          </g>
        )}
        {currentTool === 'polygon' && polygonPoints && (
          <g style={{ pointerEvents: 'none' }}>
            <polygon
              points={polygonPoints}
              fill="rgba(108, 108, 255, 0.3)"
              stroke="#6c6cff"
              strokeWidth={2}
              strokeDasharray="4,4"
            />
            {polygonPoints
              .trim()
              .split(/\s+/)
              .map((p, i) => {
                const [px, py] = p.split(',').map(Number)
                return <circle key={i} cx={px} cy={py} r={4} fill="#6c6cff" stroke="#fff" strokeWidth={1} />
              })}
          </g>
        )}
        {selectedShape && (() => {
          const b = getShapeBounds(selectedShape)
          const cx = b.x + b.width / 2
          const cy = b.y + b.height / 2
          const transform = `rotate(${selectedShape.rotation} ${cx} ${cy})`
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect
                x={b.x - 4}
                y={b.y - 4}
                width={b.width + 8}
                height={b.height + 8}
                fill="none"
                stroke="#4a90ff"
                strokeWidth={2}
                strokeDasharray="6,4"
                className="selection-box"
                transform={transform}
              />
              {(['tl', 'tr', 'bl', 'br'] as const).map((h) => {
                let hx = b.x,
                  hy = b.y
                if (h === 'tr' || h === 'br') hx = b.x + b.width
                if (h === 'bl' || h === 'br') hy = b.y + b.height
                return (
                  <rect
                    key={h}
                    x={hx - 6}
                    y={hy - 6}
                    width={12}
                    height={12}
                    fill="#4a90ff"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    transform={transform}
                    style={{ pointerEvents: 'auto', cursor: `${h}-resize` }}
                    onMouseDown={(e) => handleHandleMouseDown(e, h)}
                  />
                )
              })}
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
