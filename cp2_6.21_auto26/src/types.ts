export type ElementType = 'rect' | 'circle' | 'text'

export interface PhysicsProps {
  gravity: number
  bounciness: number
  friction: number
  isStatic: boolean
  velocityX: number
  velocityY: number
}

export interface GameElement {
  id: string
  name: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  radius?: number
  color: string
  rotation: number
  text?: string
  fontSize?: number
  physics: PhysicsProps
  script: string
}

export interface GameState {
  elements: GameElement[]
  score: number
  isRunning: boolean
  isPaused: boolean
  selectedId: string | null
  title: string
  author: string
}

export type EditorAction =
  | { type: 'ADD_ELEMENT'; element: GameElement }
  | { type: 'REMOVE_ELEMENT'; id: string }
  | { type: 'SELECT_ELEMENT'; id: string | null }
  | { type: 'UPDATE_ELEMENT'; id: string; updates: Partial<GameElement> }
  | { type: 'REORDER_ELEMENTS'; ids: string[] }
  | { type: 'SET_SCORE'; score: number }
  | { type: 'START_GAME' }
  | { type: 'PAUSE_GAME' }
  | { type: 'STOP_GAME' }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_AUTHOR'; author: string }
  | { type: 'LOAD_TEMPLATE'; state: GameState }
  | { type: 'LOAD_STATE'; state: GameState }

export interface FrameData {
  elements: GameElement[]
  score: number
  fps: number
  avgFps: number
  minFps: number
  isPaused: boolean
}

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11)
}

export const COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#6B7280', '#FFFFFF'
]

export const defaultElement = (type: ElementType): GameElement => ({
  id: generateId(),
  name: `新${type === 'rect' ? '矩形' : type === 'circle' ? '圆形' : '文字'}`,
  type,
  x: 200,
  y: 200,
  width: type === 'circle' ? 40 : 80,
  height: type === 'circle' ? 40 : 60,
  radius: type === 'circle' ? 20 : undefined,
  color: COLORS[Math.floor(Math.random() * 5)],
  rotation: 0,
  text: type === 'text' ? 'Hello' : undefined,
  fontSize: type === 'text' ? 24 : undefined,
  physics: {
    gravity: 0,
    bounciness: 0,
    friction: 0,
    isStatic: true,
    velocityX: 0,
    velocityY: 0
  },
  script: ''
})
