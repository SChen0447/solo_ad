<template>
  <div class="canvas-container" ref="containerRef">
    <div class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="preview-canvas"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
      ></canvas>
      <div class="canvas-overlay">
        <div class="frame-counter">
          <span class="counter-label">帧</span>
          <span class="counter-value">{{ state.currentFrame }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { timelineManager } from '@/modules/timeline/timelineManager'
import { renderEngine } from '@/modules/render/renderEngine'
import type { CanvasElement } from '@/modules/render/canvasElement'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const state = timelineManager.getStateSnapshot()

let animationFrameId: number | null = null
let isDragging = false
let dragStartX = 0
let dragStartY = 0
let dragElement: CanvasElement | null = null
let dragElementStartX = 0
let dragElementStartY = 0

function render() {
  if (canvasRef.value) {
    renderEngine.render(
      state.elements.value,
      state.currentFrame.value,
      state.selectedElementId.value
    )
  }
}

function renderLoop() {
  render()
  animationFrameId = requestAnimationFrame(renderLoop)
}

function resizeCanvas() {
  if (!containerRef.value || !canvasRef.value) return

  const container = containerRef.value
  const wrapper = container.querySelector('.canvas-wrapper')
  if (!wrapper) return

  const rect = container.getBoundingClientRect()
  const width = Math.floor(rect.width * 0.9)
  const height = Math.floor(rect.height * 0.85)

  canvasRef.value.width = width
  canvasRef.value.height = height
  renderEngine.setCanvas(canvasRef.value)
  renderEngine.resize(width, height)
}

function onMouseDown(e: MouseEvent) {
  if (!canvasRef.value) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const hitElement = renderEngine.hitTest(
    state.elements.value,
    state.currentFrame.value,
    x,
    y
  )

  if (hitElement) {
    timelineManager.selectElement(hitElement.id)
    isDragging = true
    dragElement = hitElement
    dragStartX = x
    dragStartY = y

    const props = hitElement.getInterpolatedProperties(state.currentFrame.value)
    dragElementStartX = props.x
    dragElementStartY = props.y
  } else {
    timelineManager.selectElement(null)
  }
}

function onMouseMove(e: MouseEvent) {
  if (!canvasRef.value || !isDragging || !dragElement) return

  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const dx = x - dragStartX
  const dy = y - dragStartY

  const newX = dragElementStartX + dx
  const newY = dragElementStartY + dy

  const currentFrame = state.currentFrame.value
  const elementId = dragElement.id

  const kf = dragElement.getKeyframeAtFrame(currentFrame)
  if (kf) {
    timelineManager.updateKeyframeProperties(elementId, currentFrame, {
      x: newX,
      y: newY
    })
  } else {
    timelineManager.addKeyframe(elementId, currentFrame, {
      x: newX,
      y: newY
    })
  }
}

function onMouseUp() {
  isDragging = false
  dragElement = null
}

onMounted(() => {
  if (canvasRef.value) {
    renderEngine.setCanvas(canvasRef.value)
  }
  resizeCanvas()
  renderLoop()

  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  window.removeEventListener('resize', resizeCanvas)
})

watch(
  () => state.elements.value,
  () => {
    render()
  },
  { deep: true }
)
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%);
  position: relative;
  overflow: hidden;
}

.canvas-wrapper {
  position: relative;
  box-shadow: 
    0 0 40px rgba(0, 212, 255, 0.15),
    0 0 80px rgba(255, 0, 255, 0.1),
    inset 0 0 60px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.preview-canvas {
  display: block;
  border-radius: 8px;
  cursor: default;
}

.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.frame-counter {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid rgba(0, 212, 255, 0.3);
  backdrop-filter: blur(4px);
}

.counter-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.counter-value {
  font-size: 20px;
  font-weight: 700;
  color: #00d4ff;
  font-family: 'Courier New', monospace;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.8);
}
</style>
