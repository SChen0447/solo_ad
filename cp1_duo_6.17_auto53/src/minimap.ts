import * as THREE from 'three'
import type { IslandData } from './terrainGenerator'

export interface MinimapState {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  islands: IslandData[]
  bounds: {
    minX: number
    maxX: number
    minZ: number
    maxZ: number
  }
  padding: number
}

export function createMinimap(
  canvasId: string,
  islands: IslandData[]
): MinimapState {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement
  const context = canvas.getContext('2d')!

  const padding = 20
  const positions = islands.map(i => ({ x: i.position.x, z: i.position.z }))
  const bounds = {
    minX: Math.min(...positions.map(p => p.x)) - padding,
    maxX: Math.max(...positions.map(p => p.x)) + padding,
    minZ: Math.min(...positions.map(p => p.z)) - padding,
    maxZ: Math.max(...positions.map(p => p.z)) + padding
  }

  const state: MinimapState = {
    canvas,
    context,
    islands,
    bounds,
    padding: 10
  }

  drawMinimapBackground(state)
  drawIslands(state)

  return state
}

function drawMinimapBackground(state: MinimapState): void {
  const { canvas, context } = state
  const w = canvas.width
  const h = canvas.height

  context.clearRect(0, 0, w, h)

  const bgGrad = context.createLinearGradient(0, 0, w, h)
  bgGrad.addColorStop(0, '#0d0221')
  bgGrad.addColorStop(1, '#1a0a3e')
  context.fillStyle = bgGrad
  context.fillRect(0, 0, w, h)

  context.strokeStyle = 'rgba(138, 43, 226, 0.15)'
  context.lineWidth = 1
  const gridSize = w / 8
  for (let i = 0; i <= 8; i++) {
    context.beginPath()
    context.moveTo(i * gridSize, 0)
    context.lineTo(i * gridSize, h)
    context.stroke()
    context.beginPath()
    context.moveTo(0, i * gridSize)
    context.lineTo(w, i * gridSize)
    context.stroke()
  }
}

function worldToMinimap(
  worldX: number,
  worldZ: number,
  state: MinimapState
): { x: number; y: number } {
  const { canvas, bounds, padding } = state
  const w = canvas.width - padding * 2
  const h = canvas.height - padding * 2

  const rangeX = bounds.maxX - bounds.minX
  const rangeZ = bounds.maxZ - bounds.minZ
  const scale = Math.min(w / rangeX, h / rangeZ)

  const offsetX = (w - rangeX * scale) / 2
  const offsetZ = (h - rangeZ * scale) / 2

  return {
    x: padding + offsetX + (worldX - bounds.minX) * scale,
    y: padding + offsetZ + (bounds.maxZ - worldZ) * scale
  }
}

function drawIslands(state: MinimapState): void {
  const { context, islands, bounds, padding, canvas } = state
  const w = canvas.width - padding * 2
  const h = canvas.height - padding * 2
  const rangeX = bounds.maxX - bounds.minX
  const rangeZ = bounds.maxZ - bounds.minZ
  const scale = Math.min(w / rangeX, h / rangeZ)

  for (const island of islands) {
    const pos = worldToMinimap(island.position.x, island.position.z, state)
    const radius = (island.size * 0.5 * scale) * 0.6

    const sides = 6 + Math.floor(island.id % 3)
    context.beginPath()
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2 + island.id * 0.5
      const r = radius * (0.85 + Math.sin(angle * 3 + island.id) * 0.15)
      const px = pos.x + Math.cos(angle) * r
      const py = pos.y + Math.sin(angle) * r
      if (i === 0) {
        context.moveTo(px, py)
      } else {
        context.lineTo(px, py)
      }
    }
    context.closePath()

    if (island.isFinish) {
      const finishGrad = context.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, radius * 1.5
      )
      finishGrad.addColorStop(0, 'rgba(255, 215, 0, 0.5)')
      finishGrad.addColorStop(1, 'rgba(255, 215, 0, 0.1)')
      context.fillStyle = finishGrad
      context.fill()
      context.strokeStyle = '#ffd700'
      context.lineWidth = 2.5
      context.stroke()

      context.beginPath()
      context.arc(pos.x, pos.y, radius * 0.5, 0, Math.PI * 2)
      context.fillStyle = 'rgba(255, 215, 0, 0.8)'
      context.fill()
    } else {
      let fillColor: string
      let strokeColor: string

      const idMod = island.id % 3
      if (idMod === 0) {
        fillColor = 'rgba(58, 125, 68, 0.7)'
        strokeColor = '#4c9a56'
      } else if (idMod === 1) {
        fillColor = 'rgba(107, 107, 107, 0.7)'
        strokeColor = '#9a9a9a'
      } else {
        fillColor = 'rgba(201, 168, 108, 0.7)'
        strokeColor = '#e0c48a'
      }

      context.fillStyle = fillColor
      context.fill()
      context.strokeStyle = strokeColor
      context.lineWidth = 1.5
      context.stroke()
    }
  }
}

export function updateMinimap(
  state: MinimapState,
  playerPosition: THREE.Vector3,
  playerForward: THREE.Vector3
): void {
  drawMinimapBackground(state)
  drawIslands(state)

  const pos = worldToMinimap(playerPosition.x, playerPosition.z, state)

  const forward2D = new THREE.Vector2(playerForward.x, playerForward.z).normalize()
  const angle = Math.atan2(-forward2D.y, forward2D.x)

  const { context } = state

  context.save()
  context.translate(pos.x, pos.y)
  context.rotate(angle)

  context.beginPath()
  context.moveTo(10, 0)
  context.lineTo(-6, -6)
  context.lineTo(-3, 0)
  context.lineTo(-6, 6)
  context.closePath()

  const playerGrad = context.createLinearGradient(-6, 0, 10, 0)
  playerGrad.addColorStop(0, '#6b21a8')
  playerGrad.addColorStop(1, '#c084fc')
  context.fillStyle = playerGrad
  context.fill()
  context.strokeStyle = '#e9d5ff'
  context.lineWidth = 1.5
  context.stroke()

  context.restore()

  context.beginPath()
  context.arc(pos.x, pos.y, 14, 0, Math.PI * 2)
  const glowGrad = context.createRadialGradient(
    pos.x, pos.y, 0,
    pos.x, pos.y, 14
  )
  glowGrad.addColorStop(0, 'rgba(192, 132, 252, 0.4)')
  glowGrad.addColorStop(1, 'rgba(192, 132, 252, 0)')
  context.fillStyle = glowGrad
  context.fill()
}
