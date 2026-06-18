<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useDesignStore } from '@/stores/designStore'
import { useCanvas } from '@/composables/useCanvas'
import { STATUS_COLORS } from '@/types'
import type { Annotation } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { Upload, Move, ZoomIn, ZoomOut, RotateCcw } from 'lucide-vue-next'

const store = useDesignStore()
const canvas = useCanvas()

const containerRef = ref<HTMLElement | null>(null)
const imageEl = ref<HTMLImageElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const dragStartPos = ref({ x: 0, y: 0 })
const drawingAnnotation = ref<{ x: number; y: number; radius: number } | null>(null)
const showAnnotationModal = ref(false)
const newAnnotationContent = ref('')
const pendingAnnotationPos = ref({ x: 0, y: 0 })
const draggingAnnotationId = ref<string | null>(null)
const dragAnnotationOffset = ref({ x: 0, y: 0 })
const hoverAnnotationId = ref<string | null>(null)
const hoveredAnnotationForCanvas = ref<string | null>(null)

const imageSrc = computed(() => store.currentImage?.url ?? '')
const imageNaturalWidth = computed(() => store.currentImage?.naturalWidth ?? 0)
const imageNaturalHeight = computed(() => store.currentImage?.naturalHeight ?? 0)

const displayWidth = computed(() => {
  if (!containerRef.value) return 800
  const maxW = Math.min(containerRef.value.clientWidth - 40, 1280)
  if (imageNaturalWidth.value <= maxW) return imageNaturalWidth.value
  return maxW
})

const displayHeight = computed(() => {
  if (!imageNaturalWidth.value || !imageNaturalHeight.value) return 600
  return (displayWidth.value / imageNaturalWidth.value) * imageNaturalHeight.value
})

const containerStyle = computed(() => ({
  cursor: canvas.isSpaceDown.value ? 'grab' : isDragging.value ? 'grabbing' : 'crosshair',
}))

const imageStyle = computed(() => ({
  transform: `translate(${canvas.offsetX.value}px, ${canvas.offsetY.value}px) scale(${canvas.scale.value})`,
  transformOrigin: '0 0',
  width: `${displayWidth.value}px`,
  height: `${displayHeight.value}px`,
}))

function handleFileUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  loadImageFile(file)
  input.value = ''
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files[0]
  if (!file) return
  loadImageFile(file)
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function loadImageFile(file: File) {
  if (!file.type.match(/image\/(png|jpeg|jpg)/)) return
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    store.setCurrentImage({
      id: uuidv4(),
      url,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      fileName: file.name,
      uploadedAt: Date.now(),
    })
    canvas.resetView()
  }
  img.src = url
}

function onMouseDown(e: MouseEvent) {
  if (canvas.isSpaceDown.value) {
    canvas.startPan(e)
    return
  }
  if (!store.currentImage) return
  if (!containerRef.value) return

  const clickedAnnotation = getAnnotationAtPoint(e)
  if (clickedAnnotation) {
    draggingAnnotationId.value = clickedAnnotation.id
    const pos = canvas.screenToCanvas(e.clientX, e.clientY, containerRef.value!)
    dragAnnotationOffset.value = {
      x: clickedAnnotation.x - pos.x,
      y: clickedAnnotation.y - pos.y,
    }
    store.setActiveAnnotation(clickedAnnotation.id)
    return
  }

  const pos = canvas.screenToCanvas(e.clientX, e.clientY, containerRef.value)
  isDragging.value = true
  dragStartPos.value = pos
  drawingAnnotation.value = { x: pos.x, y: pos.y, radius: 12 }
}

function onMouseMove(e: MouseEvent) {
  if (canvas.isPanning.value) {
    canvas.movePan(e)
    return
  }
  if (draggingAnnotationId.value && containerRef.value) {
    const pos = canvas.screenToCanvas(e.clientX, e.clientY, containerRef.value)
    const newX = pos.x + dragAnnotationOffset.value.x
    const newY = pos.y + dragAnnotationOffset.value.y
    store.updateAnnotationPosition(draggingAnnotationId.value, newX, newY)
    return
  }
  if (isDragging.value && containerRef.value) {
    const pos = canvas.screenToCanvas(e.clientX, e.clientY, containerRef.value)
    const dx = pos.x - dragStartPos.value.x
    const dy = pos.y - dragStartPos.value.y
    const radius = Math.max(12, Math.sqrt(dx * dx + dy * dy))
    drawingAnnotation.value = { x: dragStartPos.value.x, y: dragStartPos.value.y, radius }
    return
  }

  if (containerRef.value && !canvas.isSpaceDown.value) {
    const hovered = getAnnotationAtPoint(e)
    hoveredAnnotationForCanvas.value = hovered?.id ?? null
  }
}

function onMouseUp() {
  if (canvas.isPanning.value) {
    canvas.endPan()
    return
  }
  if (draggingAnnotationId.value) {
    draggingAnnotationId.value = null
    return
  }
  if (isDragging.value && drawingAnnotation.value) {
    pendingAnnotationPos.value = {
      x: drawingAnnotation.value.x,
      y: drawingAnnotation.value.y,
    }
    showAnnotationModal.value = true
    isDragging.value = false
    drawingAnnotation.value = null
  }
}

function getAnnotationAtPoint(e: MouseEvent): Annotation | null {
  if (!containerRef.value) return null
  const pos = canvas.screenToCanvas(e.clientX, e.clientY, containerRef.value)
  const annotations = store.currentImageAnnotations
  for (let i = annotations.length - 1; i >= 0; i--) {
    const a = annotations[i]
    const dx = pos.x - a.x
    const dy = pos.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist <= a.radius + 4) return a
  }
  return null
}

function confirmAnnotation() {
  const content = newAnnotationContent.value.trim()
  if (!content) return
  store.addAnnotation(pendingAnnotationPos.value.x, pendingAnnotationPos.value.y, content)
  cancelAnnotation()
}

function cancelAnnotation() {
  showAnnotationModal.value = false
  newAnnotationContent.value = ''
  pendingAnnotationPos.value = { x: 0, y: 0 }
}

function getAnnotationScreenPos(a: Annotation) {
  const x = a.x * (displayWidth.value / imageNaturalWidth.value)
  const y = a.y * (displayHeight.value / imageNaturalHeight.value)
  return { x, y }
}

function getAnnotationScreenRadius(a: Annotation) {
  return a.radius * (displayWidth.value / imageNaturalWidth.value)
}

function onWheel(e: WheelEvent) {
  canvas.handleWheel(e)
}

function onKeydown(e: KeyboardEvent) {
  canvas.handleKeyDown(e)
}

function onKeyup(e: KeyboardEvent) {
  canvas.handleKeyUp(e)
}

function zoomIn() {
  canvas.scale.value = Math.min(3, Math.round((canvas.scale.value + 0.2) * 100) / 100)
}

function zoomOut() {
  canvas.scale.value = Math.max(0.5, Math.round((canvas.scale.value - 0.2) * 100) / 100)
}

function resetZoom() {
  canvas.resetView()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onKeyup)
})
</script>

<template>
  <div
    ref="containerRef"
    class="canvas-container"
    :style="containerStyle"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @mouseleave="onMouseUp"
    @wheel.prevent="onWheel"
    @drop="handleDrop"
    @dragover="handleDragOver"
  >
    <div v-if="!store.currentImage" class="upload-zone" @click="fileInputRef?.click()">
      <Upload :size="48" :stroke-width="1.5" color="#999" />
      <p class="upload-text">拖拽或点击上传设计稿</p>
      <p class="upload-hint">支持 PNG / JPG 格式</p>
      <input
        ref="fileInputRef"
        type="file"
        accept=".png,.jpg,.jpeg"
        class="hidden-input"
        @change="handleFileUpload"
      />
    </div>

    <template v-else>
      <div class="canvas-tools">
        <button class="tool-btn" title="上传新图片" @click="fileInputRef?.click()">
          <Upload :size="16" />
        </button>
        <button class="tool-btn" title="放大" @click="zoomIn">
          <ZoomIn :size="16" />
        </button>
        <button class="tool-btn" title="缩小" @click="zoomOut">
          <ZoomOut :size="16" />
        </button>
        <button class="tool-btn" title="重置视图" @click="resetZoom">
          <RotateCcw :size="16" />
        </button>
        <span class="zoom-label">{{ Math.round(canvas.scale.value * 100) }}%</span>
      </div>

      <div class="canvas-viewport">
        <div class="canvas-transform" :style="imageStyle">
          <img
            ref="imageEl"
            :src="imageSrc"
            class="canvas-image"
            draggable="false"
          />
          <svg class="annotations-layer" :viewBox="`0 0 ${displayWidth} ${displayHeight}`">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g
              v-for="a in store.currentImageAnnotations"
              :key="a.id"
              class="annotation-group"
              :class="{
                'annotation-active': store.activeAnnotationId === a.id,
                'annotation-hover': hoveredAnnotationForCanvas === a.id,
              }"
              @mousedown.stop
              @click.stop="store.setActiveAnnotation(a.id)"
            >
              <circle
                :cx="getAnnotationScreenPos(a).x"
                :cy="getAnnotationScreenPos(a).y"
                :r="getAnnotationScreenRadius(a) + 6"
                fill="none"
                :stroke="STATUS_COLORS[a.status]"
                stroke-width="2"
                stroke-dasharray="4 4"
                class="annotation-ring"
                :class="{ 'ring-breathing': hoveredAnnotationForCanvas === a.id }"
              />
              <circle
                :cx="getAnnotationScreenPos(a).x"
                :cy="getAnnotationScreenPos(a).y"
                :r="getAnnotationScreenRadius(a)"
                :fill="STATUS_COLORS[a.status] + '40'"
                :stroke="STATUS_COLORS[a.status]"
                stroke-width="2"
                class="annotation-circle"
              />
              <text
                :x="getAnnotationScreenPos(a).x"
                :y="getAnnotationScreenPos(a).y + 1"
                text-anchor="middle"
                dominant-baseline="middle"
                fill="white"
                font-size="10"
                font-weight="600"
              >
                {{ store.currentImageAnnotations.indexOf(a) + 1 }}
              </text>
            </g>
            <g v-if="drawingAnnotation">
              <circle
                :cx="drawingAnnotation.x * (displayWidth / imageNaturalWidth)"
                :cy="drawingAnnotation.y * (displayHeight / imageNaturalHeight)"
                :r="drawingAnnotation.radius * (displayWidth / imageNaturalWidth)"
                fill="#FF6B3540"
                stroke="#FF6B35"
                stroke-width="2"
                stroke-dasharray="6 3"
              />
            </g>
          </svg>
        </div>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept=".png,.jpg,.jpeg"
        class="hidden-input"
        @change="handleFileUpload"
      />
    </template>

    <Teleport to="body">
      <div v-if="showAnnotationModal" class="modal-overlay" @click.self="cancelAnnotation">
        <div class="modal-content">
          <h3 class="modal-title">添加标注</h3>
          <textarea
            v-model="newAnnotationContent"
            class="modal-input"
            placeholder="输入标注内容（最多200字）"
            maxlength="200"
            rows="4"
            @keydown.enter.ctrl="confirmAnnotation"
          />
          <p class="modal-char-count">{{ newAnnotationContent.length }}/200</p>
          <div class="modal-actions">
            <button class="btn btn-cancel" @click="cancelAnnotation">取消</button>
            <button class="btn btn-confirm" @click="confirmAnnotation">确认</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.canvas-container {
  position: relative;
  flex: 1;
  min-width: 800px;
  height: 100%;
  overflow: hidden;
  background-color: #f0f0f0;
  background-image: linear-gradient(#d0d0d0 1px, transparent 1px),
    linear-gradient(90deg, #d0d0d0 1px, transparent 1px);
  background-size: 20px 20px;
}

.upload-zone {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.upload-zone:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.upload-text {
  font-size: 16px;
  color: #666;
  font-weight: 500;
}

.upload-hint {
  font-size: 13px;
  color: #999;
}

.hidden-input {
  display: none;
}

.canvas-tools {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #555;
  transition: all 0.15s;
}

.tool-btn:hover {
  background: #f0f0f0;
  color: #222;
}

.zoom-label {
  font-size: 12px;
  color: #888;
  padding: 0 8px;
  min-width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.canvas-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-transform {
  position: relative;
  will-change: transform;
}

.canvas-image {
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  pointer-events: none;
}

.annotations-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.annotation-group {
  pointer-events: auto;
  cursor: pointer;
}

.annotation-circle {
  transition: fill 0.3s, stroke 0.3s;
}

.annotation-ring {
  opacity: 0;
  transition: opacity 0.2s;
}

.annotation-hover .annotation-ring,
.annotation-active .annotation-ring {
  opacity: 1;
}

.ring-breathing {
  animation: breathe 1.5s ease-in-out infinite;
}

@keyframes breathe {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  animation: fadeIn 0.15s ease-out;
}

.modal-content {
  background: white;
  border-radius: 6px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.2s ease-out;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #222;
  margin-bottom: 16px;
}

.modal-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.modal-input:focus {
  outline: none;
  border-color: #4b7bec;
}

.modal-char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin: 6px 0 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  background: #f0f0f0;
  color: #555;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-confirm {
  background: #4b7bec;
  color: white;
}

.btn-confirm:hover {
  background: #3a6bd4;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
