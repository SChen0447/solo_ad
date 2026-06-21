import React, { useState, useRef, useEffect, useCallback } from 'react'
import { CanvasElement, PaperSize, PAPER_SIZES, GuideLine } from '../types'
import { useElementManager } from '../hooks/useElementManager'
import Ruler from './Ruler'
import { Lock } from 'lucide-react'

interface CanvasAreaProps {
  paperSize: PaperSize
  elements: CanvasElement[]
  selectedIds: string[]
  guideLines: GuideLine[]
  showGrid: boolean
  onSelectElement: (id: string, multi?: boolean) => void
  onDeselectAll: () => void
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void
  onAddGuideLine: (orientation: 'horizontal' | 'vertical', position: number) => void
  onRemoveGuideLine: (id: string) => void
  onAddElement: (type: 'rect' | 'text' | 'line' | 'dateLabel', x: number, y: number) => void
}

type DragState =
  | { type: 'none' }
  | { type: 'drag'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { type: 'resize'; id: string; startX: number; startY: number; origW: number; origH: number }

const CanvasArea: React.FC<CanvasAreaProps> = ({
  paperSize,
  elements,
  selectedIds,
  guideLines,
  showGrid,
  onSelectElement,
  onDeselectAll,
  onUpdateElement,
  onAddGuideLine,
  onRemoveGuideLine,
  onAddElement,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [dragState, setDragState] = useState<DragState>({ type: 'none' })
  const [rotationAngle, setRotationAngle] = useState<{ id: string; angle: number } | null>(null)
  const rotationTimeoutRef = useRef<number | null>(null)

  const canvasSize = PAPER_SIZES[paperSize]

  const snapToGuideLines = useCallback(
    (value: number, orientation: 'horizontal' | 'vertical', threshold = 5): number => {
      for (const gl of guideLines) {
        if (gl.orientation === orientation) {
          if (Math.abs(value - gl.position) <= threshold) {
            return gl.position
          }
        }
      }
      return value
    },
    [guideLines]
  )

  const snapRectToGuideLines = useCallback(
    (x: number, y: number, w: number, h: number) => {
      let newX = x
      let newY = y
      let newW = w
      let newH = h

      for (const gl of guideLines) {
        if (gl.orientation === 'vertical') {
          if (Math.abs(x - gl.position) <= 5) newX = gl.position
          else if (Math.abs(x + w - gl.position) <= 5) newW = gl.position - newX
        } else {
          if (Math.abs(y - gl.position) <= 5) newY = gl.position
          else if (Math.abs(y + h - gl.position) <= 5) newH = gl.position - newY
        }
      }

      return { x: newX, y: newY, width: newW, height: newH }
    },
    [guideLines]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragState.type === 'none') return

      if (dragState.type === 'drag') {
        const dx = e.clientX - dragState.startX
        const dy = e.clientY - dragState.startY
        let newX = dragState.origX + dx
        let newY = dragState.origY + dy
        newX = snapToGuideLines(newX, 'vertical')
        newY = snapToGuideLines(newY, 'horizontal')
        onUpdateElement(dragState.id, { x: Math.round(newX), y: Math.round(newY) })
      } else if (dragState.type === 'resize') {
        const dx = e.clientX - dragState.startX
        const dy = e.clientY - dragState.startY
        let newW = Math.max(10, dragState.origW + dx)
        let newH = Math.max(10, dragState.origH + dy)
        const snapped = snapRectToGuideLines(
          elements.find((el) => el.id === dragState.id)?.x ?? 0,
          elements.find((el) => el.id === dragState.id)?.y ?? 0,
          newW,
          newH
        )
        onUpdateElement(dragState.id, {
          width: Math.round(snapped.width),
          height: Math.round(snapped.height),
        })
      }
    },
    [dragState, onUpdateElement, snapToGuideLines, snapRectToGuideLines, elements]
  )

  const handleMouseUp = useCallback(() => {
    setDragState({ type: 'none' })
  }, [])

  useEffect(() => {
    if (dragState.type !== 'none') {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragState, handleMouseMove, handleMouseUp])

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvasBg === 'true') {
      onDeselectAll()
    }
  }

  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation()
    if (element.locked) {
      onSelectElement(element.id, e.shiftKey)
      return
    }
    onSelectElement(element.id, e.shiftKey)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setDragState({
      type: 'drag',
      id: element.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: element.x,
      origY: element.y,
    })
  }

  const handleResizeMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation()
    if (element.locked) return
    setDragState({
      type: 'resize',
      id: element.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: element.width,
      origH: element.height,
    })
  }

  const handleElementWheel = (e: React.WheelEvent, element: CanvasElement) => {
    if (!e.ctrlKey || element.locked) return
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY > 0 ? 15 : -15
    const newRotation = (element.rotation + delta) % 360
    onUpdateElement(element.id, { rotation: newRotation })
    setRotationAngle({ id: element.id, angle: newRotation })
    if (rotationTimeoutRef.current) {
      window.clearTimeout(rotationTimeoutRef.current)
    }
    rotationTimeoutRef.current = window.setTimeout(() => {
      setRotationAngle(null)
    }, 500)
  }

  const renderGrid = () => {
    if (!showGrid) return null
    const lines: JSX.Element[] = []
    for (let x = 0; x <= canvasSize.width; x += 20) {
      lines.push(
        <div
          key={`v-${x}`}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            width: 0.5,
            height: canvasSize.height,
            backgroundColor: '#E5E7EB',
            pointerEvents: 'none',
          }}
        />
      )
    }
    for (let y = 0; y <= canvasSize.height; y += 20) {
      lines.push(
        <div
          key={`h-${y}`}
          style={{
            position: 'absolute',
            left: 0,
            top: y,
            width: canvasSize.width,
            height: 0.5,
            backgroundColor: '#E5E7EB',
            pointerEvents: 'none',
          }}
        />
      )
    }
    return lines
  }

  const renderGuideLines = () => {
    return guideLines.map((gl) => {
      const isHorizontal = gl.orientation === 'horizontal'
      return (
        <div
          key={gl.id}
          onDoubleClick={() => onRemoveGuideLine(gl.id)}
          style={{
            position: 'absolute',
            left: isHorizontal ? 0 : gl.position,
            top: isHorizontal ? gl.position : 0,
            width: isHorizontal ? canvasSize.width : 1,
            height: isHorizontal ? 1 : canvasSize.height,
            backgroundColor: 'transparent',
            borderTop: isHorizontal ? '1px dashed #3B82F6' : 'none',
            borderLeft: !isHorizontal ? '1px dashed #3B82F6' : 'none',
            cursor: isHorizontal ? 'ns-resize' : 'ew-resize',
            zIndex: 10,
          }}
        />
      )
    })
  }

  const renderElement = (element: CanvasElement) => {
    const isSelected = selectedIds.includes(element.id)
    const showRotation = rotationAngle?.id === element.id

    const borderValue = `${element.borderWidth}px ${element.borderStyle} ${element.borderColor}`

    return (
      <div
        key={element.id}
        onMouseDown={(e) => handleElementMouseDown(e, element)}
        onWheel={(e) => handleElementWheel(e, element)}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          backgroundColor: element.backgroundColor,
          border: borderValue,
          borderRadius: element.borderRadius,
          transform: `rotate(${element.rotation}deg)`,
          transformOrigin: 'center center',
          boxSizing: 'border-box',
          cursor: element.locked ? 'not-allowed' : 'move',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          zIndex: isSelected ? 5 : 1,
          outline: isSelected ? '2px solid #3B82F6' : 'none',
          outlineOffset: 1,
          userSelect: 'none',
        }}
        className="canvas-element"
      >
        {(element.type === 'text' || element.type === 'dateLabel') && element.text && (
          <span
            style={{
              fontSize: element.fontSize,
              color: element.fontColor,
              letterSpacing: element.letterSpacing,
              pointerEvents: 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.2,
            }}
          >
            {element.text}
          </span>
        )}

        {element.locked && (
          <div
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.4,
              transition: 'opacity 0.2s',
              zIndex: 2,
              cursor: 'pointer',
            }}
            className="lock-icon"
          >
            <Lock size={14} color="#6B7280" />
            <style>{`
              .canvas-element:hover .lock-icon {
                opacity: 1;
              }
            `}</style>
          </div>
        )}

        {isSelected && !element.locked && (
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, element)}
            style={{
              position: 'absolute',
              right: -5,
              bottom: -5,
              width: 10,
              height: 10,
              backgroundColor: '#3B82F6',
              border: '1px solid #FFFFFF',
              borderRadius: 1,
              cursor: 'se-resize',
              zIndex: 3,
            }}
          />
        )}

        {showRotation && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) rotate(${-element.rotation}deg)`,
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              color: '#FFFFFF',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              pointerEvents: 'none',
              zIndex: 20,
              animation: 'fadeInOut 0.5s ease',
            }}
          >
            {element.rotation}°
          </div>
        )}

        <style>{`
          .canvas-element:hover {
            border-color: #3B82F6 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }
          @keyframes fadeInOut {
            0% { opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 1; }
            100% { opacity: 0; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 40,
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 24, height: 24, flexShrink: 0 }} />
          <Ruler
            orientation="horizontal"
            length={canvasSize.width}
            onAddGuideLine={(pos) => onAddGuideLine('vertical', pos)}
          />
        </div>
        <div style={{ display: 'flex' }}>
          <Ruler
            orientation="vertical"
            length={canvasSize.height}
            onAddGuideLine={(pos) => onAddGuideLine('horizontal', pos)}
          />
          <div
            ref={canvasRef}
            data-canvas-bg="true"
            onMouseDown={handleCanvasMouseDown}
            style={{
              position: 'relative',
              width: canvasSize.width,
              height: canvasSize.height,
              backgroundColor: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {renderGrid()}
            {renderGuideLines()}
            {elements.map(renderElement)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CanvasArea
