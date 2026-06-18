import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../game/GameLoop'
import { MAP_WIDTH, MAP_HEIGHT, BG_COLOR, OBSTACLE_COLOR, obstacles, getRayObstacleIntersection } from '../game/Map'
import { EnemyStateData, ENEMY_SIZE, ENEMY_VISION_ANGLE, ENEMY_VISION_RADIUS } from '../game/EnemyAI'
import { DECOY_RADIUS, DECOY_BLINK_PERIOD, DECOY_DURATION, DECOY_COOLDOWN } from '../game/Player'

const UI_BG = '#1a1a2e'
const UI_PADDING = 15
const UI_WIDTH = 220

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: MAP_WIDTH, height: MAP_HEIGHT })

  const init = useGameStore((state) => state.init)
  const destroy = useGameStore((state) => state.destroy)
  const gameState = useGameStore((state) => state)

  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return
      const container = containerRef.current
      const aspectRatio = MAP_WIDTH / MAP_HEIGHT
      let w = container.clientWidth
      let h = container.clientHeight
      if (w / h > aspectRatio) {
        w = h * aspectRatio
      } else {
        h = w / aspectRatio
      }
      setCanvasSize({ width: w, height: h })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = MAP_WIDTH
    canvas.height = MAP_HEIGHT

    init(canvas)
    return () => {
      destroy()
    }
  }, [init, destroy])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      drawScene(ctx, gameState)
      animFrameRef.current = requestAnimationFrame(render)
    }
    animFrameRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [gameState])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: UI_BG,
      }}
    >
      <div style={{ position: 'relative', width: canvasSize.width, height: canvasSize.height }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            borderRadius: '8px',
            boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
          }}
        />
      </div>
    </div>
  )
}

function drawScene(ctx: CanvasRenderingContext2D, state: any) {
  const now = performance.now()

  ctx.fillStyle = BG_COLOR
  ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

  drawGrid(ctx)
  drawObstacles(ctx)
  drawDecoys(ctx, state.decoys, now)
  drawVisionCones(ctx, state.enemies)
  drawEnemies(ctx, state.enemies, now)
  drawPlayer(ctx, state.player)
  drawOccludedEnemyHints(ctx, state.enemies, state.player)
  drawUI(ctx, state)
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.lineWidth = 1
  const gridSize = 50

  for (let x = 0; x <= MAP_WIDTH; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, MAP_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= MAP_HEIGHT; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(MAP_WIDTH, y)
    ctx.stroke()
  }
}

function drawObstacles(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = OBSTACLE_COLOR
  ctx.strokeStyle = '#6a6a6a'
  ctx.lineWidth = 2

  for (const obs of obstacles) {
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height)
    ctx.strokeRect(obs.x, obs.y, obs.width, obs.height)
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: { x: number; y: number; radius: number }) {
  const gradient = ctx.createRadialGradient(
    player.x, player.y, 0,
    player.x, player.y, player.radius * 2.5
  )
  gradient.addColorStop(0, 'rgba(255, 230, 0, 0.4)')
  gradient.addColorStop(1, 'rgba(255, 230, 0, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(player.x, player.y, player.radius * 2.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#FFE600'
  ctx.beginPath()
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#FFD000'
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawEnemies(ctx: CanvasRenderingContext2D, enemies: EnemyStateData[], now: number) {
  for (const enemy of enemies) {
    if (!enemy.isVisible) continue

    drawEnemyTriangle(ctx, enemy)

    if (enemy.state === 'alert') {
      drawExclamationMark(ctx, enemy, now)
    }
  }
}

function drawEnemyTriangle(ctx: CanvasRenderingContext2D, enemy: EnemyStateData) {
  const size = ENEMY_SIZE
  const angle = enemy.angle

  ctx.save()
  ctx.translate(enemy.x, enemy.y)
  ctx.rotate(angle)

  let fillColor = '#FF3333'
  let strokeColor = '#CC0000'
  if (enemy.state === 'alert') {
    fillColor = '#FF6600'
    strokeColor = '#CC5500'
  } else if (enemy.state === 'chase') {
    fillColor = '#FF0000'
    strokeColor = '#AA0000'
  }

  ctx.fillStyle = fillColor
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(size, 0)
  ctx.lineTo(-size * 0.7, -size * 0.7)
  ctx.lineTo(-size * 0.7, size * 0.7)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

function drawExclamationMark(ctx: CanvasRenderingContext2D, enemy: EnemyStateData, now: number) {
  const bounce = Math.sin(now / 80) * 0.5 + 0.5
  const size = 20 + bounce * 10

  const x = enemy.x
  const y = enemy.y - ENEMY_SIZE - 15

  ctx.font = `bold ${size}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillStyle = '#FFDD00'
  ctx.strokeStyle = '#FF6600'
  ctx.lineWidth = 3
  ctx.strokeText('!', x, y)
  ctx.fillText('!', x, y)
}

function drawVisionCones(ctx: CanvasRenderingContext2D, enemies: EnemyStateData[]) {
  for (const enemy of enemies) {
    if (!enemy.isVisible) continue

    const startAngle = enemy.angle - ENEMY_VISION_ANGLE / 2
    const endAngle = enemy.angle + ENEMY_VISION_ANGLE / 2

    let fillColor = 'rgba(255, 50, 50, 0.15)'
    if (enemy.state === 'alert') {
      fillColor = 'rgba(255, 150, 0, 0.25)'
    } else if (enemy.state === 'chase') {
      fillColor = 'rgba(255, 0, 0, 0.3)'
    }

    ctx.fillStyle = fillColor
    ctx.beginPath()
    ctx.moveTo(enemy.x, enemy.y)
    ctx.arc(enemy.x, enemy.y, ENEMY_VISION_RADIUS, startAngle, endAngle)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(enemy.x, enemy.y)
    ctx.lineTo(
      enemy.x + Math.cos(startAngle) * ENEMY_VISION_RADIUS,
      enemy.y + Math.sin(startAngle) * ENEMY_VISION_RADIUS
    )
    ctx.moveTo(enemy.x, enemy.y)
    ctx.lineTo(
      enemy.x + Math.cos(endAngle) * ENEMY_VISION_RADIUS,
      enemy.y + Math.sin(endAngle) * ENEMY_VISION_RADIUS
    )
    ctx.stroke()
  }
}

function drawDecoys(ctx: CanvasRenderingContext2D, decoys: any[], now: number) {
  for (const decoy of decoys) {
    const age = now - decoy.spawnTime
    const blinkPhase = Math.floor(age / (DECOY_BLINK_PERIOD / 2)) % 2
    const isBright = blinkPhase === 0

    const lifeRatio = 1 - age / DECOY_DURATION
    const alpha = Math.max(0.3, lifeRatio)

    const glowRadius = DECOY_RADIUS * (isBright ? 2.5 : 1.8)
    const gradient = ctx.createRadialGradient(
      decoy.x, decoy.y, 0,
      decoy.x, decoy.y, glowRadius
    )
    gradient.addColorStop(0, `rgba(0, 255, 100, ${alpha * 0.6})`)
    gradient.addColorStop(1, `rgba(0, 255, 100, 0)`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(decoy.x, decoy.y, glowRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = isBright ? `rgba(0, 255, 120, ${alpha})` : `rgba(0, 200, 100, ${alpha * 0.6})`
    ctx.beginPath()
    ctx.arc(decoy.x, decoy.y, DECOY_RADIUS, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = `rgba(150, 255, 180, ${alpha})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawOccludedEnemyHints(
  ctx: CanvasRenderingContext2D,
  enemies: EnemyStateData[],
  player: { x: number; y: number }
) {
  for (const enemy of enemies) {
    if (enemy.isVisible) continue

    const intersection = getRayObstacleIntersection(
      player.x, player.y,
      enemy.x, enemy.y
    )

    if (!intersection) continue

    const dx = enemy.x - player.x
    const dy = enemy.y - player.y
    const dist = Math.hypot(dx, dy)
    const nx = dx / dist
    const ny = dy / dist

    const hintRadius = ENEMY_SIZE * 0.8

    let hintX = intersection.x + nx * 5
    let hintY = intersection.y + ny * 5

    if (Math.hypot(hintX - player.x, hintY - player.y) > dist) {
      hintX = enemy.x
      hintY = enemy.y
    }

    ctx.save()
    ctx.globalAlpha = 0.4
    ctx.strokeStyle = '#FF4444'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.arc(hintX, hintY, hintRadius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

function drawUI(ctx: CanvasRenderingContext2D, state: any) {
  const uiX = UI_PADDING
  const uiY = UI_PADDING
  const uiW = UI_WIDTH
  let uiH = 100

  uiH = 80 + state.enemies.length * 30 + 50

  ctx.fillStyle = 'rgba(26, 26, 46, 0.9)'
  ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(uiX, uiY, uiW, uiH, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 14px Microsoft YaHei'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('暗域回声', uiX + 12, uiY + 12)

  ctx.fillStyle = '#AAAAAA'
  ctx.font = '11px Microsoft YaHei'
  ctx.fillText('Dark Domain Echo', uiX + 12, uiY + 30)

  ctx.fillStyle = '#CCCCCC'
  ctx.font = '12px Microsoft YaHei'
  ctx.fillText('敌人状态', uiX + 12, uiY + 50)

  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i]
    const y = uiY + 70 + i * 30

    let stateText = '巡逻'
    let stateColor = '#44FF44'
    if (enemy.state === 'alert') {
      stateText = '警戒'
      stateColor = '#FFAA00'
    } else if (enemy.state === 'chase') {
      stateText = '追击'
      stateColor = '#FF4444'
    }

    ctx.fillStyle = '#888888'
    ctx.fillText(`敌人${i + 1}:`, uiX + 12, y)

    ctx.fillStyle = stateColor
    ctx.font = 'bold 12px Microsoft YaHei'
    ctx.fillText(stateText, uiX + 70, y)
    ctx.font = '12px Microsoft YaHei'
  }

  const cooldownY = uiY + 70 + state.enemies.length * 30 + 10
  const cooldownRatio = 1 - state.decoyCooldown / DECOY_COOLDOWN

  ctx.fillStyle = '#CCCCCC'
  ctx.fillText('诱饵 [E]', uiX + 12, cooldownY)

  const barX = uiX + 12
  const barY = cooldownY + 20
  const barW = uiW - 24
  const barH = 6

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.fillRect(barX, barY, barW, barH)

  const barColor = cooldownRatio >= 1 ? '#00FF66' : '#FFAA00'
  ctx.fillStyle = barColor
  ctx.fillRect(barX, barY, barW * Math.min(1, cooldownRatio), barH)

  const cooldownText = cooldownRatio >= 1
    ? '就绪'
    : `${(state.decoyCooldown / 1000).toFixed(1)}s`
  ctx.fillStyle = '#AAAAAA'
  ctx.font = '10px Microsoft YaHei'
  ctx.textAlign = 'right'
  ctx.fillText(cooldownText, uiX + uiW - 12, barY - 2)
  ctx.textAlign = 'left'

  const fpsY = uiY + uiH - 20
  ctx.fillStyle = '#666666'
  ctx.font = '10px Consolas'
  ctx.textAlign = 'right'
  ctx.fillText(`FPS: ${state.fps}`, uiX + uiW - 12, fpsY)
  ctx.textAlign = 'left'
}
