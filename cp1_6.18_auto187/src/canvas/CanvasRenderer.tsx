import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useAnnotationStore } from '../store/annotationStore'
import { useCommentStore } from '../store/commentStore'
import type { Annotation, Point, ArrowAnnotation, RectangleAnnotation, EllipseAnnotation, BrushAnnotation } from '../types'

const CANVAS_WIDTH = 960
const CANVAS_HEIGHT = 640
const ANCHOR_RADIUS = 6
const ARROW_HEAD_LENGTH = 12
const BRUSH_STEP = 8

interface DrawingState {
  isDrawing: boolean
  startPoint: Point | null
  currentPoint: Point | null
  brushPoints: Point[]
}

interface DragState {
  isDragging: boolean
  annotationId: string | null
  offset: Point
}

const getAnnotationCenter = (annotation: Annotation): Point => {
  switch (annotation.type) {
    case 'arrow':
      return {
        x: (annotation.x + annotation.endX) / 2,
        y: (annotation.y + annotation.endY) / 2,
      }
    case 'rectangle':
    case 'ellipse':
      return {
        x: annotation.x + annotation.width / 2,
        y: annotation.y + annotation.height / 2,
      }
    case 'brush': {
      const points = annotation.points
      if (points.length === 0) return { x: 0, y: 0 }
      const sumX = points.reduce((sum, p) => sum + p.x, 0)
      const sumY = points.reduce((sum, p) => sum + p.y, 0)
      return { x: sumX / points.length, y: sumY / points.length }
    }
    default:
      return { x: 0, y: 0 }
  }
}

const simplifyPoints = (points: Point[], step: number): Point[] => {
  if (points.length < 3) return points
  
  const result: Point[] = [points[0]]
  let lastAdded = points[0]
  
  for (let i = 1; i < points.length - 1; i++) {
    const dx = points[i].x - lastAdded.x
    const dy = points[i].y - lastAdded.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance >= step) {
      result.push(points[i])
      lastAdded = points[i]
    }
  }
  
  result.push(points[points.length - 1])
  return result
}

const generateSmoothPath = (points: Point[]): string => {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let path = `M ${points[0].x} ${points[0].y}`
  
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2
    const yc = (points[i].y + points[i + 1].y) / 2
    path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`
  }
  
  path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`
  return path
}

const getArrowHeadPath = (startX: number, startY: number, endX: number, endY: number): string => {
  const angle = Math.atan2(endY - startY, endX - startX)
  const arrowAngle = Math.PI / 6
  
  const x1 = endX - ARROW_HEAD_LENGTH * Math.cos(angle - arrowAngle)
  const y1 = endY - ARROW_HEAD_LENGTH * Math.sin(angle - arrowAngle)
  const x2 = endX - ARROW_HEAD_LENGTH * Math.cos(angle + arrowAngle)
  const y2 = endY - ARROW_HEAD_LENGTH * Math.sin(angle + arrowAngle)
  
  return `M ${endX} ${endY} L ${x1} ${y1} L ${x2} ${y2} Z`
}

const getAnnotationAtPoint = (annotations: Annotation[], point: Point): Annotation | null => {
  for (let i = annotations.length - 1; i >= 0; i--) {
    const ann = annotations[i]
    const center = getAnnotationCenter(ann)
    const dx = point.x - center.x
    const dy = point.y - center.y
    
    if (Math.sqrt(dx * dx + dy * dy) < 20) {
      return ann
    }
    
    switch (ann.type) {
      case 'arrow': {
        const distToLine = Math.abs((ann.endY - ann.y) * point.x - (ann.endX - ann.x) * point.y + ann.endX * ann.y - ann.endY * ann.x) /
          Math.sqrt((ann.endY - ann.y) ** 2 + (ann.endX - ann.x) ** 2)
        if (distToLine < 10 && 
            point.x >= Math.min(ann.x, ann.endX) - 10 && 
            point.x <= Math.max(ann.x, ann.endX) + 10 &&
            point.y >= Math.min(ann.y, ann.endY) - 10 && 
            point.y <= Math.max(ann.y, ann.endY) + 10) {
          return ann
        }
        break
      }
      case 'rectangle':
      case 'ellipse':
        if (point.x >= ann.x - 5 && point.x <= ann.x + ann.width + 5 &&
            point.y >= ann.y - 5 && point.y <= ann.y + ann.height + 5) {
          return ann
        }
        break
      case 'brush': {
        for (const p of ann.points) {
          const d = Math.sqrt((point.x - p.x) ** 2 + (point.y - p.y) ** 2)
          if (d < 15) return ann
        }
        break
      }
    }
  }
  return null
}

export const CanvasRenderer: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startPoint: null,
    currentPoint: null,
    brushPoints: [],
  })
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    annotationId: null,
    offset: { x: 0, y: 0 },
  })
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentAnnotationId, setCommentAnnotationId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  const {
    annotations,
    currentTool,
    selectedAnnotationId,
    backgroundImage,
    setSelectedAnnotationId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
  } = useAnnotationStore()

  const { addComment } = useCommentStore()

  const getSVGPoint = useCallback((e: React.MouseEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const point = getSVGPoint(e)
    
    if (currentTool === 'select') {
      const annotation = getAnnotationAtPoint(annotations, point)
      if (annotation) {
        setSelectedAnnotationId(annotation.id)
        const center = getAnnotationCenter(annotation)
        setDragState({
          isDragging: true,
          annotationId: annotation.id,
          offset: {
            x: point.x - center.x,
            y: point.y - center.y,
          },
        })
      } else {
        setSelectedAnnotationId(null)
      }
      return
    }

    if (currentTool === 'delete') {
      const annotation = getAnnotationAtPoint(annotations, point)
      if (annotation) {
        deleteAnnotation(annotation.id)
      }
      return
    }

    setDrawingState({
      isDrawing: true,
      startPoint: point,
      currentPoint: point,
      brushPoints: currentTool === 'brush' ? [point] : [],
    })
  }, [currentTool, annotations, getSVGPoint, setSelectedAnnotationId, deleteAnnotation])

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const point = getSVGPoint(e)

    if (dragState.isDragging && dragState.annotationId) {
      const annotation = annotations.find(a => a.id === dragState.annotationId)
      if (!annotation) return

      const newCenter = {
        x: point.x - dragState.offset.x,
        y: point.y - dragState.offset.y,
      }
      const oldCenter = getAnnotationCenter(annotation)
      const dx = newCenter.x - oldCenter.x
      const dy = newCenter.y - oldCenter.y

      switch (annotation.type) {
        case 'arrow':
          updateAnnotation(annotation.id, {
            x: annotation.x + dx,
            y: annotation.y + dy,
            endX: annotation.endX + dx,
            endY: annotation.endY + dy,
          } as Partial<ArrowAnnotation>)
          break
        case 'rectangle':
        case 'ellipse':
          updateAnnotation(annotation.id, {
            x: annotation.x + dx,
            y: annotation.y + dy,
          } as Partial<RectangleAnnotation | EllipseAnnotation>)
          break
        case 'brush':
          updateAnnotation(annotation.id, {
            points: annotation.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
          } as Partial<BrushAnnotation>)
          break
      }
      return
    }

    if (!drawingState.isDrawing || !drawingState.startPoint) return

    if (currentTool === 'brush') {
      const lastPoint = drawingState.brushPoints[drawingState.brushPoints.length - 1]
      const dx = point.x - lastPoint.x
      const dy = point.y - lastPoint.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance >= BRUSH_STEP) {
        setDrawingState(prev => ({
          ...prev,
          currentPoint: point,
          brushPoints: [...prev.brushPoints, point],
        }))
      }
    } else {
      setDrawingState(prev => ({
        ...prev,
        currentPoint: point,
      }))
    }
  }, [drawingState, dragState, currentTool, annotations, getSVGPoint, updateAnnotation])

  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        annotationId: null,
        offset: { x: 0, y: 0 },
      })
      return
    }

    if (!drawingState.isDrawing || !drawingState.startPoint || !drawingState.currentPoint) {
      setDrawingState({
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        brushPoints: [],
      })
      return
    }

    const { startPoint, currentPoint, brushPoints } = drawingState

    const defaultColor = '#00ff88'
    const defaultLineWidth = 3

    switch (currentTool) {
      case 'arrow':
        addAnnotation({
          type: 'arrow',
          x: startPoint.x,
          y: startPoint.y,
          endX: currentPoint.x,
          endY: currentPoint.y,
          color: defaultColor,
          lineWidth: defaultLineWidth,
          rotation: 0,
        } as Omit<ArrowAnnotation, 'id' | 'createdAt'>)
        break

      case 'rectangle':
        addAnnotation({
          type: 'rectangle',
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
          color: defaultColor,
          lineWidth: defaultLineWidth,
          borderRadius: 6,
          dashed: false,
          fillColor: 'transparent',
          rotation: 0,
        } as Omit<RectangleAnnotation, 'id' | 'createdAt'>)
        break

      case 'ellipse':
        addAnnotation({
          type: 'ellipse',
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
          color: defaultColor,
          lineWidth: defaultLineWidth,
          fillColor: 'transparent',
          rotation: 0,
        } as Omit<EllipseAnnotation, 'id' | 'createdAt'>)
        break

      case 'brush':
        if (brushPoints.length >= 2) {
          const simplified = simplifyPoints(brushPoints, BRUSH_STEP)
          addAnnotation({
            type: 'brush',
            x: simplified[0].x,
            y: simplified[0].y,
            points: simplified,
            color: defaultColor,
            lineWidth: defaultLineWidth,
            rotation: 0,
          } as Omit<BrushAnnotation, 'id' | 'createdAt'>)
        }
        break
    }

    setDrawingState({
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
      brushPoints: [],
    })
  }, [drawingState, dragState, currentTool, addAnnotation])

  const handleAnchorDoubleClick = useCallback((annotationId: string) => {
    setCommentAnnotationId(annotationId)
    setShowCommentInput(true)
    setCommentText('')
  }, [])

  const handleCommentSubmit = useCallback(() => {
    if (commentAnnotationId && commentText.trim()) {
      addComment(commentAnnotationId, commentText.trim())
      setShowCommentInput(false)
      setCommentAnnotationId(null)
      setCommentText('')
    }
  }, [commentAnnotationId, commentText, addComment])

  const renderAnnotation = (annotation: Annotation) => {
    const isSelected = annotation.id === selectedAnnotationId
    const center = getAnnotationCenter(annotation)
    const strokeDasharray = annotation.type === 'rectangle' && (annotation as RectangleAnnotation).dashed ? '8 4' : undefined

    return (
      <g key={annotation.id}>
        {annotation.type === 'arrow' && (
          <>
            <line
              x1={annotation.x}
              y1={annotation.y}
              x2={annotation.endX}
              y2={annotation.endY}
              stroke={annotation.color}
              strokeWidth={annotation.lineWidth}
              strokeLinecap="round"
            />
            <path
              d={getArrowHeadPath(annotation.x, annotation.y, annotation.endX, annotation.endY)}
              fill={annotation.color}
            />
          </>
        )}

        {annotation.type === 'rectangle' && (
          <rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            rx={(annotation as RectangleAnnotation).borderRadius}
            ry={(annotation as RectangleAnnotation).borderRadius}
            stroke={annotation.color}
            strokeWidth={annotation.lineWidth}
            fill={(annotation as RectangleAnnotation).fillColor}
            strokeDasharray={strokeDasharray}
          />
        )}

        {annotation.type === 'ellipse' && (
          <ellipse
            cx={annotation.x + annotation.width / 2}
            cy={annotation.y + annotation.height / 2}
            rx={annotation.width / 2}
            ry={annotation.height / 2}
            stroke={annotation.color}
            strokeWidth={annotation.lineWidth}
            fill={(annotation as EllipseAnnotation).fillColor}
          />
        )}

        {annotation.type === 'brush' && (
          <path
            d={generateSmoothPath((annotation as BrushAnnotation).points)}
            stroke={annotation.color}
            strokeWidth={annotation.lineWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {isSelected && (
          <>
            {annotation.type !== 'arrow' && annotation.type !== 'brush' && (
              <rect
                x={annotation.x - 5}
                y={annotation.y - 5}
                width={(annotation as RectangleAnnotation).width + 10}
                height={(annotation as RectangleAnnotation).height + 10}
                stroke="#00bfff"
                strokeWidth={2}
                fill="none"
                strokeDasharray="4 4"
              />
            )}
            <circle
              cx={center.x}
              cy={center.y}
              r={ANCHOR_RADIUS + 2}
              fill="#00bfff"
              stroke="#ffffff"
              strokeWidth={2}
              style={{ cursor: 'move' }}
              onDoubleClick={() => handleAnchorDoubleClick(annotation.id)}
            />
          </>
        )}

        {!isSelected && (
          <circle
            cx={center.x}
            cy={center.y}
            r={ANCHOR_RADIUS}
            fill={annotation.color}
            stroke="#ffffff"
            strokeWidth={2}
            style={{ cursor: 'pointer', opacity: 0.9 }}
            onDoubleClick={() => handleAnchorDoubleClick(annotation.id)}
          />
        )}
      </g>
    )
  }

  const renderPreview = () => {
    if (!drawingState.isDrawing || !drawingState.startPoint || !drawingState.currentPoint) return null

    const { startPoint, currentPoint, brushPoints } = drawingState
    const previewColor = '#00ff88'
    const previewLineWidth = 3

    switch (currentTool) {
      case 'arrow':
        return (
          <g style={{ pointerEvents: 'none', opacity: 0.7 }}>
            <line
              x1={startPoint.x}
              y1={startPoint.y}
              x2={currentPoint.x}
              y2={currentPoint.y}
              stroke={previewColor}
              strokeWidth={previewLineWidth}
              strokeLinecap="round"
            />
            <path
              d={getArrowHeadPath(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y)}
              fill={previewColor}
            />
          </g>
        )

      case 'rectangle':
        return (
          <rect
            x={Math.min(startPoint.x, currentPoint.x)}
            y={Math.min(startPoint.y, currentPoint.y)}
            width={Math.abs(currentPoint.x - startPoint.x)}
            height={Math.abs(currentPoint.y - startPoint.y)}
            rx={6}
            ry={6}
            stroke={previewColor}
            strokeWidth={previewLineWidth}
            fill="transparent"
            style={{ pointerEvents: 'none', opacity: 0.7 }}
          />
        )

      case 'ellipse':
        return (
          <ellipse
            cx={(startPoint.x + currentPoint.x) / 2}
            cy={(startPoint.y + currentPoint.y) / 2}
            rx={Math.abs(currentPoint.x - startPoint.x) / 2}
            ry={Math.abs(currentPoint.y - startPoint.y) / 2}
            stroke={previewColor}
            strokeWidth={previewLineWidth}
            fill="transparent"
            style={{ pointerEvents: 'none', opacity: 0.7 }}
          />
        )

      case 'brush':
        if (brushPoints.length >= 2) {
          return (
            <path
              d={generateSmoothPath(brushPoints)}
              stroke={previewColor}
              strokeWidth={previewLineWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none', opacity: 0.7 }}
            />
          )
        }
        return null

      default:
        return null
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB')
      return
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('只支持JPG和PNG格式')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      useAnnotationStore.getState().setBackgroundImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId && !showCommentInput) {
          deleteAnnotation(selectedAnnotationId)
        }
      }
      if (e.key === 'Escape') {
        setSelectedAnnotationId(null)
        setShowCommentInput(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAnnotationId, showCommentInput, deleteAnnotation, setSelectedAnnotationId])

  return (
    <div className="canvas-container">
      {!backgroundImage && (
        <div className="upload-overlay">
          <label className="upload-label">
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <div className="upload-content">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p>点击上传图片 (JPG/PNG, 最大5MB)</p>
            </div>
          </label>
        </div>
      )}

      <svg
        ref={svgRef}
        className="canvas-svg"
        width="100%"
        height="100%"
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <rect
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="#2d2d2d"
          stroke="#555"
          strokeWidth="2"
        />

        {backgroundImage && (
          <image
            href={backgroundImage}
            x="0"
            y="0"
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            preserveAspectRatio="xMidYMid meet"
          />
        )}

        {annotations.map(renderAnnotation)}
        {renderPreview()}
      </svg>

      {showCommentInput && (
        <div className="comment-input-modal">
          <div className="comment-input-content">
            <h4>添加评论</h4>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="输入评论内容..."
              autoFocus
            />
            <div className="comment-input-buttons">
              <button onClick={() => setShowCommentInput(false)}>取消</button>
              <button onClick={handleCommentSubmit} className="primary">提交</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
