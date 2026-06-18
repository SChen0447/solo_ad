import { create } from 'zustand'

export interface Vec2 {
  x: number
  z: number
}

export interface Rune {
  id: number
  position: Vec2
  color: string
  activated: boolean
  activationTime: number
  pulsePhase: number
}

export interface Tentacle {
  id: number
  segments: Vec2[]
  speed: number
  spawnTime: number
}

export interface Particle {
  id: number
  position: Vec2
  life: number
  maxLife: number
  color: string
  size: number
  velocity: Vec2
}

export type GamePhase = 'start' | 'playing' | 'victory' | 'gameover'

export interface GameState {
  phase: GamePhase
  lives: number
  maxLives: number
  runes: Rune[]
  totalRunes: number
  activatedRunes: number
  sigil: Vec2
  sigilVelocity: Vec2
  isBoosting: boolean
  boostCooldown: number
  boostActiveTime: number
  tentacles: Tentacle[]
  particles: Particle[]
  portalActive: boolean
  portalPosition: Vec2
  damageFlash: boolean
  damageFlashTime: number

  setPhase: (phase: GamePhase) => void
  resetGame: () => void
  startGame: () => void
  loseLife: () => void
  activateRune: (id: number) => void
  setSigilPosition: (pos: Vec2) => void
  setSigilVelocity: (vel: Vec2) => void
  setBoostState: (active: boolean, cooldown: number, activeTime: number) => void
  setTentacles: (tentacles: Tentacle[]) => void
  setParticles: (particles: Particle[]) => void
  setPortalActive: (active: boolean) => void
  triggerDamageFlash: () => void
  setDamageFlash: (active: boolean, time: number) => void
  completeVictory: () => void
}

const RUNE_COLORS = [
  '#ff6b9d', '#c084fc', '#818cf8', '#60a5fa',
  '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#22d3ee', '#fb923c'
]

function generateRunes(): Rune[] {
  const runes: Rune[] = []
  const count = 25
  const mapSize = 14

  for (let i = 0; i < count; i++) {
    let pos: Vec2
    let valid = false
    let attempts = 0

    while (!valid && attempts < 100) {
      pos = {
        x: (Math.random() - 0.5) * mapSize,
        z: (Math.random() - 0.5) * mapSize
      }
      valid = true
      attempts++

      for (const r of runes) {
        const dx = r.position.x - pos.x
        const dz = r.position.z - pos.z
        if (Math.sqrt(dx * dx + dz * dz) < 2) {
          valid = false
          break
        }
      }
    }

    runes.push({
      id: i,
      position: pos!,
      color: RUNE_COLORS[i % RUNE_COLORS.length],
      activated: false,
      activationTime: 0,
      pulsePhase: Math.random() * Math.PI * 2
    })
  }

  return runes
}

const initialSigil = { x: 0, z: 0 }

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'start',
  lives: 5,
  maxLives: 5,
  runes: [],
  totalRunes: 25,
  activatedRunes: 0,
  sigil: initialSigil,
  sigilVelocity: { x: 0, z: 0 },
  isBoosting: false,
  boostCooldown: 0,
  boostActiveTime: 0,
  tentacles: [],
  particles: [],
  portalActive: false,
  portalPosition: { x: 0, z: 0 },
  damageFlash: false,
  damageFlashTime: 0,

  setPhase: (phase) => set({ phase }),

  resetGame: () => set({
    phase: 'start',
    lives: 5,
    runes: [],
    activatedRunes: 0,
    sigil: initialSigil,
    sigilVelocity: { x: 0, z: 0 },
    isBoosting: false,
    boostCooldown: 0,
    boostActiveTime: 0,
    tentacles: [],
    particles: [],
    portalActive: false,
    damageFlash: false,
    damageFlashTime: 0
  }),

  startGame: () => set({
    phase: 'playing',
    lives: 5,
    runes: generateRunes(),
    activatedRunes: 0,
    sigil: initialSigil,
    sigilVelocity: { x: 0, z: 0 },
    isBoosting: false,
    boostCooldown: 0,
    boostActiveTime: 0,
    tentacles: [],
    particles: [],
    portalActive: false,
    damageFlash: false,
    damageFlashTime: 0
  }),

  loseLife: () => {
    const { lives } = get()
    const newLives = lives - 1
    if (newLives <= 0) {
      set({ lives: 0, phase: 'gameover' })
    } else {
      set({ lives: newLives })
    }
  },

  activateRune: (id) => {
    const state = get()
    const runes = state.runes.map(r =>
      r.id === id ? { ...r, activated: true, activationTime: Date.now() } : r
    )
    const activated = runes.filter(r => r.activated).length
    const portalActive = activated === runes.length

    set({
      runes,
      activatedRunes: activated,
      portalActive
    })
  },

  setSigilPosition: (pos) => set({ sigil: pos }),
  setSigilVelocity: (vel) => set({ sigilVelocity: vel }),

  setBoostState: (active, cooldown, activeTime) =>
    set({ isBoosting: active, boostCooldown: cooldown, boostActiveTime: activeTime }),

  setTentacles: (tentacles) => set({ tentacles }),
  setParticles: (particles) => set({ particles }),
  setPortalActive: (active) => set({ portalActive: active }),

  triggerDamageFlash: () =>
    set({ damageFlash: true, damageFlashTime: Date.now() }),

  setDamageFlash: (active, time) =>
    set({ damageFlash: active, damageFlashTime: time }),

  completeVictory: () => set({ phase: 'victory' })
}))
