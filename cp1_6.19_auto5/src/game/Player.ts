import { v4 as uuidv4 } from 'uuid'
import { useGameStore } from '../state/gameStore'
import type { GameMap } from './Map'
import { CELL_SIZE, GRID_WIDTH, GRID_HEIGHT } from './Map'

const BASE_SPEED = 3
const SPRINT_SPEED = 6
const STAMINA_MAX = 100
const STAMINA_REGEN = 10
const SPRINT_COST = 20
const PLAYER_RADIUS = 8
const CRYSTAL_COLLECT_DISTANCE = 20
const PORTAL_TRIGGER_DISTANCE = 20

export class Player {
  private keys: Set<string> = new Set()
  private gameMap: GameMap
  private glowPhase: number = 0

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap
  }

  handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase())
  }

  handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase())
  }

  update(deltaTime: number): void {
    const state = useGameStore.getState()

    if (state.gameStatus !== 'playing') return

    const isSprinting = this.keys.has('shift') && state.stamina > 0
    const speed = isSprinting ? SPRINT_SPEED : BASE_SPEED

    let dx = 0
    let dy = 0

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1

    if (dx !== 0 && dy !== 0) {
      const factor = 1 / Math.sqrt(2)
      dx *= factor
      dy *= factor
    }

    dx *= speed
    dy *= speed

    let newX = state.playerX + dx
    let newY = state.playerY + dy

    if (this.gameMap.checkCollision(newX, state.playerY, PLAYER_RADIUS)) {
      newX = state.playerX
    }

    if (this.gameMap.checkCollision(state.playerX, newY, PLAYER_RADIUS)) {
      newY = state.playerY
    }

    if (this.gameMap.checkCollision(newX, newY, PLAYER_RADIUS)) {
      newX = state.playerX
      newY = state.playerY
    }

    const maxX = GRID_WIDTH * CELL_SIZE - PLAYER_RADIUS
    const maxY = GRID_HEIGHT * CELL_SIZE - PLAYER_RADIUS
    newX = Math.max(PLAYER_RADIUS, Math.min(maxX, newX))
    newY = Math.max(PLAYER_RADIUS, Math.min(maxY, newY))

    state.setPlayerPos(newX, newY)

    let newStamina = state.stamina
    if (isSprinting && (dx !== 0 || dy !== 0)) {
      newStamina -= SPRINT_COST * deltaTime
    } else {
      newStamina += STAMINA_REGEN * deltaTime
    }
    state.setStamina(Math.max(0, Math.min(STAMINA_MAX, newStamina)))

    this.checkCrystalCollision()
    this.checkLavaCollision()
    this.checkPortalCollision()

    this.glowPhase += deltaTime * 2
  }

  private checkCrystalCollision(): void {
    const state = useGameStore.getState()

    for (const crystal of state.crystals) {
      if (crystal.collected) continue

      const dist = Math.hypot(state.playerX - crystal.x, state.playerY - crystal.y)
      if (dist < CRYSTAL_COLLECT_DISTANCE) {
        state.collectCrystal(crystal.id)
        this.spawnCollectParticles(crystal.x, crystal.y)

        const newState = useGameStore.getState()
        const remaining = newState.crystals.filter((c) => !c.collected).length
        if (remaining === 0) {
          state.setPortalActive(true)
          state.setFlashEffect(0.1)
        }
      }
    }
  }

  private spawnCollectParticles(x: number, y: number): void {
    const state = useGameStore.getState()
    const numParticles = 8

    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2 + Math.random() * 0.3
      const speed = 50 + Math.random() * 50

      state.addParticle({
        id: uuidv4(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        color: '#ffd700',
        size: 3 + Math.random() * 2,
      })
    }
  }

  private checkLavaCollision(): void {
    const state = useGameStore.getState()

    if (state.playerY < state.lavaHeight) {
      if (state.gameStatus === 'playing') {
        state.setGameStatus('lost')
      }
    }
  }

  private checkPortalCollision(): void {
    const state = useGameStore.getState()

    if (!state.portal.active) return

    const dist = Math.hypot(state.playerX - state.portal.x, state.playerY - state.portal.y)
    if (dist < PORTAL_TRIGGER_DISTANCE) {
      if (state.gameStatus === 'playing') {
        const collectedCount = state.crystals.filter((c) => c.collected).length
        const timeBonus = Math.max(0, 300 - state.timeElapsed) * 10
        const crystalScore = collectedCount * 100
        const totalScore = Math.floor(timeBonus + crystalScore)

        state.setScore(totalScore)
        state.setGameStatus('won')
      }
    }
  }

  getGlowPhase(): number {
    return this.glowPhase
  }
}
