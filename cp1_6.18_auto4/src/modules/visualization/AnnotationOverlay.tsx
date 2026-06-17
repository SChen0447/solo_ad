import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Annotation, AnnotationType, Dataset } from '../../types'
import { v4 as uuidv4 } from 'uuid'

interface PendingAnnotation {
  timestamp: number
  series: string
  value: number
  x: number
  y: number
}

interface AnnotationOverlayProps {
  annotations: Annotation[]
  dataset: Dataset | null
  highlightedTimestamp: number | null
  onAddAnnotation: (annotation: Annotation) => void
  onRemoveAnnotation: (id: string) => void
  onUpdateAnnotation: (annotation: Annotation) => void
  onAnnotationClick: (annotation: Annotation) => void
  graphRef: React.MutableRefObject<any>
}

const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({
  annotations,
  dataset,
  highlightedTimestamp,
  onAddAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
  onAnnotationClick,
  graphRef
}) => {
  const [pending, setPending] = useState<PendingAnnotation | null>(null)
  const [editAnnotation, setEditAnnotation] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [dragState, setDragState] = useState<{
    id: string
    startX: number
    startY: number
    origX: number
    origY: number
  } | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (dataset && pending) {
      const registered = graphRef.current?.registerMarker?.(
        pending.timestamp,
        pending.series
      )
      if (registered) {
        setPending({ ...pending, x: registered.x, y: registered.y })
      }
    }
  }, [dataset, pending?.timestamp, pending?.series, graphRef])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (overlayRef.current) {
        const rect = overlayRef.current.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }

      if (dragState) {
        const dx = e.clientX - dragState.startX
        const dy = e.clientY - dragState.startY
        const ann = annotations.find((a) => a.id === dragState.id)
        if (ann) {
          onUpdateAnnotation({
            ...ann,
            x: Math.max(0, dragState.origX + dx),
            y: Math.max(0, dragState.origY + dy)
          })
        }
      }
    }

    const handleMouseUp = () => {
      if (dragState) {
        setDragState(null)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, annotations, onUpdateAnnotation])

  const openEditor = useCallback((info: PendingAnnotation) => {
    setPending(info)
  }, [])

  useEffect(() => {
    ;(window as any).__openAnnotationEditor = openEditor
    return () => {
      delete (window as any).__openAnnotationEditor
    }
  }, [openEditor])

  const createAnnotation = (type: AnnotationType, text?: string) => {
    if (!pending) return

    const annotation: Annotation = {
      id: uuidv4(),
      type,
      timestamp: pending.timestamp,
      series: pending.series,
      x: pending.x,
      y: pending.y,
      text: text,
      color: type === 'highlight' ? '#ffb703' : type === 'arrow' ? '#00d4ff' : '#ffffff',
      targetX: type === 'arrow' ? pending.x + 100 : undefined,
      targetY: type === 'arrow' ? pending.y - 60 : undefined,
      highlightRadius: type === 'highlight' ? 40 : undefined,
      createdAt: Date.now()
    }

    onAddAnnotation(annotation)
    setPending(null)
  }

  const startDrag = (e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation()
    e.preventDefault()
    setDragState({
      id: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: ann.x,
      origY: ann.y
    })
  }

  const startArrowTargetDrag = (e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const origTX = ann.targetX ?? ann.x + 100
    const origTY = ann.targetY ?? ann.y - 60

    const handler = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      onUpdateAnnotation({
        ...ann,
        targetX: origTX + dx,
        targetY: origTY + dy
      })
    }

    const cleanup = () => {
      window.removeEventListener('mousemove', handler)
      window.removeEventListener('mouseup', cleanup)
    }

    window.addEventListener('mousemove', handler)
    window.addEventListener('mouseup', cleanup)
  }

  const isHighlighted = (ann: Annotation): boolean => {
    if (highlightedTimestamp == null) return false
    const [t0, t1] = dataset?.timeRange || [0, 1]
    const tolerance = (t1 - t0) * 0.01
    return Math.abs(ann.timestamp - highlightedTimestamp) < tolerance
  }

  const formatTime = (ts: number): string => {
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div ref={overlayRef} className="annotation-overlay">
      <svg className="annotation-svg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff" />
          </marker>
          <filter id="annotation-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {annotations.map((ann) => {
          const highlighted = isHighlighted(ann)

          if (ann.type === 'arrow' && ann.targetX != null && ann.targetY != null) {
            return (
              <g key={ann.id} className="annotation-arrow-group" style={{ pointerEvents: 'auto' }}>
                <circle
                  cx={ann.x}
                  cy={ann.y}
                  r={8}
                  fill="transparent"
                  style={{ cursor: 'move' }}
                  onMouseDown={(e) => startDrag(e, ann)}
                />
                <circle
                  cx={ann.x}
                  cy={ann.y}
                  r={highlighted ? 7 : 5}
                  fill={ann.color}
                  stroke="#fff"
                  strokeWidth={2}
                  filter="url(#annotation-glow)"
                  style={{
                    transition: 'r 0.3s ease',
                    animation: highlighted ? 'annotation-pulse 1s ease-in-out infinite' : 'none'
                  }}
                />
                <line
                  x1={ann.x}
                  y1={ann.y}
                  x2={ann.targetX}
                  y2={ann.targetY}
                  stroke={ann.color}
                  strokeWidth={highlighted ? 3 : 2}
                  strokeDasharray={highlighted ? '0' : '5,3'}
                  markerEnd="url(#arrowhead)"
                  filter="url(#annotation-glow)"
                  style={{
                    transition: 'all 0.3s ease',
                    strokeDashoffset: highlighted ? 0 : 0
                  }}
                />
                <circle
                  cx={ann.targetX}
                  cy={ann.targetY}
                  r={8}
                  fill="transparent"
                  style={{ cursor: 'crosshair' }}
                  onMouseDown={(e) => startArrowTargetDrag(e, ann)}
                />
                <circle
                  cx={ann.targetX}
                  cy={ann.targetY}
                  r={4}
                  fill={ann.color}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              </g>
            )
          }

          if (ann.type === 'highlight') {
            return (
              <g key={ann.id} className="annotation-highlight-group" style={{ pointerEvents: 'auto' }}>
                <circle
                  cx={ann.x}
                  cy={ann.y}
                  r={8}
                  fill="transparent"
                  style={{ cursor: 'move' }}
                  onMouseDown={(e) => startDrag(e, ann)}
                />
                <circle
                  cx={ann.x}
                  cy={ann.y}
                  r={ann.highlightRadius || 30}
                  fill={ann.color}
                  opacity={highlighted ? 0.35 : 0.2}
                  style={{
                    transition: 'all 0.4s ease',
                    animation: highlighted ? 'highlight-pulse 1.2s ease-in-out infinite' : 'none'
                  }}
                />
                <circle
                  cx={ann.x}
                  cy={ann.y}
                  r={ann.highlightRadius ? (ann.highlightRadius as number) * 0.6 : 20}
                  fill="none"
                  stroke={ann.color}
                  strokeWidth={2}
                  strokeDasharray="4,3"
                  opacity={0.7}
                />
                <circle
                  cx={ann.x}
                  cy={ann.y}
                  r={highlighted ? 8 : 5}
                  fill={ann.color}
                  stroke="#fff"
                  strokeWidth={2}
                  filter="url(#annotation-glow)"
                  style={{ transition: 'r 0.3s ease' }}
                />
              </g>
            )
          }

          return null
        })}
      </svg>

      {annotations.filter((a) => a.type === 'text' || (a.type === 'arrow' && a.targetX != null)).map((ann) => {
        const highlighted = isHighlighted(ann)
        const bubbleX = ann.type === 'arrow' ? ann.targetX! : ann.x
        const bubbleY = ann.type === 'arrow' ? ann.targetY! : ann.y - 50

        return (
          <div
            key={`bubble-${ann.id}`}
            className={`annotation-bubble ${highlighted ? 'highlighted' : ''} ${editAnnotation === ann.id ? 'editing' : ''}`}
            style={{
              left: bubbleX,
              top: bubbleY,
              transform: `translate(-50%, ${highlighted ? 'calc(-100% - 12px)' : 'calc(-100% - 8px)'})`,
              opacity: highlighted ? 1 : 0.92,
              animation: highlighted ? 'bounce-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'fade-in-up 0.3s ease'
            }}
            onMouseDown={(e) => {
              if (editAnnotation !== ann.id) {
                startDrag(e, ann)
              }
            }}
            onClick={(e) => {
              e.stopPropagation()
              onAnnotationClick(ann)
            }}
          >
            <div
              className="bubble-color-bar"
              style={{
                backgroundColor: ann.color || '#00d4ff'
              }}
            />
            <div className="bubble-content">
              <div className="bubble-meta">
                <span className="bubble-series">{ann.series}</span>
                <span className="bubble-time">{formatTime(ann.timestamp)}</span>
              </div>
              {editAnnotation === ann.id ? (
                <div className="bubble-edit">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    rows={3}
                    placeholder="输入标注描述..."
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditAnnotation(null)
                      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        onUpdateAnnotation({ ...ann, text: editText })
                        setEditAnnotation(null)
                      }
                    }}
                  />
                  <div className="bubble-edit-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateAnnotation({ ...ann, text: editText })
                        setEditAnnotation(null)
                      }}
                    >
                      保存
                    </button>
                    <button
                      className="cancel"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditAnnotation(null)
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="bubble-text"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setEditAnnotation(ann.id)
                    setEditText(ann.text || '')
                  }}
                >
                  {ann.text || <span className="empty-text">双击编辑描述...</span>}
                </div>
              )}
            </div>
            <button
              className="bubble-close"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveAnnotation(ann.id)
              }}
              title="删除标注"
            >
              ×
            </button>
            <div className="bubble-arrow" style={{ borderTopColor: '#2a2a4e' }} />
          </div>
        )
      })}

      {pending && (
        <div
          className="annotation-editor"
          style={{
            left: pending.x,
            top: pending.y - 10,
            transform: 'translate(-50%, -100%)',
            animation: 'slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          <div className="editor-header">
            <div className="editor-title">添加标注</div>
            <button className="editor-close" onClick={() => setPending(null)}>
              ×
            </button>
          </div>
          <div className="editor-point-info">
            <span className="info-label">系列:</span>
            <span className="info-value">{pending.series}</span>
            <span className="info-label" style={{ marginLeft: 12 }}>时间:</span>
            <span className="info-value">{formatTime(pending.timestamp)}</span>
            <span className="info-label" style={{ marginLeft: 12 }}>数值:</span>
            <span className="info-value highlight">{pending.value.toFixed(2)}</span>
          </div>
          <div className="editor-text-input">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="输入描述文本..."
              autoFocus
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setPending(null)
              }}
            />
          </div>
          <div className="editor-type-selector">
            <span className="selector-label">标注类型:</span>
            <div className="type-buttons">
              <button
                className="type-btn text-btn"
                onClick={() => createAnnotation('text', editText)}
                title="文本标注"
              >
                <span className="btn-icon">💬</span>
                <span>文本</span>
              </button>
              <button
                className="type-btn arrow-btn"
                onClick={() => createAnnotation('arrow', editText)}
                title="箭头标注"
              >
                <span className="btn-icon">↗</span>
                <span>箭头</span>
              </button>
              <button
                className="type-btn highlight-btn"
                onClick={() => createAnnotation('highlight', editText)}
                title="高亮标注"
              >
                <span className="btn-icon">⭕</span>
                <span>高亮</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnnotationOverlay
