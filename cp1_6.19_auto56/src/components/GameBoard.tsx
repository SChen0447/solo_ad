import React, { useRef, useEffect, useCallback } from 'react'
import { useGameStore, ELEMENT_COLORS, type ElementType, type Position } from '../store/gameStore'
import { ROOM_SIZE, checkRoomCleared, generateDungeon } from '../modules/dungeonGenerator'
import {
  createInputState,
  handlePlayerKeyDown,
  handlePlayerKeyUp,
  updatePlayerMovement,
  playerUseSkill,
  updatePlayerInteraction,
  checkTrapCollision,
  type InputState
} from '../modules/playerController'
import {
  updateAllEnemiesInRoom,
  checkProjectileEnemyHit,
  checkProjectileMechanismHit,
  checkAllMechanismsSolvedForBoss,
  distance
} from '../modules/enemyAI'
import UIPanel from './UIPanel'

const CELL_SIZE = 32
const WALL_HEIGHT = 2 * CELL_SIZE

const GameBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<InputState>(createInputState())
  const lastTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number>(0)
  const mouseRef = useRef<Position>({ x: 0, y: 0 })
  const lastTrapDamageRef = useRef<Map<string, number>>(new Map())
  const hoveredEntityRef = useRef<string | null>(null)

  const gameState = useGameStore()

  const store = useGameStore

  useEffect(() => {
    const dungeon = generateDungeon(1)
    store.getState().setDungeon(dungeon)
    store.getState().addLog('欢迎来到元素裂隙！使用WASD移动，Q/E/R切换元素，鼠标点击释放技能，F交互', 'info')
  }, [store])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const preventKeys = ['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', ' ', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']
      if (preventKeys.includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
      inputRef.current = handlePlayerKeyDown(e, inputRef.current, store)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      inputRef.current = handlePlayerKeyUp(e, inputRef.current)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [store])

  const screenToWorld = useCallback((screenX: number, screenY: number): Position => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = ((screenX - rect.left) * scaleX) / CELL_SIZE
    const y = ((screenY - rect.top) * scaleY) / CELL_SIZE

    return { x, y }
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = screenToWorld(e.clientX, e.clientY)
    hoveredEntityRef.current = null

    const state = store.getState()
    const player = state.player
    const room = state.dungeon[player.currentRoom.y]?.[player.currentRoom.x]
    if (!room) return

    for (const mech of room.mechanisms) {
      if (distance(mouseRef.current, mech.position) < 0.8) {
        hoveredEntityRef.current = `mech-${mech.id}`
        return
      }
    }
    for (const enemy of room.enemies) {
      if (distance(mouseRef.current, enemy.position) < (enemy.type === 'boss' ? 1.5 : 0.8)) {
        hoveredEntityRef.current = `enemy-${enemy.id}`
        return
      }
    }
  }, [screenToWorld, store])

  const handleClick = useCallback((e: MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY)
    const state = store.getState()
    if (state.gameStatus !== 'playing') return

    const player = state.player
    if (player.currentRoom.x === 0 && player.currentRoom.y === 0) {
      playerUseSkill(worldPos, store)
      return
    }

    playerUseSkill(worldPos, store)
  }, [screenToWorld, store])

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseMove(e.nativeEvent)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleClick(e.nativeEvent)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = (ctx: CanvasRenderingContext2D, delta: number) => {
      const state = store.getState()

      if (state.gameStatus === 'playing') {
        const now = Date.now()
        updatePlayerMovement(inputRef.current, delta, store)
        updatePlayerInteraction(inputRef.current, store)
        checkTrapCollision(store, lastTrapDamageRef.current, now)

        const player = store.getState().player
        store.getState().recoverEnergies(delta)
        store.getState().updateCooldowns(delta)

        updateAllEnemiesInRoom(player.currentRoom, player.position, delta)

        const room = store.getState().dungeon[player.currentRoom.y]?.[player.currentRoom.x]
        if (room) {
          for (const proj of [...store.getState().projectiles]) {
            checkProjectileEnemyHit(player.currentRoom, proj.id, proj.position, proj.element, proj.damage, proj.fromPlayer)
            if (proj.fromPlayer) {
              checkProjectileMechanismHit(player.currentRoom, proj.id, proj.position, proj.element)
            }
          }
        }

        store.getState().updateProjectiles(delta)
        store.getState().updateParticles(delta)

        if (room && checkRoomCleared(room) && !room.cleared) {
          store.getState().setRoomCleared(player.currentRoom, true)
          store.getState().addLog('房间已清理！', 'success')
        }

        checkAllMechanismsSolvedForBoss(store)
      }
    }

    const render = (ctx: CanvasRenderingContext2D) => {
      const state = store.getState()
      const { player, dungeon, projectiles, particles, showHitEffect, hitElement } = state
      const room = dungeon[player.currentRoom.y]?.[player.currentRoom.x]

      if (!room) return

      const W = ctx.canvas.width
      const H = ctx.canvas.height

      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, W, H)

      renderRoom(ctx, room)
      renderMechanisms(ctx, room.mechanisms)
      renderTraps(ctx, room.traps)
      renderDoors(ctx, room.doors, player.position)
      renderEnemies(ctx, room.enemies, hoveredEntityRef.current)
      renderProjectiles(ctx, projectiles)
      renderPlayer(ctx, player, showHitEffect, hitElement)
      renderParticles(ctx, particles)
      renderHoverHighlight(ctx, hoveredEntityRef.current, room, player.currentElement)
    }

    const ctx = canvas.getContext('2d')!

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000)
      lastTimeRef.current = timestamp

      gl(ctx, delta)
      render(ctx)

      animationFrameRef.current = requestAnimationFrame(loop)
    }

    animationFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [store])

  const renderRoom = (ctx: CanvasRenderingContext2D, room: any) => {
    const W = ROOM_SIZE * CELL_SIZE
    ctx.fillStyle = '#2c3e50'
    ctx.fillRect(0, 0, W, W)

    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    for (let x = 0; x < ROOM_SIZE; x++) {
      for (let y = 0; y < ROOM_SIZE; y++) {
        if ((x + y) % 2 === 0) {
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        }
      }
    }

    ctx.fillStyle = '#1a252f'
    ctx.fillRect(0, 0, W, CELL_SIZE)
    ctx.fillRect(0, W - CELL_SIZE, W, CELL_SIZE)
    ctx.fillRect(0, 0, CELL_SIZE, W)
    ctx.fillRect(W - CELL_SIZE, 0, CELL_SIZE, W)

    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, W, W)

    if (room.isBossRoom) {
      ctx.strokeStyle = '#f1c40f'
      ctx.lineWidth = 4
      ctx.strokeRect(4, 4, W - 8, W - 8)
    }
    if (room.isStartRoom) {
      ctx.strokeStyle = '#2ecc71'
      ctx.lineWidth = 3
      ctx.strokeRect(2, 2, W - 4, W - 4)
    }
  }

  const renderMechanisms = (ctx: CanvasRenderingContext2D, mechanisms: any[]) => {
    for (const mech of mechanisms) {
      const x = mech.position.x * CELL_SIZE
      const y = mech.position.y * CELL_SIZE

      ctx.save()

      switch (mech.type) {
        case 'torch':
          drawTorch(ctx, x, y, mech.solved)
          break
        case 'ice_wall':
        case 'ice_door':
          drawIceWall(ctx, x, y, mech.solved)
          break
        case 'water_surface':
          drawWaterSurface(ctx, x, y, mech.solved)
          break
        case 'crack':
          drawCrack(ctx, x, y, mech.solved)
          break
        case 'poison_vent':
          drawPoisonVent(ctx, x, y, mech.solved)
          break
        case 'windmill':
          drawWindmill(ctx, x, y, mech.solved)
          break
      }

      if (!mech.solved) {
        const color = ELEMENT_COLORS[mech.requiredElement]
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE * 0.7, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.restore()
    }
  }

  const drawTorch = (ctx: CanvasRenderingContext2D, x: number, y: number, lit: boolean) => {
    const cx = x + CELL_SIZE / 2
    const cy = y + CELL_SIZE / 2

    ctx.fillStyle = '#5d4e37'
    ctx.fillRect(cx - 4, cy, 8, CELL_SIZE / 2)

    if (lit) {
      const flicker = 1 + Math.sin(Date.now() * 0.01) * 0.15
      const grad = ctx.createRadialGradient(cx, cy - 8, 2, cx, cy - 8, 20 * flicker)
      grad.addColorStop(0, '#f1c40f')
      grad.addColorStop(0.4, '#e67e22')
      grad.addColorStop(1, 'rgba(231, 76, 60, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy - 8, 20 * flicker, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#f39c12'
      ctx.beginPath()
      ctx.moveTo(cx, cy - 20 * flicker)
      ctx.quadraticCurveTo(cx + 8, cy - 8, cx, cy + 2)
      ctx.quadraticCurveTo(cx - 8, cy - 8, cx, cy - 20 * flicker)
      ctx.fill()
    } else {
      ctx.fillStyle = '#2c2c2c'
      ctx.beginPath()
      ctx.arc(cx, cy - 4, 6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const drawIceWall = (ctx: CanvasRenderingContext2D, x: number, y: number, melted: boolean) => {
    if (melted) {
      ctx.fillStyle = 'rgba(52, 152, 219, 0.2)'
      ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8)
      return
    }
    const grad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE)
    grad.addColorStop(0, '#85c1e9')
    grad.addColorStop(0.5, '#3498db')
    grad.addColorStop(1, '#2980b9')
    ctx.fillStyle = grad
    ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4)

    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 8, y + 4)
    ctx.lineTo(x + 16, y + 20)
    ctx.lineTo(x + 24, y + 12)
    ctx.moveTo(x + 12, y + 24)
    ctx.lineTo(x + 20, y + 28)
    ctx.stroke()

    ctx.strokeStyle = '#1a5276'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4)
  }

  const drawWaterSurface = (ctx: CanvasRenderingContext2D, x: number, y: number, frozen: boolean) => {
    if (frozen) {
      const grad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE)
      grad.addColorStop(0, '#d6eaf8')
      grad.addColorStop(1, '#aed6f1')
      ctx.fillStyle = grad
    } else {
      const t = Date.now() * 0.003
      const grad = ctx.createLinearGradient(x, y, x, y + CELL_SIZE)
      grad.addColorStop(0, `rgba(41, 128, 185, ${0.6 + Math.sin(t) * 0.1})`)
      grad.addColorStop(1, `rgba(21, 67, 96, ${0.8 + Math.sin(t + 1) * 0.1})`)
      ctx.fillStyle = grad
    }
    ctx.beginPath()
    ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = frozen ? '#fff' : `rgba(133, 193, 233, ${0.5 + Math.sin(Date.now() * 0.005) * 0.2})`
    ctx.lineWidth = 2
    ctx.stroke()
  }

  const drawCrack = (ctx: CanvasRenderingContext2D, x: number, y: number, sealed: boolean) => {
    const cx = x + CELL_SIZE / 2
    const cy = y + CELL_SIZE / 2

    if (sealed) {
      ctx.fillStyle = 'rgba(174, 214, 241, 0.5)'
      ctx.beginPath()
      ctx.arc(cx, cy, CELL_SIZE / 3, 0, Math.PI * 2)
      ctx.fill()
      return
    }

    ctx.strokeStyle = '#1c1c1c'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + 6, y + 6)
    ctx.lineTo(cx + 2, cy - 2)
    ctx.lineTo(cx - 4, cy + 4)
    ctx.lineTo(x + CELL_SIZE - 6, y + CELL_SIZE - 6)
    ctx.moveTo(cx, cy - 4)
    ctx.lineTo(x + 10, y + CELL_SIZE - 8)
    ctx.stroke()
  }

  const drawPoisonVent = (ctx: CanvasRenderingContext2D, x: number, y: number, sealed: boolean) => {
    const cx = x + CELL_SIZE / 2
    const cy = y + CELL_SIZE / 2

    ctx.fillStyle = sealed ? '#7d3c98' : '#4a235a'
    ctx.beginPath()
    ctx.arc(cx, cy, CELL_SIZE / 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = sealed ? '#8e44ad' : '#2c1338'
    ctx.beginPath()
    ctx.arc(cx, cy, CELL_SIZE / 5, 0, Math.PI * 2)
    ctx.fill()

    if (!sealed) {
      const t = Date.now() * 0.002
      for (let i = 0; i < 4; i++) {
        const angle = t + (Math.PI * 2 * i) / 4
        const dist = 6 + Math.sin(t * 2 + i) * 4
        const px = cx + Math.cos(angle) * dist
        const py = cy + Math.sin(angle) * dist
        ctx.fillStyle = `rgba(155, 89, 182, ${0.4 + Math.sin(t + i) * 0.2})`
        ctx.beginPath()
        ctx.arc(px, py, 3 + Math.sin(t * 3 + i) * 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  const drawWindmill = (ctx: CanvasRenderingContext2D, x: number, y: number, spinning: boolean) => {
    const cx = x + CELL_SIZE / 2
    const cy = y + CELL_SIZE / 2

    ctx.fillStyle = '#7f8c8d'
    ctx.fillRect(cx - 2, cy, 4, CELL_SIZE / 3)

    const angle = spinning ? Date.now() * 0.008 : 0
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(angle)

    for (let i = 0; i < 4; i++) {
      ctx.save()
      ctx.rotate((Math.PI * 2 * i) / 4)
      ctx.fillStyle = spinning ? '#2ecc71' : '#95a5a6'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(4, -14)
      ctx.lineTo(-4, -14)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    ctx.fillStyle = '#2c3e50'
    ctx.beginPath()
    ctx.arc(0, 0, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const renderTraps = (ctx: CanvasRenderingContext2D, traps: any[]) => {
    for (const trap of traps) {
      if (!trap.active) continue
      const x = trap.position.x * CELL_SIZE
      const y = trap.position.y * CELL_SIZE
      const cx = x + CELL_SIZE / 2
      const cy = y + CELL_SIZE / 2

      switch (trap.type) {
        case 'spike':
          ctx.fillStyle = '#7f8c8d'
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const sx = x + 6 + i * 8
              const sy = y + 6 + j * 8
              ctx.beginPath()
              ctx.moveTo(sx + 4, sy)
              ctx.lineTo(sx + 8, sy + 8)
              ctx.lineTo(sx, sy + 8)
              ctx.closePath()
              ctx.fill()
            }
          }
          break
        case 'poison':
          const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.3
          ctx.fillStyle = `rgba(155, 89, 182, ${pulse})`
          ctx.beginPath()
          ctx.arc(cx, cy, CELL_SIZE / 3, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'fire':
          const flicker = 0.5 + Math.sin(Date.now() * 0.01) * 0.3
          ctx.fillStyle = `rgba(231, 76, 60, ${flicker})`
          ctx.beginPath()
          ctx.arc(cx, cy, CELL_SIZE / 3, 0, Math.PI * 2)
          ctx.fill()
          break
      }
    }
  }

  const renderDoors = (ctx: CanvasRenderingContext2D, doors: any[], playerPos: Position) => {
    for (const door of doors) {
      const x = door.position.x * CELL_SIZE
      const y = door.position.y * CELL_SIZE

      const dist = distance(
        playerPos,
        { x: door.position.x, y: door.position.y }
      )

      const targetProgress = dist < 2.5 && !door.isLocked ? 1 : 0
      const currentProgress = door.animationProgress
      const newProgress = currentProgress + (targetProgress - currentProgress) * 0.1

      if (Math.abs(newProgress - currentProgress) > 0.01) {
        const state = store.getState()
        const room = state.dungeon[state.player.currentRoom.y]?.[state.player.currentRoom.x]
        if (room) {
          store.getState().updateDoorAnimation(state.player.currentRoom, door.id, newProgress)
        }
      }

      const progress = Math.max(0, Math.min(1, newProgress))
      const openAngle = progress * (Math.PI / 2)

      ctx.save()

      let hingeX = x + CELL_SIZE / 2
      let hingeY = y + CELL_SIZE / 2
      let doorW = CELL_SIZE
      let doorH = CELL_SIZE * 0.3

      switch (door.direction) {
        case 'top':
          hingeX = x
          hingeY = y + CELL_SIZE
          doorW = CELL_SIZE * 0.3
          doorH = CELL_SIZE
          break
        case 'bottom':
          hingeX = x + CELL_SIZE
          hingeY = y
          doorW = CELL_SIZE * 0.3
          doorH = CELL_SIZE
          break
        case 'left':
          hingeX = x + CELL_SIZE
          hingeY = y
          doorW = CELL_SIZE
          doorH = CELL_SIZE * 0.3
          break
        case 'right':
          hingeX = x
          hingeY = y + CELL_SIZE
          doorW = CELL_SIZE
          doorH = CELL_SIZE * 0.3
          break
      }

      ctx.translate(hingeX, hingeY)
      ctx.rotate(-openAngle * (door.direction === 'left' || door.direction === 'top' ? 1 : -1))

      const grad = ctx.createLinearGradient(0, -doorH, 0, 0)
      grad.addColorStop(0, door.isLocked ? '#c0392b' : '#8b5a2b')
      grad.addColorStop(1, door.isLocked ? '#922b21' : '#5d3a1a')
      ctx.fillStyle = grad
      ctx.fillRect(-doorW / 2, -doorH, doorW, doorH)

      ctx.strokeStyle = door.isLocked ? '#641e16' : '#3e2723'
      ctx.lineWidth = 2
      ctx.strokeRect(-doorW / 2, -doorH, doorW, doorH)

      if (door.isLocked) {
        ctx.fillStyle = '#f1c40f'
        ctx.beginPath()
        ctx.arc(0, -doorH / 2, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  }

  const renderEnemies = (ctx: CanvasRenderingContext2D, enemies: any[], hovered: string | null) => {
    for (const enemy of enemies) {
      if (enemy.state === 'dead') continue

      const x = enemy.position.x * CELL_SIZE
      const y = enemy.position.y * CELL_SIZE
      const isBoss = enemy.type === 'boss'
      const size = isBoss ? CELL_SIZE * 1.8 : CELL_SIZE
      const cx = x + CELL_SIZE / 2
      const cy = y + CELL_SIZE / 2

      if (hovered === `enemy-${enemy.id}`) {
        const weakColor = ELEMENT_COLORS[enemy.elementWeakness]
        ctx.strokeStyle = weakColor
        ctx.lineWidth = 3
        ctx.shadowColor = weakColor
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      if (enemy.hasShield) {
        const shieldAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.1
        ctx.strokeStyle = `rgba(241, 196, 15, ${shieldAlpha + 0.3})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(cx, cy, size / 2 + 8, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = `rgba(241, 196, 15, ${shieldAlpha})`
        ctx.fill()
      }

      switch (enemy.type) {
        case 'slime':
          drawSlime(ctx, cx, cy, enemy.state)
          break
        case 'bat':
          drawBat(ctx, cx, cy, enemy.state)
          break
        case 'skeleton':
          drawSkeleton(ctx, cx, cy, enemy.state)
          break
        case 'boss':
          drawBoss(ctx, cx, cy, enemy)
          break
      }

      const hpW = isBoss ? 60 : 30
      const hpH = isBoss ? 6 : 4
      const hpX = cx - hpW / 2
      const hpY = cy - size / 2 - (isBoss ? 16 : 10)
      const hpPct = enemy.hp / enemy.maxHp

      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(hpX, hpY, hpW, hpH)
      ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c'
      ctx.fillRect(hpX, hpY, hpW * hpPct, hpH)
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      ctx.strokeRect(hpX, hpY, hpW, hpH)

      if (enemy.state === 'attack' && enemy.attackCooldown > 0.3) {
        ctx.strokeStyle = `rgba(231, 76, 60, ${enemy.attackCooldown * 2})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(cx, cy, size / 2 + 2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  const drawSlime = (ctx: CanvasRenderingContext2D, cx: number, cy: number, state: string) => {
    const bounce = state === 'chase' ? Math.sin(Date.now() * 0.01) * 3 : Math.sin(Date.now() * 0.005) * 2
    const size = CELL_SIZE * 0.4

    const grad = ctx.createRadialGradient(cx - 4, cy - 4 + bounce, 2, cx, cy + bounce, size)
    grad.addColorStop(0, '#aed6f1')
    grad.addColorStop(1, '#2980b9')
    ctx.fillStyle = grad

    ctx.beginPath()
    ctx.moveTo(cx - size, cy + size + bounce)
    ctx.quadraticCurveTo(cx - size, cy - size * 0.5 + bounce, cx, cy - size + bounce)
    ctx.quadraticCurveTo(cx + size, cy - size * 0.5 + bounce, cx + size, cy + size + bounce)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cx - 6, cy - 4 + bounce, 4, 0, Math.PI * 2)
    ctx.arc(cx + 6, cy - 4 + bounce, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.arc(cx - 5, cy - 4 + bounce, 2, 0, Math.PI * 2)
    ctx.arc(cx + 7, cy - 4 + bounce, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const drawBat = (ctx: CanvasRenderingContext2D, cx: number, cy: number, state: string) => {
    const flap = Math.sin(Date.now() * 0.02) * 0.5
    const hover = state === 'chase' ? Math.sin(Date.now() * 0.015) * 2 : Math.sin(Date.now() * 0.008) * 1

    ctx.save()
    ctx.translate(cx, cy + hover)

    ctx.fillStyle = '#2c3e50'
    ctx.save()
    ctx.rotate(flap)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(-16, -10, -20, 4)
    ctx.quadraticCurveTo(-12, -2, 0, 4)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.rotate(-flap)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(16, -10, 20, 4)
    ctx.quadraticCurveTo(12, -2, 0, 4)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = '#34495e'
    ctx.beginPath()
    ctx.arc(0, 2, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#e74c3c'
    ctx.beginPath()
    ctx.arc(-3, 0, 2, 0, Math.PI * 2)
    ctx.arc(3, 0, 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#2c3e50'
    ctx.beginPath()
    ctx.moveTo(-6, -5)
    ctx.lineTo(-4, -10)
    ctx.lineTo(-2, -5)
    ctx.moveTo(2, -5)
    ctx.lineTo(4, -10)
    ctx.lineTo(6, -5)
    ctx.fill()

    ctx.restore()
  }

  const drawSkeleton = (ctx: CanvasRenderingContext2D, cx: number, cy: number, state: string) => {
    const walk = state === 'chase' ? Math.sin(Date.now() * 0.012) * 2 : 0

    ctx.fillStyle = '#ecf0f1'
    ctx.beginPath()
    ctx.arc(cx, cy - 8 + walk, 8, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.arc(cx - 3, cy - 9 + walk, 2, 0, Math.PI * 2)
    ctx.arc(cx + 3, cy - 9 + walk, 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#bdc3c7'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx, cy + walk)
    ctx.lineTo(cx, cy + 12 + walk)
    ctx.stroke()

    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = '#ecf0f1'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx - 6, cy + 2 + i * 3 + walk)
      ctx.lineTo(cx + 6, cy + 2 + i * 3 + walk)
      ctx.stroke()
    }

    ctx.strokeStyle = '#bdc3c7'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy - 2 + walk + Math.sin(Date.now() * 0.01) * 2)
    ctx.lineTo(cx, cy + 4 + walk)
    ctx.lineTo(cx + 8, cy - 2 + walk - Math.sin(Date.now() * 0.01) * 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx, cy + 12 + walk)
    ctx.lineTo(cx - 5, cy + 20 + walk + walk)
    ctx.moveTo(cx, cy + 12 + walk)
    ctx.lineTo(cx + 5, cy + 20 + walk - walk)
    ctx.stroke()
  }

  const drawBoss = (ctx: CanvasRenderingContext2D, cx: number, cy: number, enemy: any) => {
    const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.05
    const size = CELL_SIZE * 0.9 * pulse

    const weakColor = ELEMENT_COLORS[enemy.elementWeakness]
    const grad = ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size)
    grad.addColorStop(0, '#5d4e6d')
    grad.addColorStop(0.6, '#3d2e4d')
    grad.addColorStop(1, weakColor + '66')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, size, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = weakColor
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(cx, cy, size, 0, Math.PI * 2)
    ctx.stroke()

    for (let i = 0; i < 6; i++) {
      const angle = (Date.now() * 0.001) + (Math.PI * 2 * i) / 6
      const dist = size * 0.7
      const ox = cx + Math.cos(angle) * dist
      const oy = cy + Math.sin(angle) * dist
      ctx.fillStyle = weakColor
      ctx.beginPath()
      ctx.arc(ox, oy, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    const eyeGlow = enemy.state === 'attack' ? 1 : 0.5 + Math.sin(Date.now() * 0.004) * 0.3
    ctx.fillStyle = enemy.state === 'attack' ? '#e74c3c' : weakColor
    ctx.shadowColor = enemy.state === 'attack' ? '#e74c3c' : weakColor
    ctx.shadowBlur = 15 * eyeGlow
    ctx.beginPath()
    ctx.arc(cx - 14, cy - 6, 7, 0, Math.PI * 2)
    ctx.arc(cx + 14, cy - 6, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.arc(cx - 14, cy - 6, 3, 0, Math.PI * 2)
    ctx.arc(cx + 14, cy - 6, 3, 0, Math.PI * 2)
    ctx.fill()

    if (enemy.state === 'attack') {
      ctx.strokeStyle = '#e74c3c'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, size + 6 + Math.sin(Date.now() * 0.02) * 4, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  const renderPlayer = (
    ctx: CanvasRenderingContext2D,
    player: any,
    showHit: boolean,
    hitElement: ElementType
  ) => {
    const x = player.position.x * CELL_SIZE
    const y = player.position.y * CELL_SIZE
    const cx = x + CELL_SIZE / 2
    const cy = y + CELL_SIZE / 2
    const elementColor = ELEMENT_COLORS[player.currentElement]

    const pulseRadius = showHit ? 30 : 22 + Math.sin(Date.now() * 0.004) * 3
    const glowAlpha = showHit ? 0.8 : 0.3 + Math.sin(Date.now() * 0.004) * 0.15
    const hitColor = showHit ? ELEMENT_COLORS[hitElement] : elementColor

    const auraGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, pulseRadius)
    auraGrad.addColorStop(0, `${hitColor}${Math.round(glowAlpha * 255).toString(16).padStart(2, '0')}`)
    auraGrad.addColorStop(1, `${hitColor}00`)
    ctx.fillStyle = auraGrad
    ctx.beginPath()
    ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2)
    ctx.fill()

    const bodyGrad = ctx.createLinearGradient(cx, cy - 14, cx, cy + 14)
    bodyGrad.addColorStop(0, '#ecf0f1')
    bodyGrad.addColorStop(1, '#bdc3c7')
    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(cx, cy, 12, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = elementColor
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx, cy, 12, 0, Math.PI * 2)
    ctx.stroke()

    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cx - 4, cy - 2, 3, 0, Math.PI * 2)
    ctx.arc(cx + 4, cy - 2, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2c3e50'
    ctx.beginPath()
    ctx.arc(cx - 4, cy - 2, 1.5, 0, Math.PI * 2)
    ctx.arc(cx + 4, cy - 2, 1.5, 0, Math.PI * 2)
    ctx.fill()

    const iconSize = 8
    const iconY = cy - 24
    ctx.fillStyle = elementColor
    ctx.shadowColor = elementColor
    ctx.shadowBlur = 8
    switch (player.currentElement) {
      case 'fire':
        ctx.beginPath()
        ctx.moveTo(cx, iconY - iconSize)
        ctx.quadraticCurveTo(cx + iconSize, iconY - 2, cx, iconY + 2)
        ctx.quadraticCurveTo(cx - iconSize, iconY - 2, cx, iconY - iconSize)
        ctx.fill()
        break
      case 'ice':
        ctx.save()
        ctx.translate(cx, iconY - 2)
        for (let i = 0; i < 6; i++) {
          ctx.rotate(Math.PI / 3)
          ctx.fillRect(-1, -iconSize, 2, iconSize * 1.5)
        }
        ctx.restore()
        break
      case 'wind':
        ctx.save()
        ctx.translate(cx, iconY - 2)
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.arc(-4 + i * 4, 0, iconSize * 0.5, 0, Math.PI, true)
          ctx.fill()
        }
        ctx.restore()
        break
    }
    ctx.shadowBlur = 0
  }

  const renderProjectiles = (ctx: CanvasRenderingContext2D, projectiles: any[]) => {
    for (const proj of projectiles) {
      const x = proj.position.x * CELL_SIZE
      const y = proj.position.y * CELL_SIZE
      const color = ELEMENT_COLORS[proj.element]

      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = 12

      const size = proj.fromPlayer ? 8 : 6
      switch (proj.element) {
        case 'fire':
          const fireGrad = ctx.createRadialGradient(x, y, 1, x, y, size)
          fireGrad.addColorStop(0, '#f1c40f')
          fireGrad.addColorStop(0.5, color)
          fireGrad.addColorStop(1, `${color}00`)
          ctx.fillStyle = fireGrad
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'ice':
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(Date.now() * 0.01)
          ctx.fillStyle = color
          for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3)
            ctx.fillRect(-1, -size, 2, size * 1.6)
          }
          ctx.restore()
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'wind':
          ctx.save()
          ctx.translate(x, y)
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          for (let i = 0; i < 3; i++) {
            const offset = (Date.now() * 0.005 + i * 0.5) % 1
            ctx.globalAlpha = 1 - offset
            ctx.beginPath()
            ctx.arc(0, 0, size * (0.5 + offset), 0, Math.PI, true)
            ctx.stroke()
          }
          ctx.globalAlpha = 1
          ctx.restore()
          break
      }
      ctx.shadowBlur = 0
    }
  }

  const renderParticles = (ctx: CanvasRenderingContext2D, particles: any[]) => {
    for (const p of particles) {
      const x = p.position.x * CELL_SIZE
      const y = p.position.y * CELL_SIZE
      const alpha = p.lifetime / p.maxLifetime

      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.max(0, alpha)

      switch (p.type) {
        case 'firework':
          const fwGrad = ctx.createRadialGradient(x, y, 0, x, y, p.size * 1.5)
          fwGrad.addColorStop(0, p.color)
          fwGrad.addColorStop(1, `${p.color}00`)
          ctx.fillStyle = fwGrad
          ctx.beginPath()
          ctx.arc(x, y, p.size * 1.5, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'burst':
          ctx.beginPath()
          ctx.arc(x, y, p.size * alpha, 0, Math.PI * 2)
          ctx.fill()
          break
        default:
          ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size)
      }
    }
    ctx.globalAlpha = 1
  }

  const renderHoverHighlight = (
    ctx: CanvasRenderingContext2D,
    hovered: string | null,
    room: any,
    element: ElementType
  ) => {
    if (!hovered) return

    if (hovered.startsWith('mech-')) {
      const mech = room.mechanisms.find((m: any) => `mech-${m.id}` === hovered)
      if (mech) {
        const x = mech.position.x * CELL_SIZE
        const y = mech.position.y * CELL_SIZE
        const color = ELEMENT_COLORS[element]
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.shadowColor = color
        ctx.shadowBlur = 8
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE)
        ctx.shadowBlur = 0
      }
    }
  }

  return (
    <div className="game-container" ref={containerRef}>
      <div className="game-area">
        <canvas
          ref={canvasRef}
          width={ROOM_SIZE * CELL_SIZE}
          height={ROOM_SIZE * CELL_SIZE}
          className="game-canvas"
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
        />
      </div>
      <UIPanel />
    </div>
  )
}

export default GameBoard
