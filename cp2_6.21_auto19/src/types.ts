export type TileType = 'path' | 'wall' | 'entangled' | 'trap' | 'observer' | 'start' | 'exit'

export interface LevelData {
  id: string
  name: string
  width: number
  height: number
  grid: TileType[][]
  entangledPairs?: Array<{ a: { x: number; y: number }; b: { x: number; y: number } }>
  difficulty: number
}

export interface Position {
  x: number
  y: number
}

export interface ProbabilityCell {
  x: number
  y: number
  probability: number
}

export interface QuantumState {
  collapsed: boolean
  collapsedPosition: Position | null
  probabilityGrid: number[][]
  spreadRadius: number
}

export interface GameStats {
  steps: number
  observations: number
  startTime: number
  elapsedTime: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export const TILE_COLORS: Record<TileType, string> = {
  path: '#6B7280',
  wall: '#1F2937',
  entangled: '#F59E0B',
  trap: '#EF4444',
  observer: '#10B981',
  start: '#3B82F6',
  exit: '#8B5CF6',
}
