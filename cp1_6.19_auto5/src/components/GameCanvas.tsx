import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../state/gameStore'
import { GameMap, CELL_SIZE, GRID_WIDTH, GRID_HEIGHT } from '../game/Map'
import { Player } from '../game/Player'
import { Lava } from '../game/Lava'
import { GameLoop } from '../game/GameLoop'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameMapRef = useRef<GameMap | null>(null)
  const playerRef = useRef<Player | null>(null)
  const lavaRef = useRef<Lava | null>(null)
  const gameLoopRef = useRef<GameLoop | null>(null)
  const renderFrameRef = useRef<number | null>(null)
  const [gameStarted, setGameStarted] = useState(false)

  const gameStatus = useGameStore((s) => s.gameStatus)

  useEffect(() => {
    const gameMap = new GameMap()
    gameMap.generate()
    gameMapRef.current = gameMap

    const player = new Player(gameMap)
    playerRef.current = player

    const lava = new Lava()
    lavaRef.current = lava

    const startPos = gameMap.getStartPosition()
    const crystalsList = gameMap.getCrystals()
    const portalData = gameMap.getPortal()

    useGameStore.getState().resetGame({
      playerX: startPos.x,
      playerY: startPos.y,
      crystals: crystalsList,
      portal: portalData,
    })

    const gameLoop = new GameLoop(gameMap, player, lava)
    gameLoopRef.current = gameLoop
    gameLoop.start()

    const handleKeyDown = (e: KeyboardEvent) => {
      player.handleKeyDown(e.key)
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      player.handleKeyUp(e.key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    setGameStarted(true)

    return () => {
      gameLoop.stop()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!gameStarted) return

    const render = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const state = useGameStore.getState()

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      drawBackground(ctx)
      drawMap(ctx, state.cameraX, state.cameraY)
      drawCrystals(ctx, state.cameraX, state.cameraY, state.crystals)
      drawPortal(ctx, state.cameraX, state.cameraY, state.portal)
      drawLava(ctx, state.cameraX, state.cameraY, state.lavaHeight)
      drawParticles(ctx, state.cameraX, state.cameraY, state.particles)
      drawPlayer(ctx, state.cameraX, state.cameraY, state.playerX, state.playerY, state.playerRadius)
      drawHUD(ctx, state.stamina, state.maxStamina, state.lavaHeight, state.crystals, state.lowFpsMode)
      drawFlashEffect(ctx, state.flashEffect)
      drawVictoryEffect(ctx, state.victoryProgress, state.score, state.timeElapsed, state.gameStatus)
      drawGameOver(ctx, state.gameStatus, state.crystals)

      renderFrameRef.current = requestAnimationFrame(render)
    }

    renderFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (renderFrameRef.current) {
        cancelAnimationFrame(renderFrameRef.current)
      }
    }
  }, [gameStarted])

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      0,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH / 2
    )
    gradient.addColorStop(0, '#1a1a1a')
    gradient.addColorStop(1, '#0d0d0d')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  const drawMap = (ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) => {
    if (!gameMapRef.current) return

    const wallRects = gameMapRef.current.getWallRects()

    ctx.save()
    ctx.translate(-cameraX, -cameraY)

    ctx.fillStyle = '#2c2c2c'
    for (const rect of wallRects) {
      if (
        rect.x + rect.w < cameraX - 10 ||
        rect.x > cameraX + CANVAS_WIDTH + 10 ||
        rect.y + rect.h < cameraY - 10 ||
        rect.y > cameraY + CANVAS_HEIGHT + 10
      ) {
        continue
      }
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    }

    ctx.fillStyle = '#3a3a3a'
    for (const rect of wallRects) {
      if (
        rect.x + rect.w < cameraX - 10 ||
        rect.x > cameraX + CANVAS_WIDTH + 10 ||
        rect.y + rect.h < cameraY - 10 ||
        rect.y > cameraY + CANVAS_HEIGHT + 10
      ) {
        continue
      }
      ctx.fillRect(rect.x, rect.y, rect.w, 2)
      ctx.fillRect(rect.x, rect.y, 2, rect.h)
    }

    ctx.restore()
  }

  const drawCrystals = (
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    crystals: ReturnType<typeof useGameStore.getState>['crystals']
  ) => {
    ctx.save()
    ctx.translate(-cameraX, -cameraY)

    const time = performance.now() / 1000

    for (const crystal of crystals) {
      if (crystal.collected && crystal.collectProgress <= 0) continue

      const scale = crystal.collected ? crystal.collectProgress / 0.3 : 1
      const alpha = crystal.collected ? crystal.collectProgress / 0.3 : 1

      if (scale <= 0 || alpha <= 0) continue

      const x = crystal.x
      const y = crystal.y
      const size = 8 * scale

      const glowIntensity = 0.5 + Math.sin(time * 3 + crystal.x * 0.1) * 0.2

      ctx.save()
      ctx.globalAlpha = alpha * glowIntensity
      ctx.shadowColor = '#00bfff'
      ctx.shadowBlur = 15
      ctx.fillStyle = '#00bfff'

      ctx.beginPath()
      ctx.moveTo(x, y - size)
      ctx.lineTo(x + size * 0.6, y)
      ctx.lineTo(x, y + size)
      ctx.lineTo(x - size * 0.6, y)
      ctx.closePath()
      ctx.fill()

      ctx.globalAlpha = alpha
      ctx.fillStyle = crystal.collected ? '#ffffff' : '#87ceeb'
      ctx.beginPath()
      ctx.moveTo(x, y - size * 0.5)
      ctx.lineTo(x + size * 0.3, y)
      ctx.lineTo(x, y + size * 0.5)
      ctx.lineTo(x - size * 0.3, y)
      ctx.closePath()
      ctx.fill()

      ctx.restore()
    }

    ctx.restore()
  }

  const drawPortal = (
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    portal: ReturnType<typeof useGameStore.getState>['portal']
  ) => {
    ctx.save()
    ctx.translate(-cameraX, -cameraY)

    const x = portal.x
    const y = portal.y
    const baseRadius = portal.active ? 18 : 16
    const time = performance.now() / 1000

    if (portal.active) {
      const pulseScale = 1 + Math.sin(time * 4) * 0.1

      ctx.save()
      ctx.shadowColor = '#aa00ff'
      ctx.shadowBlur = 30
      ctx.strokeStyle = '#aa00ff'
      ctx.lineWidth = 3

      ctx.translate(x, y)
      ctx.rotate(portal.rotation)

      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        const px = Math.cos(angle) * baseRadius * pulseScale
        const py = Math.sin(angle) * baseRadius * pulseScale
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(0, 0, baseRadius * 0.5 * pulseScale, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(170, 0, 255, 0.5)'
      ctx.fill()

      ctx.restore()
    } else {
      ctx.save()
      ctx.strokeStyle = '#800080'
      ctx.lineWidth = 2

      ctx.translate(x, y)
      ctx.rotate(portal.rotation)

      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2
        const px = Math.cos(angle) * baseRadius
        const py = Math.sin(angle) * baseRadius
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()

      ctx.restore()
    }

    ctx.restore()
  }

  const drawLava = (
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    lavaHeight: number
  ) => {
    if (!lavaRef.current) return

    ctx.save()
    ctx.translate(-cameraX, -cameraY)

    const mapPixelWidth = GRID_WIDTH * CELL_SIZE

    const gradient = ctx.createLinearGradient(0, lavaHeight - 50, 0, lavaHeight)
    gradient.addColorStop(0, 'rgba(139, 0, 0, 0)')
    gradient.addColorStop(0.5, '#8b0000')
    gradient.addColorStop(1, '#ff4500')

    ctx.fillStyle = gradient
    ctx.globalCompositeOperation = 'source-over'

    ctx.beginPath()
    ctx.moveTo(cameraX - 10, lavaHeight)

    const step = 5
    for (let x = cameraX - 10; x <= cameraX + CANVAS_WIDTH + 10; x += step) {
      const waveY = lavaRef.current.getSurfaceHeight(x, lavaHeight)
      ctx.lineTo(x, waveY)
    }

    ctx.lineTo(cameraX + CANVAS_WIDTH + 10, cameraY + CANVAS_HEIGHT + 10)
    ctx.lineTo(cameraX - 10, cameraY + CANVAS_HEIGHT + 10)
    ctx.closePath()
    ctx.fill()

    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(255, 99, 71, 0.3)'
    ctx.fillRect(cameraX - 10, lavaHeight - 5, mapPixelWidth + 20, 30)

    ctx.restore()
  }

  const drawParticles = (
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    particles: ReturnType<typeof useGameStore.getState>['particles']
  ) => {
    ctx.save()
    ctx.translate(-cameraX, -cameraY)

    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    playerX: number,
    playerY: number,
    playerRadius: number
  ) => {
    ctx.save()
    ctx.translate(-cameraX, -cameraY)

    const time = performance.now() / 1000
    const breatheScale = 1 + Math.sin(time * 2) * 0.1

    const glowRadius = playerRadius * 2.5 * breatheScale
    const glowGradient = ctx.createRadialGradient(
      playerX,
      playerY,
      0,
      playerX,
      playerY,
      glowRadius
    )
    glowGradient.addColorStop(0, 'rgba(224, 240, 255, 0.6)')
    glowGradient.addColorStop(0.5, 'rgba(224, 240, 255, 0.2)')
    glowGradient.addColorStop(1, 'rgba(224, 240, 255, 0)')

    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(playerX, playerY, glowRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = '#e0f0ff'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.fillStyle = '#e0f0ff'
    ctx.beginPath()
    ctx.arc(playerX - 2, playerY - 2, playerRadius * 0.4, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  const drawHUD = (
    ctx: CanvasRenderingContext2D,
    stamina: number,
    maxStamina: number,
    lavaHeight: number,
    crystals: ReturnType<typeof useGameStore.getState>['crystals'],
    lowFpsMode: boolean
  ) => {
    ctx.save()

    const staminaBarWidth = 200
    const staminaBarHeight = 12
    const staminaX = 20
    const staminaY = 20
    const staminaPercent = stamina / maxStamina

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(staminaX - 2, staminaY - 2, staminaBarWidth + 4, staminaBarHeight + 4)

    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)'
    ctx.fillRect(staminaX, staminaY, staminaBarWidth, staminaBarHeight)

    ctx.fillStyle = '#ff9800'
    ctx.fillRect(staminaX, staminaY, staminaBarWidth * staminaPercent, staminaBarHeight)

    ctx.fillStyle = '#ffffff'
    ctx.font = '16px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`熔岩: ${Math.floor(lavaHeight)}px`, CANVAS_WIDTH - 20, 35)

    const collectedCount = crystals.filter((c) => c.collected).length
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.font = '18px monospace'
    ctx.textAlign = 'left'

    const crystalText = `水晶: ${collectedCount}/${crystals.length}`
    const textWidth = ctx.measureText(crystalText).width
    ctx.fillRect(15, CANVAS_HEIGHT - 40, textWidth + 20, 30)

    ctx.fillStyle = '#ffffff'
    ctx.fillText(crystalText, 25, CANVAS_HEIGHT - 18)

    if (lowFpsMode) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)'
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('低帧率模式', CANVAS_WIDTH / 2, 50)
    }

    ctx.restore()
  }

  const drawFlashEffect = (ctx: CanvasRenderingContext2D, flashEffect: number) => {
    if (flashEffect <= 0) return

    const alpha = flashEffect / 0.1
    ctx.save()
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.restore()
  }

  const drawVictoryEffect = (
    ctx: CanvasRenderingContext2D,
    victoryProgress: number,
    score: number,
    timeElapsed: number,
    gameStatus: string
  ) => {
    if (gameStatus !== 'won') return

    ctx.save()

    const progress = victoryProgress
    const borderSize = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.5 * progress

    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      0,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH / 2
    )
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0)')
    gradient.addColorStop(Math.max(0, 1 - borderSize / (CANVAS_WIDTH / 2) - 0.1), 'rgba(255, 215, 0, 0)')
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0.8)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    if (progress >= 0.5) {
      const panelAlpha = (progress - 0.5) * 2
      ctx.globalAlpha = panelAlpha

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.fillRect(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT / 2 - 120, 400, 240)

      ctx.fillStyle = '#ffd700'
      ctx.font = 'bold 36px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('胜利!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60)

      ctx.fillStyle = '#ffffff'
      ctx.font = '20px monospace'
      ctx.fillText(`得分: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
      ctx.fillText(
        `时间: ${timeElapsed.toFixed(1)}秒`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 35
      )

      ctx.fillStyle = '#888888'
      ctx.font = '14px monospace'
      ctx.fillText('按 R 键重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80)
    }

    ctx.restore()
  }

  const drawGameOver = (
    ctx: CanvasRenderingContext2D,
    gameStatus: string,
    crystals: ReturnType<typeof useGameStore.getState>['crystals']
  ) => {
    if (gameStatus !== 'lost') return

    ctx.save()

    const flashTime = (performance.now() / 1000) % 1
    const flashAlpha = flashTime < 0.3 ? 1 - flashTime / 0.3 : 0

    ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha * 0.3})`
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
    ctx.fillRect(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT / 2 - 100, 400, 200)

    ctx.fillStyle = '#ff4444'
    ctx.font = 'bold 36px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('游戏结束', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)

    ctx.fillStyle = '#ffffff'
    ctx.font = '18px monospace'
    const collected = crystals.filter((c) => c.collected).length
    ctx.fillText(
      `已采集水晶: ${collected}/${crystals.length}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 15
    )

    ctx.fillStyle = '#888888'
    ctx.font = '14px monospace'
    ctx.fillText('按 R 键重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 55)

    ctx.restore()
  }

  const handleRestart = () => {
    if (!gameMapRef.current) return

    gameMapRef.current.generate()
    const startPos = gameMapRef.current.getStartPosition()
    const crystalsList = gameMapRef.current.getCrystals()
    const portalData = gameMapRef.current.getPortal()

    useGameStore.getState().resetGame({
      playerX: startPos.x,
      playerY: startPos.y,
      crystals: crystalsList,
      portal: portalData,
    })

    if (lavaRef.current) {
      lavaRef.current.reset()
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && gameStatus !== 'playing') {
        handleRestart()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [gameStatus])

  return (
    <div
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        position: 'relative',
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  )
}
