export interface DrawPoint {
  x: number
  y: number
}

export interface DrawPath {
  id: string
  points: DrawPoint[]
  color: string
  width: number
}

export type NoteColor = 'yellow' | 'pink' | 'blue'

export interface StickyNoteData {
  id: string
  x: number
  y: number
  content: string
  color: NoteColor
}

export interface CanvasState {
  paths: DrawPath[]
  notes: StickyNoteData[]
}

export type WSMessageType =
  | 'init'
  | 'draw'
  | 'draw-end'
  | 'note-add'
  | 'note-update'
  | 'note-delete'
  | 'clear'
  | 'snapshot'
  | 'user-count'

export interface WSMessage {
  type: WSMessageType
  payload: any
  clientId?: string
}

export const PEN_COLORS = ['#e53935', '#1976d2', '#43a047', '#212121', '#8e24aa'] as const
export const PEN_WIDTHS = [1, 3, 5, 8] as const
export const NOTE_COLOR_MAP: Record<NoteColor, string> = {
  yellow: '#fff59d',
  pink: '#f8bbd9',
  blue: '#b3e5fc'
}
export const MAX_HISTORY = 50
