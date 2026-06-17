export interface RawDataPoint {
  timestamp: string | number | Date
  value: number
  series: string
  [key: string]: any
}

export interface ProcessedDataPoint {
  timestamp: number
  value: number
  series: string
  originalIndex?: number
}

export interface TimeSeriesData {
  series: string
  points: ProcessedDataPoint[]
  color: string
  minValue: number
  maxValue: number
}

export interface Dataset {
  id: string
  name: string
  series: TimeSeriesData[]
  timeRange: [number, number]
  valueRange: [number, number]
}

export type ChartType = 'area' | 'stacked-bar' | 'scatter'

export type AnnotationType = 'text' | 'arrow' | 'highlight'

export interface Annotation {
  id: string
  type: AnnotationType
  timestamp: number
  series?: string
  x: number
  y: number
  text?: string
  color?: string
  targetX?: number
  targetY?: number
  highlightRadius?: number
  createdAt: number
}

export interface MarkerRegistration {
  timestamp: number
  series: string
  x: number
  y: number
  value: number
}

export type ResampleInterval = 'none' | '1min' | '5min' | '15min' | '1hour' | '1day'

export interface TimelineParseConfig {
  interval: ResampleInterval
  smoothing: number
  normalize: boolean
}
