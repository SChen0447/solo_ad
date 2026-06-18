export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface AABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface Obstacle {
  id: string
  position: Vec3
  warningStartTime: number
  opacity: number
  active: boolean
}

export interface Crystal {
  id: string
  position: Vec3
  rotation: number
  collected: boolean
}

export interface TunnelSegment {
  id: string
  startZ: number
  length: number
  curvature: number
  obstacles: Obstacle[]
  crystals: Crystal[]
  meshGroup?: any
}

export interface CartState {
  position: Vec3
  rotation: Vec3
  targetX: number
  velocity: number
}

export interface GameStoreState {
  playerX: number
  playerZ: number
  velocity: number
  baseSpeed: number
  isBoosting: boolean
  boostEndTime: number
  energy: number
  maxEnergy: number
  distance: number
  bestDistance: number
  highScore: number
  gameStatus: GameStatus
  cameraPitch: number
  shakeIntensity: number
  flashIntensity: number
}

export interface GameStoreActions {
  setPlayerPosition: (x: number, z: number) => void
  addEnergy: () => void
  activateBoost: () => void
  updateDistance: (delta: number) => void
  triggerHit: () => void
  setGameStatus: (status: GameStatus) => void
  setCameraPitch: (angle: number) => void
  setVelocity: (v: number) => void
  resetGame: () => void
}

export type GameStore = GameStoreState & GameStoreActions
