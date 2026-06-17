<template>
  <div class="canvas-container">
    <div class="canvas-area">
      <div class="canvas-wrapper">
        <canvas
          ref="canvasRef"
          class="pixel-canvas"
          :width="canvasPixelSize"
          :height="canvasPixelSize"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        ></canvas>
        <canvas
          ref="gridRef"
          class="grid-overlay"
          :width="canvasPixelSize"
          :height="canvasPixelSize"
        ></canvas>
      </div>
    </div>

    <div class="frames-panel">
      <div class="frames-header">
        <h3 class="section-title">帧序列 ({{ frames.length }})</h3>
        <div class="frame-actions">
          <button class="icon-btn" title="新增帧" @click="$emit('add-frame')">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="frames-list" ref="framesListRef">
        <div
          v-for="(frame, index) in frames"
          :key="frame.id"
          class="frame-item"
          :class="{
            selected: index === currentFrameIndex,
            dragging: dragIndex === index,
            'drag-over': dragOverIndex === index && dragIndex !== index
          }"
          :style="getFrameItemStyle(index)"
          draggable="true"
          @click="$emit('select-frame', index)"
          @dragstart="handleDragStart($event, index)"
          @dragover.prevent="handleDragOver($event, index)"
          @dragleave="handleDragLeave"
          @drop="handleDrop($event, index)"
          @dragend="handleDragEnd"
        >
          <div class="frame-number">{{ index + 1 }}</div>
          <img
            class="frame-thumb"
            :src="thumbnails[index]"
            alt=""
            width="60"
            height="60"
          />
          <div class="frame-controls">
            <button class="mini-btn" title="复制帧" @click.stop="$emit('copy-frame', index)">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="1"/>
                <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>
              </svg>
            </button>
            <button
              class="mini-btn"
              title="删除帧"
              :disabled="frames.length <= 1"
              @click.stop="$emit('delete-frame', index)"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import type { Frame, ToolType, BrushSize, GridSize } from '../utils/animationEngine'
import { floodFill, drawBrush, drawLine, clonePixels } from '../utils/animationEngine'
import { generateThumbnail, renderFrameToCanvas } from '../utils/exportSprite'

const props = defineProps<{
  frames: Frame[]
  currentFrameIndex: number
  gridSize: GridSize
  currentTool: ToolType
  brushSize: BrushSize
  selectedColor: string
  highlightColor: string
  onionPrevOpacity: number
  onionNextOpacity: number
}>()

const emit = defineEmits<{
  'update-frame': [index: number, pixels: (string | null)[][]]
  'select-frame': [index: number]
  'add-frame': [afterIndex?: number]
  'copy-frame': [index: number]
  'delete-frame': [index: number]
  'reorder-frames': [from: number, to: number]
  'pick-color': [color: string]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const gridRef = ref<HTMLCanvasElement | null>(null)
const framesListRef = ref<HTMLDivElement | null>(null)

const isDrawing = ref(false)
const lastDrawPos = ref<{ x: number; y: number } | null>(null)
const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const CELL_SIZE = computed(() => props.gridSize === 16 ? 24 : 14)
const canvasPixelSize = computed(() => props.gridSize * CELL_SIZE.value)

const thumbnails = computed(() => {
  return props.frames.map(f => generateThumbnail(f.pixels, props.gridSize, 60))
})

const currentFrame = computed(() => props.frames[props.currentFrameIndex])
const prevFrame = computed(() => {
  if (props.onionPrevOpacity <= 0) return null
  const idx = props.currentFrameIndex - 1
  return idx >= 0 ? props.frames[idx] : null
})
const nextFrame = computed(() => {
  if (props.onionNextOpacity <= 0) return null
  const idx = props.currentFrameIndex + 1
  return idx < props.frames.length ? props.frames[idx] : null
})

function renderCanvas() {
  if (!canvasRef.value || !currentFrame.value) return
  const ctx = canvasRef.value.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvasPixelSize.value, canvasPixelSize.value)

  const sourceCanvas = renderFrameToCanvas(
    currentFrame.value.pixels,
    props.gridSize,
    CELL_SIZE.value,
    prevFrame.value?.pixels || null,
    nextFrame.value?.pixels || null,
    props.onionPrevOpacity,
    props.onionNextOpacity
  )
  ctx.drawImage(sourceCanvas, 0, 0)
}

function renderGrid() {
  if (!gridRef.value) return
  const ctx = gridRef.value.getContext('2d')!
  ctx.clearRect(0, 0, canvasPixelSize.value, canvasPixelSize.value)

  const cs = CELL_SIZE.value
  const gs = props.gridSize

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.lineWidth = 1

  for (let i = 0; i <= gs; i++) {
    ctx.beginPath()
    ctx.moveTo(i * cs + 0.5, 0)
    ctx.lineTo(i * cs + 0.5, gs * cs)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, i * cs + 0.5)
    ctx.lineTo(gs * cs, i * cs + 0.5)
    ctx.stroke()
  }
}

function getPixelCoords(e: MouseEvent): { x: number; y: number } {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = Math.floor((e.clientX - rect.left) * scaleX / CELL_SIZE.value)
  const y = Math.floor((e.clientY - rect.top) * scaleY / CELL_SIZE.value)
  return { x, y }
}

function handleMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const { x, y } = getPixelCoords(e)
  if (x < 0 || x >= props.gridSize || y < 0 || y >= props.gridSize) return

  isDrawing.value = true
  lastDrawPos.value = { x, y }
  applyToolAt(x, y)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDrawing.value) return
  const { x, y } = getPixelCoords(e)
  if (x < 0 || x >= props.gridSize || y < 0 || y >= props.gridSize) {
    lastDrawPos.value = null
    return
  }

  if (props.currentTool === 'pencil' || props.currentTool === 'eraser') {
    if (lastDrawPos.value && (lastDrawPos.value.x !== x || lastDrawPos.value.y !== y)) {
      const color = props.currentTool === 'pencil' ? props.selectedColor : null
      drawLineTo(x, y, color)
    }
    lastDrawPos.value = { x, y }
  }
}

function handleMouseUp() {
  isDrawing.value = false
  lastDrawPos.value = null
}

function drawLineTo(x: number, y: number, color: string | null) {
  const frame = currentFrame.value
  if (!frame || !lastDrawPos.value) return

  const newPixels = drawLine(
    frame.pixels,
    lastDrawPos.value.x,
    lastDrawPos.value.y,
    x,
    y,
    color,
    props.brushSize
  )
  emit('update-frame', props.currentFrameIndex, newPixels)
}

function applyToolAt(x: number, y: number) {
  const frame = currentFrame.value
  if (!frame) return

  let newPixels = frame.pixels

  switch (props.currentTool) {
    case 'pencil':
      newPixels = drawBrush(frame.pixels, x, y, props.selectedColor, props.brushSize)
      break
    case 'eraser':
      newPixels = drawBrush(frame.pixels, x, y, null, props.brushSize)
      break
    case 'fill':
      newPixels = floodFill(frame.pixels, x, y, props.selectedColor)
      break
    case 'picker':
      const color = frame.pixels[y][x]
      if (color) {
        emit('pick-color', color)
      }
      return
  }

  emit('update-frame', props.currentFrameIndex, newPixels)
}

function getFrameItemStyle(index: number) {
  if (dragIndex.value === null) return {}

  let offset = 0
  if (dragOverIndex.value !== null && dragIndex.value !== index) {
    const from = dragIndex.value
    const to = dragOverIndex.value
    if (from < to) {
      if (index > from && index <= to) offset = -76
    } else {
      if (index >= to && index < from) offset = 76
    }
  }

  return {
    transform: offset !== 0 ? `translateY(${offset}px)` : undefined,
    transition: 'transform 0.25s ease',
    opacity: dragIndex.value === index ? 0.5 : undefined
  }
}

function handleDragStart(e: DragEvent, index: number) {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function handleDragOver(_e: DragEvent, index: number) {
  dragOverIndex.value = index
}

function handleDragLeave() {
}

function handleDrop(_e: DragEvent, index: number) {
  if (dragIndex.value !== null && dragIndex.value !== index) {
    emit('reorder-frames', dragIndex.value, index)
  }
  dragIndex.value = null
  dragOverIndex.value = null
}

function handleDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

watch(
  () => [props.currentFrameIndex, props.frames, props.gridSize, props.onionPrevOpacity, props.onionNextOpacity, prevFrame.value, nextFrame.value],
  () => {
    nextTick(renderCanvas)
  },
  { deep: true }
)

watch(
  () => props.gridSize,
  () => {
    nextTick(() => {
      renderCanvas()
      renderGrid()
    })
  }
)

onMounted(() => {
  renderCanvas()
  renderGrid()
})
</script>

<style scoped>
.canvas-container {
  flex: 1;
  min-width: 480px;
  display: flex;
  background: #1e1e22;
}

.canvas-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
}

.canvas-wrapper {
  position: relative;
  background: #0d0d10;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.pixel-canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  cursor: crosshair;
}

.grid-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  pointer-events: none;
}

.frames-panel {
  width: 180px;
  min-width: 180px;
  background: #2d2d32;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #3d3d42;
}

.frames-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid #3d3d42;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
}

.frame-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  padding: 6px;
  border-radius: 6px;
  background: #3d3d42;
  color: #9a9a9e;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: #4d4d52;
  color: #e0e0e0;
}

.frames-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.frame-item {
  position: relative;
  background: #1e1e22;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.frame-item:hover {
  background: #2a2a2e;
}

.frame-item.selected {
  border-color: v-bind(highlightColor);
  box-shadow: 0 0 12px v-bind(highlightColor);
}

.frame-item.dragging {
  opacity: 0.5;
}

.frame-number {
  position: absolute;
  top: 8px;
  left: 10px;
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.6);
  padding: 1px 5px;
  border-radius: 3px;
  z-index: 1;
}

.frame-thumb {
  display: block;
  margin: 0 auto;
  image-rendering: pixelated;
  background: #0d0d10;
  border-radius: 4px;
}

.frame-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.frame-item:hover .frame-controls {
  opacity: 1;
}

.mini-btn {
  padding: 3px;
  background: rgba(61, 61, 66, 0.9);
  border-radius: 4px;
  color: #9a9a9e;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-btn:hover:not(:disabled) {
  background: #6c6cff;
  color: #ffffff;
}

.mini-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
