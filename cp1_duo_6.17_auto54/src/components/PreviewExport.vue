<template>
  <div class="preview-panel">
    <div class="panel-section">
      <h3 class="section-title">动画预览</h3>
      <div class="preview-canvas-wrapper">
        <canvas
          ref="previewCanvasRef"
          class="preview-canvas"
          width="128"
          height="128"
        ></canvas>
      </div>
      <div class="playback-controls">
        <button class="control-btn" title="上一帧" @click="$emit('prev-frame')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 20L9 12l10-8v16zM5 19V5"/>
          </svg>
        </button>
        <button
          class="control-btn play-btn"
          :title="isPlaying ? '暂停' : '播放'"
          @click="$emit('toggle-play')"
        >
          <svg v-if="!isPlaying" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>
        <button class="control-btn" title="下一帧" @click="$emit('next-frame')">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 4l10 8-10 8V4zM19 5v14"/>
          </svg>
        </button>
      </div>
      <div class="frame-indicator">
        <span class="label">帧</span>
        <input
          type="number"
          :value="currentFrameIndex + 1"
          :min="1"
          :max="frames.length"
          @input="handleFrameInput"
        />
        <span class="separator">/</span>
        <span class="total">{{ frames.length }}</span>
      </div>
    </div>

    <div class="panel-section">
      <h3 class="section-title">播放速度</h3>
      <div class="speed-control">
        <input
          type="range"
          :value="playbackSpeed"
          min="1"
          max="6"
          step="0.5"
          @input="handleSpeedInput"
        />
        <div class="speed-display">
          <span>{{ playbackSpeed.toFixed(1) }}x</span>
        </div>
      </div>
      <div class="speed-presets">
        <button
          v-for="s in speedPresets"
          :key="s"
          class="speed-preset"
          :class="{ active: playbackSpeed === s }"
          @click="$emit('change-speed', s)"
        >
          {{ s }}x
        </button>
      </div>
    </div>

    <div class="panel-section">
      <h3 class="section-title">洋葱皮效果</h3>
      <div class="onion-control">
        <div class="control-row">
          <span class="onion-label prev">
            <span class="dot"></span>
            前一帧
          </span>
          <span class="onion-value">{{ onionPrevOpacity }}%</span>
        </div>
        <input
          type="range"
          :value="onionPrevOpacity"
          min="0"
          max="50"
          step="5"
          @input="handleOnionPrevInput"
        />
      </div>
      <div class="onion-control">
        <div class="control-row">
          <span class="onion-label next">
            <span class="dot"></span>
            后一帧
          </span>
          <span class="onion-value">{{ onionNextOpacity }}%</span>
        </div>
        <input
          type="range"
          :value="onionNextOpacity"
          min="0"
          max="50"
          step="5"
          @input="handleOnionNextInput"
        />
      </div>
    </div>

    <div class="panel-section">
      <h3 class="section-title">导出</h3>
      <button
        class="export-btn"
        :class="{ spinning: exportingSprite }"
        :disabled="exportingSprite"
        @click="handleExportSprite"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
        </svg>
        <span>导出 Spritesheet</span>
      </button>
      <button
        class="export-btn primary"
        :class="{ spinning: exportingGif }"
        :disabled="exportingGif"
        @click="handleExportGif"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <circle cx="8.5" cy="12" r="1.5"/>
          <circle cx="15.5" cy="12" r="1.5"/>
          <path d="M12 8v8"/>
        </svg>
        <span>导出 GIF 动图</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import type { Frame, GridSize } from '../utils/animationEngine'
import { renderFrameToCanvas } from '../utils/exportSprite'

const props = defineProps<{
  frames: Frame[]
  currentFrameIndex: number
  gridSize: GridSize
  playbackSpeed: number
  onionPrevOpacity: number
  onionNextOpacity: number
  isPlaying: boolean
}>()

const emit = defineEmits<{
  'change-speed': [speed: number]
  'change-onion-prev': [value: number]
  'change-onion-next': [value: number]
  'toggle-play': []
  'prev-frame': []
  'next-frame': []
  'goto-frame': [index: number]
  'export-spritesheet': []
  'export-gif': []
}>()

const previewCanvasRef = ref<HTMLCanvasElement | null>(null)
const exportingSprite = ref(false)
const exportingGif = ref(false)

const speedPresets = [1, 1.5, 2, 3, 4, 6]

function renderPreview() {
  if (!previewCanvasRef.value) return
  const canvas = previewCanvasRef.value
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const frame = props.frames[props.currentFrameIndex]
  if (!frame) return

  const PREVIEW_SIZE = 128
  const cellSize = Math.floor(PREVIEW_SIZE / props.gridSize)
  const offset = (PREVIEW_SIZE - cellSize * props.gridSize) / 2

  const source = renderFrameToCanvas(
    frame.pixels,
    props.gridSize,
    cellSize
  )
  ctx.drawImage(source, offset, offset)
}

function handleFrameInput(e: Event) {
  const target = e.target as HTMLInputElement
  const val = parseInt(target.value, 10)
  if (!isNaN(val)) {
    const idx = Math.max(1, Math.min(props.frames.length, val)) - 1
    emit('goto-frame', idx)
  }
}

function handleSpeedInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('change-speed', parseFloat(target.value))
}

function handleOnionPrevInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('change-onion-prev', parseInt(target.value, 10))
}

function handleOnionNextInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('change-onion-next', parseInt(target.value, 10))
}

function handleExportSprite() {
  exportingSprite.value = true
  emit('export-spritesheet')
  setTimeout(() => {
    exportingSprite.value = false
  }, 600)
}

async function handleExportGif() {
  exportingGif.value = true
  emit('export-gif')
  setTimeout(() => {
    exportingGif.value = false
  }, 600)
}

watch(
  () => [props.currentFrameIndex, props.frames, props.gridSize],
  () => {
    nextTick(renderPreview)
  },
  { deep: true }
)

onMounted(() => {
  renderPreview()
})
</script>

<style scoped>
.preview-panel {
  width: 260px;
  min-width: 260px;
  background: #2a2a2e;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-bottom: 6px;
  border-bottom: 1px solid #3d3d42;
}

.preview-canvas-wrapper {
  display: flex;
  justify-content: center;
  padding: 12px;
  background: #0d0d10;
  border-radius: 8px;
}

.preview-canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  background: #1e1e22;
  border-radius: 4px;
}

.playback-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.control-btn {
  padding: 8px;
  background: #3d3d42;
  border-radius: 6px;
  color: #e0e0e0;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover {
  background: #4d4d52;
}

.control-btn.play-btn {
  padding: 10px;
  background: #6c6cff;
}

.control-btn.play-btn:hover {
  background: #7d7dff;
}

.frame-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.frame-indicator .label {
  font-size: 12px;
  color: #9a9a9e;
}

.frame-indicator input {
  width: 48px;
  text-align: center;
  font-size: 13px;
  background: #3d3d42;
  color: #e0e0e0;
  border: none;
  border-radius: 6px;
  padding: 4px 6px;
  outline: none;
  font-family: monospace;
}

.frame-indicator .separator,
.frame-indicator .total {
  font-size: 13px;
  color: #9a9a9e;
  font-family: monospace;
}

.speed-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.speed-control input[type="range"] {
  width: 100%;
}

.speed-display {
  display: flex;
  justify-content: flex-end;
}

.speed-display span {
  font-size: 12px;
  color: #9a9a9e;
  font-family: monospace;
}

.speed-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.speed-preset {
  padding: 5px;
  background: #3d3d42;
  border-radius: 6px;
  font-size: 12px;
  color: #9a9a9e;
  transition: all 0.2s ease;
}

.speed-preset:hover {
  background: #4d4d52;
}

.speed-preset.active {
  background: #6c6cff;
  color: #ffffff;
}

.onion-control {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.onion-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9a9a9e;
}

.onion-label .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.onion-label.prev .dot {
  background: rgba(255, 80, 80, 0.7);
}

.onion-label.next .dot {
  background: rgba(80, 140, 255, 0.7);
}

.onion-value {
  font-size: 12px;
  color: #e0e0e0;
  font-family: monospace;
}

.export-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  background: #3d3d42;
  border-radius: 6px;
  font-size: 13px;
  color: #e0e0e0;
  transition: all 0.2s ease;
  perspective: 200px;
}

.export-btn:hover:not(:disabled) {
  background: #4d4d52;
}

.export-btn.primary {
  background: #6c6cff;
}

.export-btn.primary:hover:not(:disabled) {
  background: #7d7dff;
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-btn.spinning svg {
  animation: spinY 0.6s linear;
}

@keyframes spinY {
  from { transform: rotateY(0deg); }
  to { transform: rotateY(360deg); }
}
</style>
