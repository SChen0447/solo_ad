import { ref, computed, reactive } from 'vue'
import type { Block, Ripple, FlightTarget, LayoutTemplate } from '../types/block'
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BLOCK_SIZE,
  MAX_BLOCKS,
  PRESET_COLORS,
  RESONANCE_NEAR,
  RESONANCE_FAR,
  RIPPLE_DURATION,
  FLIGHT_DURATION
} from '../types/block'

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('')
}

function mixColors(color1: string, color2: string): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  return rgbToHex((c1.r + c2.r) / 2, (c1.g + c2.g) / 2, (c1.b + c2.b) / 2)
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

export function useResonance() {
  const blocks = ref<Block[]>([])
  const ripples = ref<Ripple[]>([])
  const flightTargets = reactive<Map<string, FlightTarget>>(new Map())
  const lastRippleTrigger = reactive<Map<string, number>>(new Map())

  const blocksById = computed(() => {
    const map = new Map<string, Block>()
    blocks.value.forEach(b => map.set(b.id, b))
    return map
  })

  function addBlock(x?: number, y?: number, color?: string, frequency?: number): Block | null {
    if (blocks.value.length >= MAX_BLOCKS) return null
    const block: Block = {
      id: generateId(),
      x: x ?? Math.random() * (BOARD_WIDTH - BLOCK_SIZE) + BLOCK_SIZE / 2,
      y: y ?? Math.random() * (BOARD_HEIGHT - BLOCK_SIZE) + BLOCK_SIZE / 2,
      color: color ?? PRESET_COLORS[Math.floor(Math.random() * 8)],
      frequency: frequency ?? Math.floor(Math.random() * 10) + 1
    }
    blocks.value.push(block)
    return block
  }

  function removeBlock(id: string): void {
    const idx = blocks.value.findIndex(b => b.id === id)
    if (idx !== -1) {
      blocks.value.splice(idx, 1)
    }
  }

  function updateBlock(id: string, updates: Partial<Block>): void {
    const block = blocks.value.find(b => b.id === id)
    if (block) {
      Object.assign(block, updates)
    }
  }

  function clearBlocks(): void {
    blocks.value = []
    ripples.value = []
    flightTargets.clear()
    lastRippleTrigger.clear()
  }

  function getResonancePairs(): Array<{
    block1: Block
    block2: Block
    distance: number
    strength: number
  }> {
    const pairs: Array<{ block1: Block; block2: Block; distance: number; strength: number }> = []
    for (let i = 0; i < blocks.value.length; i++) {
      for (let j = i + 1; j < blocks.value.length; j++) {
        const b1 = blocks.value[i]
        const b2 = blocks.value[j]
        const d = distance(b1.x, b1.y, b2.x, b2.y)
        if (d < RESONANCE_FAR) {
          const strength = d < RESONANCE_NEAR
            ? 1 - d / RESONANCE_NEAR
            : 1 - (d - RESONANCE_NEAR) / (RESONANCE_FAR - RESONANCE_NEAR)
          pairs.push({ block1: b1, block2: b2, distance: d, strength })
        }
      }
    }
    return pairs
  }

  function getSyncBlinkGroups(): Array<{ blocks: Block[]; avgFrequency: number }> {
    const visited = new Set<string>()
    const groups: Array<{ blocks: Block[]; avgFrequency: number }> = []

    for (const block of blocks.value) {
      if (visited.has(block.id)) continue
      const group: Block[] = [block]
      visited.add(block.id)
      const queue = [block]

      while (queue.length > 0) {
        const current = queue.shift()!
        for (const other of blocks.value) {
          if (visited.has(other.id)) continue
          const d = distance(current.x, current.y, other.x, other.y)
          if (d < RESONANCE_NEAR) {
            visited.add(other.id)
            group.push(other)
            queue.push(other)
          }
        }
      }

      if (group.length > 1) {
        const avgFreq = group.reduce((sum, b) => sum + b.frequency, 0) / group.length
        groups.push({ blocks: group, avgFrequency: avgFreq })
      }
    }

    return groups
  }

  function triggerRippleIfNeeded(block1: Block, block2: Block, now: number): void {
    const key = block1.id < block2.id ? `${block1.id}-${block2.id}` : `${block2.id}-${block1.id}`
    const d = distance(block1.x, block1.y, block2.x, block2.y)

    if (d >= RESONANCE_NEAR && d < RESONANCE_FAR) {
      const avgFreq = (block1.frequency + block2.frequency) / 2
      const interval = 2000 / Math.max(avgFreq, 1)
      const lastTrigger = lastRippleTrigger.get(key) ?? 0

      if (now - lastTrigger >= interval) {
        lastRippleTrigger.set(key, now)
        const midX = (block1.x + block2.x) / 2
        const midY = (block1.y + block2.y) / 2
        const mixedColor = mixColors(block1.color, block2.color)
        ripples.value.push({
          id: generateId(),
          x: midX,
          y: midY,
          color: mixedColor,
          startTime: now,
          duration: RIPPLE_DURATION
        })
      }
    }
  }

  function cleanupExpiredRipples(now: number): void {
    ripples.value = ripples.value.filter(r => now - r.startTime < r.duration)
  }

  function generateLayoutPositions(template: LayoutTemplate, count: number): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = []
    const margin = BLOCK_SIZE / 2 + 20
    const usableW = BOARD_WIDTH - margin * 2
    const usableH = BOARD_HEIGHT - margin * 2
    const centerX = BOARD_WIDTH / 2
    const centerY = BOARD_HEIGHT / 2

    switch (template) {
      case 'symmetric': {
        const cols = Math.ceil(Math.sqrt(count))
        const rows = Math.ceil(count / cols)
        const gapX = cols > 1 ? usableW / (cols - 1) : 0
        const gapY = rows > 1 ? usableH / (rows - 1) : 0
        for (let i = 0; i < count; i++) {
          const col = i % cols
          const row = Math.floor(i / cols)
          positions.push({
            x: margin + col * gapX,
            y: margin + row * gapY
          })
        }
        break
      }
      case 'random': {
        for (let i = 0; i < count; i++) {
          positions.push({
            x: margin + Math.random() * usableW,
            y: margin + Math.random() * usableH
          })
        }
        break
      }
      case 'spiral': {
        const maxRadius = Math.min(usableW, usableH) / 2
        for (let i = 0; i < count; i++) {
          const t = count > 1 ? i / (count - 1) : 0
          const angle = t * Math.PI * 4
          const radius = maxRadius * t * 0.9
          positions.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          })
        }
        break
      }
      case 'grid': {
        const cols = Math.min(count, 6)
        const rows = Math.ceil(count / cols)
        const gapX = usableW / (cols + 1)
        const gapY = usableH / (rows + 1)
        for (let i = 0; i < count; i++) {
          const col = i % cols
          const row = Math.floor(i / cols)
          positions.push({
            x: margin + gapX * (col + 1),
            y: margin + gapY * (row + 1)
          })
        }
        break
      }
      case 'constellation': {
        const starCenters = [
          { x: centerX - 180, y: centerY - 100 },
          { x: centerX + 150, y: centerY - 120 },
          { x: centerX, y: centerY + 80 },
          { x: centerX - 100, y: centerY + 180 },
          { x: centerX + 200, y: centerY + 50 }
        ]
        for (let i = 0; i < count; i++) {
          const center = starCenters[i % starCenters.length]
          const angle = (i / starCenters.length) * Math.PI * 2 + Math.random() * 0.8
          const radius = 40 + Math.random() * 60
          positions.push({
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius
          })
        }
        break
      }
    }

    return positions.slice(0, count)
  }

  function applyLayoutTemplate(template: LayoutTemplate): void {
    const positions = generateLayoutPositions(template, blocks.value.length)
    const now = performance.now()

    blocks.value.forEach((block, idx) => {
      const target = positions[idx]
      if (target) {
        flightTargets.set(block.id, {
          id: block.id,
          startX: block.x,
          startY: block.y,
          endX: target.x,
          endY: target.y,
          offsetX: (Math.random() - 0.5) * 30,
          offsetY: (Math.random() - 0.5) * 30,
          startTime: now,
          duration: FLIGHT_DURATION
        })
      }
    })
  }

  function easeOutElastic(t: number): number {
    const p = 0.4
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
  }

  function updateFlightPositions(now: number): void {
    const arrivedIds: string[] = []
    flightTargets.forEach((ft) => {
      const elapsed = now - ft.startTime
      if (elapsed >= ft.duration) {
        const block = blocksById.value.get(ft.id)
        if (block) {
          block.x = ft.endX
          block.y = ft.endY
        }
        arrivedIds.push(ft.id)
      } else {
        const rawT = elapsed / ft.duration
        const t = easeOutElastic(rawT)
        const bezierT = 1 - (1 - rawT) * (1 - rawT) * (1 - rawT) * (1 - rawT)
        const baseX = ft.startX + (ft.endX - ft.startX) * bezierT
        const baseY = ft.startY + (ft.endY - ft.startY) * bezierT
        const wobbleX = Math.sin(rawT * Math.PI * 2) * ft.offsetX * (1 - rawT)
        const wobbleY = Math.cos(rawT * Math.PI * 2) * ft.offsetY * (1 - rawT)
        const block = blocksById.value.get(ft.id)
        if (block) {
          block.x = baseX + wobbleX + (ft.endX - baseX) * (t - bezierT) * 0.5
          block.y = baseY + wobbleY + (ft.endY - baseY) * (t - bezierT) * 0.5
        }
      }
    })
    arrivedIds.forEach(id => flightTargets.delete(id))
  }

  function initializeDefaultBlocks(count = 12): void {
    clearBlocks()
    const positions = generateLayoutPositions('symmetric', count)
    for (let i = 0; i < count; i++) {
      const pos = positions[i]
      addBlock(pos.x, pos.y, PRESET_COLORS[i % PRESET_COLORS.length], (i % 10) + 1)
    }
  }

  return {
    blocks,
    ripples,
    flightTargets,
    addBlock,
    removeBlock,
    updateBlock,
    clearBlocks,
    getResonancePairs,
    getSyncBlinkGroups,
    triggerRippleIfNeeded,
    cleanupExpiredRipples,
    applyLayoutTemplate,
    updateFlightPositions,
    initializeDefaultBlocks
  }
}
