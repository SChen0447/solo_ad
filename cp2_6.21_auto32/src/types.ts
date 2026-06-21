export type PaperSize = 'A5' | 'A6' | 'B6'
export type BorderStyle = 'solid' | 'dashed' | 'dotted'
export type ElementType = 'rect' | 'text' | 'line' | 'dateLabel'

export interface CanvasElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  backgroundColor: string
  borderStyle: BorderStyle
  borderWidth: number
  borderColor: string
  borderRadius: number
  text?: string
  fontSize?: number
  fontColor?: string
  letterSpacing?: number
}

export interface Template {
  id: string
  name: string
  paperSize: PaperSize
  elements: CanvasElement[]
  thumbnail: string
  createdAt: number
  updatedAt: number
}

export interface GuideLine {
  id: string
  orientation: 'horizontal' | 'vertical'
  position: number
}

export const PAPER_SIZES: Record<PaperSize, { width: number; height: number }> = {
  A5: { width: 420, height: 595 },
  A6: { width: 298, height: 420 },
  B6: { width: 372, height: 524 },
}
