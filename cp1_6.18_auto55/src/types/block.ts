export interface Block {
  id: string
  x: number
  y: number
  color: string
  frequency: number
}

export interface Ripple {
  id: string
  x: number
  y: number
  color: string
  startTime: number
  duration: number
}

export interface FlightTarget {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  offsetX: number
  offsetY: number
  startTime: number
  duration: number
}

export type LayoutTemplate = 'symmetric' | 'random' | 'spiral' | 'grid' | 'constellation'

export const PRESET_COLORS = [
  '#FF4757',
  '#FF7F50',
  '#FFD93D',
  '#6BCB77',
  '#4ECDC4',
  '#4D96FF',
  '#8B5CF6',
  '#FF6B9D',
  '#A0522D',
  '#A9A9A9',
  '#1A1A2E',
  '#FFFFFF'
]

export const BOARD_WIDTH = 900
export const BOARD_HEIGHT = 600
export const BLOCK_SIZE = 60
export const MAX_BLOCKS = 30
export const RESONANCE_NEAR = 150
export const RESONANCE_FAR = 300
export const RIPPLE_DURATION = 800
export const FLIGHT_DURATION = 600
