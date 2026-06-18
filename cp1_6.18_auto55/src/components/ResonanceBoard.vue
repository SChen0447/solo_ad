<template>
  <div class="board-container">
    <div
      class="board-canvas-wrapper"
      ref="canvasWrapperRef"
      @mousedown="handleCanvasMouseDown"
      @mousemove="handleCanvasMouseMove"
      @mouseup="handleCanvasMouseUp"
      @mouseleave="handleCanvasMouseUp"
      @dblclick="handleCanvasDblClick"
      @click="handleCanvasClick"
    >
      <canvas
        ref="canvasRef"
        :width="BOARD_WIDTH"
        :height="BOARD_HEIGHT"
        class="board-canvas"
      />
    </div>

    <Transition name="panel-enter">
      <div
        v-if="editingBlock"
        class="edit-panel"
        :style="panelStyle"
        @mousedown.stop
        @click.stop
      >
        <div class="panel-header">
          <span class="panel-title">编辑色块</span>
          <button class="close-btn" @click="closeEditPanel">×</button>
        </div>
        <div class="panel-body">
          <div class="freq-section">
            <label class="field-label">频率</label>
            <div class="slider-row">
              <input
                type="range"
                class="freq-slider"
                min="1"
                max="10"
                step="1"
                v-model.number="tempFrequency"
                @input="onFrequencyChange"
              />
              <span class="freq-value">{{ tempFrequency }}</span>
            </div>
            <div class="freq-ticks">
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>
          <div class="color-section">
            <label class="field-label">颜色</label>
            <div class="color-grid">
              <button
                v-for="(color, idx) in PRESET_COLORS"
                :key="idx"
                class="color-swatch"
                :class="{ active: tempColor === color }"
                :style="{ backgroundColor: color, boxShadow: tempColor === color ? `0 0 0 3px rgba(139,92,246,0.6)` : 'none' }"
                @click="onColorChange(color)"
              />
            </div>
          </div>
          <button class="delete-btn" @click="onDeleteBlock">
            <span class="del-icon">🗑</span> 删除此色块
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { Block, Ripple } from '../types/block'
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BLOCK_SIZE,
  PRESET_COLORS
} from '../types/block'

const props = defineProps<{
  blocks: Block[]
  ripples: Ripple[]
  getResonancePairs: () => Array<{ block1: Block; block2: Block; distance: number; strength: number }>
  getSyncBlinkGroups: () => Array<{ blocks: Block[]; avgFrequency: number }>
  triggerRippleIfNeeded: (b1: Block, b2: Block, now: number) => void
  cleanupExpiredRipples: (now: number) => void
  updateFlightPositions: (now: number) => void
}>()

const emit = defineEmits<{
  (e: 'updateBlock', id: string, updates: Partial<Block>): void
  (e: 'removeBlock', id: string): void
  (e: 'addBlock', x: number, y: number): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWrapperRef = ref<HTMLDivElement | null>(null)

const editingBlockId = ref<string | null>(null)
const tempFrequency = ref(5)
const tempColor = ref('#FF4757')

const dragState = reactive({
  isDragging: false,
  blockId: null as string | null,
  offsetX: 0,
  offsetY: 0
})

let animFrameId: number | null = null
let lastTime = 0

const editingBlock = computed(() => {
  if (!editingBlockId.value) return null
  return props.blocks.find(b => b.id === editingBlockId.value) || null
})

const panelStyle = computed(() => {
  const block = editingBlock.value
  if (!block) return {}
  const panelW = 280
  const panelH = 320
  let left = block.x + BLOCK_SIZE / 2 + 20
  let top = block.y - panelH / 2
  if (left + panelW > BOARD_WIDTH - 20) {
    left = block.x - BLOCK_SIZE / 2 - panelW - 20
  }
  if (top < 20) top = 20
  if (top + panelH > BOARD_HEIGHT - 20) top = BOARD_HEIGHT - panelH - 20
  return {
    left: `${left}px`,
    top: `${top}px`
  }
})

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 }
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

function rgbObj(r: number, g: number, b: number, alpha: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`
}

function getCanvasCtx(): CanvasRenderingContext2D | null {
  return canvasRef.value?.getContext('2d') || null
}

function drawBoardBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createRadialGradient(
    BOARD_WIDTH / 2, BOARD_HEIGHT / 2, 50,
    BOARD_WIDTH / 2, BOARD_HEIGHT / 2, Math.max(BOARD_WIDTH, BOARD_HEIGHT) / 1.2
  )
  gradient.addColorStop(0, '#1e1e4a')
  gradient.addColorStop(0.5, '#12122e')
  gradient.addColorStop(1, '#070718')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  for (let i = 0; i < 80; i++) {
    const x = ((i * 137.508) % BOARD_WIDTH)
    const y = ((i * 83.137) % BOARD_HEIGHT)
    const size = (i % 3) * 0.4 + 0.3
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(100,100,180,0.05)'
  ctx.lineWidth = 1
  for (let x = 0; x <= BOARD_WIDTH; x += 60) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, BOARD_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= BOARD_HEIGHT; y += 60) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(BOARD_WIDTH, y)
    ctx.stroke()
  }
}

function drawRoundedSquare(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number): void {
  const half = size / 2
  ctx.beginPath()
  ctx.moveTo(x - half + radius, y - half)
  ctx.arcTo(x + half, y - half, x + half, y + half, radius)
  ctx.arcTo(x + half, y + half, x - half, y + half, radius)
  ctx.arcTo(x - half, y + half, x - half, y - half, radius)
  ctx.arcTo(x - half, y - half, x + half, y - half, radius)
  ctx.closePath()
  ctx.fill()
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  now: number,
  blinkMultiplier: number,
  isEditing: boolean
): void {
  const half = BLOCK_SIZE / 2
  const radius = 12

  const glowAlpha = 0.4 * blinkMultiplier
  const glowSize = 35 + 15 * blinkMultiplier
  const glow = ctx.createRadialGradient(block.x, block.y, BLOCK_SIZE * 0.3, block.x, block.y, glowSize)
  glow.addColorStop(0, rgba(block.color, glowAlpha * 0.8))
  glow.addColorStop(1, rgba(block.color, 0))
  ctx.fillStyle = glow
  ctx.fillRect(block.x - glowSize, block.y - glowSize, glowSize * 2, glowSize * 2)

  ctx.save()
  ctx.shadowColor = block.color
  ctx.shadowBlur = 18 * blinkMultiplier
  ctx.fillStyle = block.color
  drawRoundedSquare(ctx, block.x, block.y, BLOCK_SIZE, radius)
  ctx.restore()

  const innerGradient = ctx.createLinearGradient(
    block.x - half, block.y - half,
    block.x + half, block.y + half
  )
  innerGradient.addColorStop(0, 'rgba(255,255,255,0.25)')
  innerGradient.addColorStop(0.5, 'rgba(255,255,255,0.05)')
  innerGradient.addColorStop(1, 'rgba(0,0,0,0.2)')
  ctx.fillStyle = innerGradient
  drawRoundedSquare(ctx, block.x, block.y, BLOCK_SIZE - 4, 10)

  const { r, g, b } = hexToRgb(block.color)
  const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
  ctx.fillStyle = brightness > 140 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)'
  ctx.font = `bold ${Math.round(BLOCK_SIZE * 0.38)}px -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(block.frequency), block.x, block.y)

  if (isEditing) {
    ctx.strokeStyle = 'rgba(139,92,246,0.9)'
    ctx.lineWidth = 3
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    const pad = 6
    if (ctx.roundRect) {
      ctx.roundRect(block.x - half - pad, block.y - half - pad, BLOCK_SIZE + pad * 2, BLOCK_SIZE + pad * 2, radius + 4)
    } else {
      ctx.rect(block.x - half - pad, block.y - half - pad, BLOCK_SIZE + pad * 2, BLOCK_SIZE + pad * 2)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function drawRipple(ctx: CanvasRenderingContext2D, ripple: Ripple, now: number): void {
  const elapsed = now - ripple.startTime
  const progress = Math.min(elapsed / ripple.duration, 1)
  const maxRadius = 80
  const radius = maxRadius * progress
  const alpha = 0.5 * (1 - progress)
  const lineWidth = 2 + 3 * (1 - progress)

  const innerAlpha = 0.15 * (1 - progress)
  ctx.strokeStyle = rgba(ripple.color, innerAlpha)
  ctx.lineWidth = lineWidth * 2.5
  ctx.beginPath()
  ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = rgba(ripple.color, alpha)
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.arc(ripple.x, ripple.y, radius * 0.92, 0, Math.PI * 2)
  ctx.stroke()
}

function drawConnection(
  ctx: CanvasRenderingContext2D,
  b1: Block,
  b2: Block,
  strength: number,
  now: number
): void {
  const alpha = 0.35 * strength
  const c1 = hexToRgb(b1.color)
  const c2 = hexToRgb(b2.color)
  const midColor = rgbObj((c1.r + c2.r) / 2, (c1.g + c2.g) / 2, (c1.b + c2.b) / 2, alpha * 1.2)
  const grad = ctx.createLinearGradient(b1.x, b1.y, b2.x, b2.y)
  grad.addColorStop(0, rgba(b1.color, alpha))
  grad.addColorStop(0.5, midColor)
  grad.addColorStop(1, rgba(b2.color, alpha))
  ctx.strokeStyle = grad
  ctx.lineWidth = 1 + 1.5 * strength
  ctx.beginPath()
  ctx.moveTo(b1.x, b1.y)
  ctx.lineTo(b2.x, b2.y)
  ctx.stroke()
}

function renderFrame(now: number): void {
  const ctx = getCanvasCtx()
  if (!ctx) return

  drawBoardBackground(ctx)

  const pairs = props.getResonancePairs()
  const blinkGroups = props.getSyncBlinkGroups()

  const blinkMap = new Map<string, number>()

  blinkGroups.forEach(group => {
    const period = 2000 / Math.max(group.avgFrequency, 1)
    const phase = (now % period) / period
    const blink = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2)
    group.blocks.forEach(b => {
      blinkMap.set(b.id, 0.6 + 0.4 * blink)
    })
  })

  props.blocks.forEach(b => {
    if (!blinkMap.has(b.id)) {
      const period = 3000 / Math.max(b.frequency, 1)
      blinkMap.set(b.id, 0.8 + 0.2 * Math.sin(now / period * Math.PI * 2))
    }
  })

  pairs.forEach(pair => {
    drawConnection(ctx, pair.block1, pair.block2, pair.strength, now)
  })

  for (const ripple of props.ripples) {
    drawRipple(ctx, ripple, now)
  }

  props.blocks.forEach(block => {
    const blinkMult = blinkMap.get(block.id) ?? 1
    drawBlock(ctx, block, now, blinkMult, block.id === editingBlockId.value)
  })
}

function animationLoop(now: number): void {
  lastTime = now

  props.updateFlightPositions(now)

  const pairs = props.getResonancePairs()
  pairs.forEach(pair => {
    props.triggerRippleIfNeeded(pair.block1, pair.block2, now)
  })

  props.cleanupExpiredRipples(now)

  renderFrame(now)

  animFrameId = requestAnimationFrame(animationLoop)
}

function getCanvasPoint(e: MouseEvent): { x: number; y: number } {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = BOARD_WIDTH / rect.width
  const scaleY = BOARD_HEIGHT / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

function findBlockAt(x: number, y: number): Block | null {
  for (let i = props.blocks.length - 1; i >= 0; i--) {
    const b = props.blocks[i]
    const half = BLOCK_SIZE / 2
    if (x >= b.x - half && x <= b.x + half &&
        y >= b.y - half && y <= b.y + half) {
      return b
    }
  }
  return null
}

function handleCanvasMouseDown(e: MouseEvent): void {
  const { x, y } = getCanvasPoint(e)
  const block = findBlockAt(x, y)
  if (block) {
    dragState.isDragging = true
    dragState.blockId = block.id
    dragState.offsetX = x - block.x
    dragState.offsetY = y - block.y
    if (editingBlockId.value && editingBlockId.value !== block.id) {
      editingBlockId.value = null
    }
  }
}

function handleCanvasMouseMove(e: MouseEvent): void {
  if (!dragState.isDragging || !dragState.blockId) return
  const { x, y } = getCanvasPoint(e)
  const half = BLOCK_SIZE / 2
  const newX = Math.max(half, Math.min(BOARD_WIDTH - half, x - dragState.offsetX))
  const newY = Math.max(half, Math.min(BOARD_HEIGHT - half, y - dragState.offsetY))
  emit('updateBlock', dragState.blockId, { x: newX, y: newY })
}

function handleCanvasMouseUp(): void {
  dragState.isDragging = false
  dragState.blockId = null
}

function handleCanvasDblClick(e: MouseEvent): void {
  const { x, y } = getCanvasPoint(e)
  const block = findBlockAt(x, y)
  if (block) {
    editingBlockId.value = block.id
    tempFrequency.value = block.frequency
    tempColor.value = block.color
  } else {
    editingBlockId.value = null
  }
}

function handleCanvasClick(e: MouseEvent): void {
  const { x, y } = getCanvasPoint(e)
  const block = findBlockAt(x, y)
  if (!block && editingBlockId.value) {
    editingBlockId.value = null
  }
}

function closeEditPanel(): void {
  editingBlockId.value = null
}

function onFrequencyChange(): void {
  if (editingBlockId.value) {
    emit('updateBlock', editingBlockId.value, { frequency: tempFrequency.value })
  }
}

function onColorChange(color: string): void {
  tempColor.value = color
  if (editingBlockId.value) {
    emit('updateBlock', editingBlockId.value, { color })
  }
}

function onDeleteBlock(): void {
  if (editingBlockId.value) {
    emit('removeBlock', editingBlockId.value)
    editingBlockId.value = null
  }
}

async function exportCanvas(filename: string): Promise<void> {
  await nextTick()

  const canvas = document.createElement('canvas')
  canvas.width = BOARD_WIDTH
  canvas.height = BOARD_HEIGHT
  const ctx = canvas.getContext('2d')!
  drawBoardBackground(ctx)

  const pairs = props.getResonancePairs()
  pairs.forEach(pair => {
    drawConnection(ctx, pair.block1, pair.block2, pair.strength, performance.now())
  })

  for (const ripple of props.ripples) {
    drawRipple(ctx, ripple, performance.now())
  }

  props.blocks.forEach(block => {
    drawBlock(ctx, block, performance.now(), 1, false)
  })

  const dataURL = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataURL
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

defineExpose({ exportCanvas })

onMounted(() => {
  lastTime = performance.now()
  animFrameId = requestAnimationFrame(animationLoop)
})

onBeforeUnmount(() => {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
  }
})
</script>

<style scoped>
.board-container {
  position: relative;
  width: 900px;
  height: 600px;
}

.board-canvas-wrapper {
  position: relative;
  width: 900px;
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(139, 92, 246, 0.2),
    0 20px 60px rgba(0, 0, 0, 0.6),
    inset 0 0 120px rgba(139, 92, 246, 0.08);
  cursor: default;
}

.board-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.edit-panel {
  position: absolute;
  width: 280px;
  background: rgba(25, 25, 55, 0.75);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  z-index: 50;
  overflow: hidden;
  user-select: none;
}

.panel-enter-enter-active,
.panel-enter-leave-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.panel-enter-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-8px);
}

.panel-enter-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-8px);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.15);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #e8e8f0;
  letter-spacing: 0.5px;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(139, 92, 246, 0.2);
  color: rgba(220, 220, 240, 0.7);
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.close-btn:hover {
  background: rgba(255, 71, 87, 0.4);
  color: #fff;
}

.panel-body {
  padding: 16px 18px 18px;
}

.field-label {
  display: block;
  font-size: 12px;
  color: rgba(200, 200, 230, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.5px;
}

.freq-section {
  margin-bottom: 20px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.freq-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(78, 205, 196), rgba(139, 92, 246));
  outline: none;
}

.freq-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: 3px solid rgba(139, 92, 246, 0.8);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
  transition: transform 0.15s;
}

.freq-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.freq-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
  border: 3px solid rgba(139, 92, 246, 0.8);
}

.freq-value {
  min-width: 28px;
  text-align: center;
  font-weight: 700;
  font-size: 16px;
  color: #fff;
  background: rgba(139, 92, 246, 0.35);
  padding: 2px 6px;
  border-radius: 6px;
}

.freq-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10px;
  color: rgba(200, 200, 230, 0.35);
}

.color-section {
  margin-bottom: 20px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.color-swatch {
  width: 34px;
  height: 34px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.color-swatch:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.45);
}

.color-swatch.active {
  transform: scale(1.1);
}

.delete-btn {
  width: 100%;
  padding: 10px 14px;
  font-size: 13px;
  color: #ff6b81;
  background: rgba(255, 71, 87, 0.12);
  border: 1px solid rgba(255, 71, 87, 0.3);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.delete-btn:hover {
  background: rgba(255, 71, 87, 0.25);
  border-color: rgba(255, 71, 87, 0.5);
  color: #ff8fa0;
}

.del-icon {
  font-size: 14px;
}
</style>
