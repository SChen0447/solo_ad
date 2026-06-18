export type ToolType = 'pen' | 'rect' | 'ellipse' | 'text'

export type ElementType = 'stroke' | 'rect' | 'ellipse' | 'text'

export interface Point {
  x: number
  y: number
}

export interface BoardElement {
  id: string
  type: ElementType
  x: number
  y: number
  width?: number
  height?: number
  points?: Point[]
  color: string
  lineWidth?: number
  text?: string
  fontSize?: number
  userId: string
  createdAt: number
  opacity: number
}

export interface UserInfo {
  id: string
  name: string
  color: string
}

export type WSMessageType = 'add' | 'update' | 'delete' | 'cursor' | 'sync' | 'join' | 'leave' | 'init'

export interface WSMessage {
  type: WSMessageType
  element?: BoardElement
  elements?: BoardElement[]
  userId?: string
  user?: UserInfo
  users?: UserInfo[]
  cursor?: Point
}

export const PRESET_COLORS = [
  '#ff4d4d',
  '#4da6ff',
  '#4dff4d',
  '#ffcc4d',
  '#b366ff',
  '#ff9933',
  '#ff66b2',
  '#333333',
]

export const LINE_WIDTHS = [2, 4, 6]

export const AVATAR_COLORS = PRESET_COLORS

export const CANVAS_BG = '#f5f0e8'
export const GRID_COLOR = '#d6cebe'
export const GRID_SIZE = 20

export const TEXT_FONT_SIZE = 16
export const TEXT_COLOR = '#444444'

export const TOOL_HIGHLIGHT_BORDER = '2px solid #4da6ff'
export const TOOL_HIGHLIGHT_BG = '#e6f0ff'
