import { create } from 'zustand'

export interface Crystal {
  id: string
  x: number
  y: number
  collected: boolean
  collectProgress: number
}

export interface Portal {
  x: number
  y: number
  active: boolean
  rotation: number
}

export interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export interface GameState {
  playerX: number
  playerY: number
  playerRadius: number
  stamina: number
  maxStamina: number
  lavaHeight: number
  crystals: Crystal[]
  portal: Portal
  score: number
  gameStatus: 'playing' | 'won' | 'lost'
  timeElapsed: number
  particles: Particle[]
  flashEffect: number
  victoryProgress: number
  lowFpsMode: boolean
  cameraX: number
  cameraY: number

  setPlayerPos: (x: number, y: number) => void
  setStamina: (stamina: number) => void
  setLavaHeight: (height: number) => void
  collectCrystal: (id: string) => void
  setPortalActive: (active: boolean) => void
  setPortalRotation: (rotation: number) => void
  setScore: (score: number) => void
  setGameStatus: (status: 'playing' | 'won' | 'lost') => void
  setTimeElapsed: (time: number) => void
  addParticle: (particle: Particle) => void
  updateParticles: (deltaTime: number) => void
  setFlashEffect: (value: number) => void
  setVictoryProgress: (progress: number) => void
  setLowFpsMode: (active: boolean) => void
  setCamera: (x: number, y: number) => void
  resetGame: (options: {
    playerX: number
    playerY: number
    crystals: Crystal[]
    portal: Portal
  }) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  playerX: 600,
  playerY: 600,
  playerRadius: 8,
  stamina: 100,
  maxStamina: 100,
  lavaHeight: 0,
  crystals: [],
  portal: { x: 0, y: 0, active: false, rotation: 0 },
  score: 0,
  gameStatus: 'playing',
  timeElapsed: 0,
  particles: [],
  flashEffect: 0,
  victoryProgress: 0,
  lowFpsMode: false,
  cameraX: 0,
  cameraY: 0,

  setPlayerPos: (x: number, y: number) => set({ playerX: x, playerY: y }),
  setStamina: (stamina: number) => set({ stamina: Math.max(0, Math.min(100, stamina)) }),
  setLavaHeight: (height: number) => set({ lavaHeight: height }),

  collectCrystal: (id: string) =>
    set((state) => ({
      crystals: state.crystals.map((c) =>
        c.id === id ? { ...c, collected: true, collectProgress: 0.3 } : c
      ),
    })),

  setPortalActive: (active: boolean) =>
    set((state) => ({ portal: { ...state.portal, active } })),

  setPortalRotation: (rotation: number) =>
    set((state) => ({ portal: { ...state.portal, rotation } })),

  setScore: (score: number) => set({ score }),
  setGameStatus: (status: 'playing' | 'won' | 'lost') => set({ gameStatus: status }),
  setTimeElapsed: (time: number) => set({ timeElapsed: time }),

  addParticle: (particle: Particle) =>
    set((state) => ({ particles: [...state.particles, particle] })),

  updateParticles: (deltaTime: number) =>
    set((state) => ({
      particles: state.particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx * deltaTime,
          y: p.y + p.vy * deltaTime,
          life: p.life - deltaTime,
        }))
        .filter((p) => p.life > 0),
    })),

  setFlashEffect: (value: number) => set({ flashEffect: value }),
  setVictoryProgress: (progress: number) => set({ victoryProgress: progress }),
  setLowFpsMode: (active: boolean) => set({ lowFpsMode: active }),
  setCamera: (x: number, y: number) => set({ cameraX: x, cameraY: y }),

  resetGame: (options) =>
    set({
      playerX: options.playerX,
      playerY: options.playerY,
      stamina: 100,
      maxStamina: 100,
      lavaHeight: 0,
      crystals: options.crystals,
      portal: options.portal,
      score: 0,
      gameStatus: 'playing',
      timeElapsed: 0,
      particles: [],
      flashEffect: 0,
      victoryProgress: 0,
      lowFpsMode: false,
      cameraX: 0,
      cameraY: 0,
    }),
}))
