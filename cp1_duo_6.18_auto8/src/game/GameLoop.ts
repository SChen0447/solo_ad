import { create } from 'zustand'
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  obstacles,
  isLineOfSightClear,
  Rect,
} from './Map'
import { PlayerController, Decoy } from './Player'
import { Enemy, EnemyStateData, createEnemies } from './EnemyAI'

export interface GameState {
  mapWidth: number
  mapHeight: number
  obstacles: Rect[]
  player: {
    x: number
    y: number
    radius: number
  }
  enemies: EnemyStateData[]
  decoys: Decoy[]
  decoyCooldown: number
  frameCount: number
  fps: number
}

interface GameStore extends GameState {
  _initialized: boolean
  _playerController: PlayerController | null
  _enemies: Enemy[] | null
  _animationFrameId: number | null
  _lastFrameTime: number
  _frameCount: number
  _fpsUpdateTime: number
  _currentFps: number
  init: (canvas: HTMLCanvasElement) => void
  destroy: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  mapWidth: MAP_WIDTH,
  mapHeight: MAP_HEIGHT,
  obstacles: obstacles,
  player: { x: 100, y: 600, radius: 10 },
  enemies: [],
  decoys: [],
  decoyCooldown: 0,
  frameCount: 0,
  fps: 60,

  _initialized: false,
  _playerController: null,
  _enemies: null,
  _animationFrameId: null,
  _lastFrameTime: 0,
  _frameCount: 0,
  _fpsUpdateTime: 0,
  _currentFps: 60,

  init: (canvas: HTMLCanvasElement) => {
    const state = get()
    if (state._initialized) return

    const player = new PlayerController()
    const enemies = createEnemies()

    const handleKeyDown = (e: KeyboardEvent) => {
      player.handleKeyDown(e.key)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      player.handleKeyUp(e.key)
    }
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      player.updateMousePosition(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
      )
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('mousemove', handleMouseMove)

    set({
      _initialized: true,
      _playerController: player,
      _enemies: enemies,
    })

    const gameLoop = (timestamp: number) => {
      const s = get()
      if (!s._playerController || !s._enemies) return

      if (s._lastFrameTime === 0) {
        s._lastFrameTime = timestamp
        s._fpsUpdateTime = timestamp
      }

      const deltaTime = timestamp - s._lastFrameTime
      s._lastFrameTime = timestamp

      s._frameCount++
      if (timestamp - s._fpsUpdateTime >= 1000) {
        s._currentFps = s._frameCount
        s._frameCount = 0
        s._fpsUpdateTime = timestamp
      }

      s._playerController.update()

      const playerState = s._playerController.getState()

      for (const enemy of s._enemies) {
        enemy.update(
          playerState.x,
          playerState.y,
          playerState.radius,
          playerState.decoys,
          deltaTime
        )
      }

      const enemiesData = s._enemies.map((enemy) => {
        const visible = isLineOfSightClear(
          playerState.x,
          playerState.y,
          enemy.x,
          enemy.y
        )
        return enemy.getStateData(visible)
      })

      set({
        player: {
          x: playerState.x,
          y: playerState.y,
          radius: playerState.radius,
        },
        enemies: enemiesData,
        decoys: playerState.decoys,
        decoyCooldown: playerState.decoyCooldown,
        frameCount: (s.frameCount || 0) + 1,
        fps: s._currentFps,
      })

      const nextId = requestAnimationFrame(gameLoop)
      s._animationFrameId = nextId
    }

    const animId = requestAnimationFrame(gameLoop)
    set({ _animationFrameId: animId })

    const store = get()
    ;(store as any)._cleanup = () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
      if (store._animationFrameId) {
        cancelAnimationFrame(store._animationFrameId)
      }
    }
  },

  destroy: () => {
    const s = get() as any
    if (s._cleanup) {
      s._cleanup()
    }
    set({
      _initialized: false,
      _playerController: null,
      _enemies: null,
      _animationFrameId: null,
    })
  },
}))
