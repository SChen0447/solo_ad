import { useGameStore } from '../state/gameStore'
import type { GameMap } from './Map'
import type { Player } from './Player'
import type { Lava } from './Lava'

const TARGET_FPS = 60
const LOW_FPS_THRESHOLD = 45
const FPS_SMOOTHING = 0.9

export class GameLoop {
  private animationFrameId: number | null = null
  private lastTime: number = 0
  private deltaTime: number = 0
  private fps: number = 60
  private fpsAccumulator: number = 0
  private fpsFrameCount: number = 0
  private running: boolean = false
  private gameMap: GameMap
  private player: Player
  private lava: Lava
  private frameCount: number = 0
  private lastFpsLog: number = 0

  constructor(gameMap: GameMap, player: Player, lava: Lava) {
    this.gameMap = gameMap
    this.player = player
    this.lava = lava
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.lastFpsLog = this.lastTime
    this.loop()
  }

  stop(): void {
    this.running = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private loop = (): void => {
    if (!this.running) return

    const currentTime = performance.now()
    this.deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime

    const instantFps = 1 / Math.max(this.deltaTime, 0.001)
    this.fps = this.fps * FPS_SMOOTHING + instantFps * (1 - FPS_SMOOTHING)

    this.fpsAccumulator += this.deltaTime
    this.fpsFrameCount++

    if (currentTime - this.lastFpsLog >= 1000) {
      console.log(`FPS: ${this.fps.toFixed(1)}`)
      this.lastFpsLog = currentTime
    }

    const lowFpsMode = this.fps < LOW_FPS_THRESHOLD
    useGameStore.getState().setLowFpsMode(lowFpsMode)

    this.update(this.deltaTime, lowFpsMode)

    this.frameCount++
    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  private update(deltaTime: number, lowFpsMode: boolean): void {
    const state = useGameStore.getState()

    if (state.gameStatus === 'playing') {
      state.setTimeElapsed(state.timeElapsed + deltaTime)

      const portalRotationSpeed = state.portal.active ? 5 : 1
      state.setPortalRotation(state.portal.rotation + portalRotationSpeed * deltaTime)
    }

    this.player.update(deltaTime)
    this.lava.update(deltaTime, lowFpsMode)
    state.updateParticles(deltaTime)
    this.updateCrystalProgress(deltaTime)

    if (state.flashEffect > 0) {
      const newFlash = state.flashEffect - deltaTime
      state.setFlashEffect(Math.max(0, newFlash))
    }

    if (state.gameStatus === 'won') {
      const newProgress = Math.min(1, state.victoryProgress + deltaTime)
      state.setVictoryProgress(newProgress)
    }

    this.updateCamera()
  }

  private updateCrystalProgress(deltaTime: number): void {
    const state = useGameStore.getState()
    const updatedCrystals = state.crystals.map((c) => {
      if (c.collected && c.collectProgress > 0) {
        return { ...c, collectProgress: Math.max(0, c.collectProgress - deltaTime) }
      }
      return c
    })

    const hasChanges = updatedCrystals.some((c, i) => c.collectProgress !== state.crystals[i].collectProgress)
    if (hasChanges) {
      useGameStore.setState({ crystals: updatedCrystals })
    }
  }

  private updateCamera(): void {
    const state = useGameStore.getState()
    const canvasWidth = 800
    const canvasHeight = 600
    const mapWidth = 60 * 20
    const mapHeight = 60 * 20

    let targetX = state.playerX - canvasWidth / 2
    let targetY = state.playerY - canvasHeight / 2

    targetX = Math.max(0, Math.min(targetX, mapWidth - canvasWidth))
    targetY = Math.max(0, Math.min(targetY, mapHeight - canvasHeight))

    const smoothing = 0.1
    const newCamX = state.cameraX + (targetX - state.cameraX) * smoothing
    const newCamY = state.cameraY + (targetY - state.cameraY) * smoothing

    state.setCamera(newCamX, newCamY)
  }

  getDeltaTime(): number {
    return this.deltaTime
  }

  getFps(): number {
    return this.fps
  }

  isRunning(): boolean {
    return this.running
  }
}
