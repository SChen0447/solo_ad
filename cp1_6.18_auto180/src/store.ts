import { create } from 'zustand'
import { GameStore, GameStatus } from './types'

const HIGH_SCORE_KEY = 'abyss_minecart_highscore'

const getInitialHighScore = (): number => {
  try {
    const saved = localStorage.getItem(HIGH_SCORE_KEY)
    return saved ? parseFloat(saved) : 0
  } catch {
    return 0
  }
}

export const useGameStore = create<GameStore>((set, get) => ({
  playerX: 0,
  playerZ: 0,
  velocity: 30,
  baseSpeed: 30,
  isBoosting: false,
  boostEndTime: 0,
  energy: 0,
  maxEnergy: 5,
  distance: 0,
  bestDistance: 0,
  highScore: getInitialHighScore(),
  gameStatus: 'idle',
  cameraPitch: 40,
  shakeIntensity: 0,
  flashIntensity: 0,

  setPlayerPosition: (x: number, z: number) => set({ playerX: x, playerZ: z }),

  addEnergy: () => {
    const { energy, maxEnergy } = get()
    const newEnergy = Math.min(energy + 1, maxEnergy)
    if (newEnergy > energy && newEnergy === maxEnergy) {
      set({ energy: newEnergy })
      get().activateBoost()
    } else {
      set({ energy: newEnergy })
    }
  },

  activateBoost: () => {
    const { velocity, baseSpeed } = get()
    set({
      isBoosting: true,
      boostEndTime: performance.now() + 3000,
      velocity: baseSpeed * 1.5,
      energy: 0,
    })
  },

  updateDistance: (delta: number) => {
    const { distance, bestDistance, highScore, gameStatus } = get()
    const newDistance = distance + delta
    const newBest = Math.max(bestDistance, newDistance)
    let newHighScore = highScore
    if (newBest > highScore && gameStatus === 'playing') {
      newHighScore = newBest
      try {
        localStorage.setItem(HIGH_SCORE_KEY, newHighScore.toFixed(1))
      } catch {}
    }
    set({ distance: newDistance, bestDistance: newBest, highScore: newHighScore })
  },

  triggerHit: () => {
    const { baseSpeed } = get()
    set({
      velocity: baseSpeed * 0.3,
      shakeIntensity: 1,
      flashIntensity: 1,
    })
    setTimeout(() => {
      set({ shakeIntensity: 0, flashIntensity: 0 })
    }, 300)
    setTimeout(() => {
      set({ velocity: baseSpeed })
    }, 1000)
  },

  setGameStatus: (status: GameStatus) => set({ gameStatus: status }),

  setCameraPitch: (angle: number) => set({ cameraPitch: Math.max(20, Math.min(60, angle)) }),

  setVelocity: (v: number) => set({ velocity: v }),

  resetGame: () => {
    const highScore = get().highScore
    set({
      playerX: 0,
      playerZ: 0,
      velocity: 30,
      baseSpeed: 30,
      isBoosting: false,
      boostEndTime: 0,
      energy: 0,
      distance: 0,
      bestDistance: 0,
      highScore,
      gameStatus: 'playing',
      cameraPitch: 40,
      shakeIntensity: 0,
      flashIntensity: 0,
    })
  },
}))
