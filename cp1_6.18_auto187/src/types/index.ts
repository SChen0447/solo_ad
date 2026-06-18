export type AnnotationType = 'arrow' | 'rectangle' | 'ellipse' | 'brush' | 'select'

export interface Point {
  x: number
  y: number
}

export interface BaseAnnotation {
  id: string
  type: AnnotationType
  x: number
  y: number
  color: string
  lineWidth: number
  rotation: number
  createdAt: number
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow'
  x: number
  y: number
  endX: number
  endY: number
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle'
  width: number
  height: number
  borderRadius: number
  dashed: boolean
  fillColor: string
}

export interface EllipseAnnotation extends BaseAnnotation {
  type: 'ellipse'
  width: number
  height: number
  fillColor: string
}

export interface BrushAnnotation extends BaseAnnotation {
  type: 'brush'
  points: Point[]
}

export type Annotation = ArrowAnnotation | RectangleAnnotation | EllipseAnnotation | BrushAnnotation

export interface HistorySnapshot {
  id: string
  timestamp: number
  annotations: Annotation[]
}

export interface Comment {
  id: string
  annotationId: string
  text: string
  author: string
  createdAt: number
}

export type ToolType = AnnotationType | 'delete'
