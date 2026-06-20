<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useMusicStore, getNoteColor } from '@/stores/musicStore'
import { getCurrentVolume } from '@/utils/audioEngine'

const store = useMusicStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null

interface LightPoint {
  x: number
  y: number
  baseRadius: number
  startTime: number
  duration: number
  color: string
  noteIndex: number
}
const lightPoints: LightPoint[] = []
const renderedIds = new Set<string>()

function addLightPoint(noteIndex: number, id: string, color: string, now: number) {
  if (!canvasRef.value) return
  const w = canvasRef.value.width
  const h = canvasRef.value.height
  const cx = w / 2
  const noteY = h - 30 - (noteIndex / 23) * (h - 80)
  lightPoints.push({
    x: cx + (Math.random() - 0.5) * 20,
    y: noteY,
    baseRadius: 8,
    startTime: now,
    duration: 200,
    color,
    noteIndex
  })
  renderedIds.add(id)
}

watch(
  () => store.activeNotes.map(a => a.placedNoteId),
  (ids) => {
    const now = performance.now()
    for (const active of store.activeNotes) {
      if (!renderedIds.has(active.placedNoteId)) {
        addLightPoint(active.index, active.placedNoteId, getNoteColor(active.index), now)
      }
    }
    for (const id of Array.from(renderedIds)) {
      if (!ids.includes(id)) {
        renderedIds.delete(id)
      }
    }
  },
  { deep: true }
)

function drawNoteLines(w: number, h: number) {
  if (!ctx) return
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 23; i++) {
    const y = h - 30 - (i / 23) * (h - 80)
    ctx.beginPath()
    ctx.moveTo(40, y)
    ctx.lineTo(w - 20, y)
    ctx.stroke()
  }
  for (let i = 0; i <= 23; i += 6) {
    const y = h - 30 - (i / 23) * (h - 80)
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'
    ctx.font = '10px sans-serif'
    ctx.fillText(i < 12 ? `C${4 + Math.floor(i / 12)}` : `C${4 + Math.floor(i / 12)}`, 10, y + 3)
  }
}

function render() {
  if (!ctx || !canvasRef.value) return
  const w = canvasRef.value.width
  const h = canvasRef.value.height
  ctx.clearRect(0, 0, w, h)

  ctx.fillStyle = 'rgba(15, 23, 42, 0.4)'
  ctx.fillRect(0, 0, w, h)

  drawNoteLines(w, h)

  const volume = getCurrentVolume()
  const now = performance.now()

  for (let i = lightPoints.length - 1; i >= 0; i--) {
    const lp = lightPoints[i]
    const age = now - lp.startTime
    if (age >= lp.duration) {
      lightPoints.splice(i, 1)
      continue
    }
    const t = age / lp.duration
    const volumeBoost = 1 + volume * 1.2
    const radius = (8 + volume * 12) * (1 - t * 0.5)
    const alpha = 1 - t

    const grad = ctx.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, radius * 2.5)
    grad.addColorStop(0, lp.color)
    grad.addColorStop(0.4, lp.color + 'aa')
    grad.addColorStop(1, 'transparent')

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.shadowBlur = 20 + volume * 20
    ctx.shadowColor = lp.color
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(lp.x, lp.y, radius * 2.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(lp.x, lp.y, radius * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    void volumeBoost
    void lp.baseRadius
  }

  rafId = requestAnimationFrame(render)
}

function resize() {
  if (!canvasRef.value || !containerRef.value) return
  const dpr = window.devicePixelRatio || 1
  const rect = containerRef.value.getBoundingClientRect()
  canvasRef.value.width = rect.width * dpr
  canvasRef.value.height = rect.height * dpr
  canvasRef.value.style.width = rect.width + 'px'
  canvasRef.value.style.height = rect.height + 'px'
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (ctx) (ctx as any)._width = rect.width, (ctx as any)._height = rect.height
}

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    resize()
    window.addEventListener('resize', resize)
    render()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resize)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div ref="containerRef" class="visualizer">
    <div class="viz-header">
      <h3 class="viz-title">实时可视化</h3>
      <div class="viz-legend">
        <span class="legend-dot low"></span>
        <span class="legend-text">低音</span>
        <span class="legend-dot high"></span>
        <span class="legend-text">高音</span>
      </div>
    </div>
    <div class="viz-canvas-wrap">
      <canvas ref="canvasRef" class="viz-canvas"></canvas>
      <div v-if="store.activeNotes.length === 0" class="viz-empty">
        <div class="empty-hint">播放以查看光点动画</div>
      </div>
    </div>
    <div class="active-notes">
      <div class="active-label">激活音符:</div>
      <div class="active-list">
        <span
          v-for="a in store.activeNotes"
          :key="a.placedNoteId"
          class="active-badge"
          :style="{ background: getNoteColor(a.index) }"
        >{{ a.name }}</span>
        <span v-if="store.activeNotes.length === 0" class="active-empty">--</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.visualizer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.8);
  border-left: 1px solid rgba(99, 102, 241, 0.3);
  padding: 16px;
  box-shadow: inset 0 0 20px rgba(99, 102, 241, 0.05);
}

.viz-header {
  margin-bottom: 12px;
}

.viz-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #E2E8F0;
  text-align: center;
  letter-spacing: 1px;
}

.viz-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: #94A3B8;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot.low {
  background: #4F46E5;
  box-shadow: 0 0 6px rgba(79, 70, 229, 0.6);
}

.legend-dot.high {
  background: #7C3AED;
  box-shadow: 0 0 6px rgba(124, 58, 237, 0.6);
}

.viz-canvas-wrap {
  flex: 1;
  position: relative;
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.7);
  border: 1px solid rgba(99, 102, 241, 0.2);
  overflow: hidden;
}

.viz-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.viz-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.empty-hint {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.5);
}

.active-notes {
  margin-top: 12px;
  padding: 10px;
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(99, 102, 241, 0.15);
}

.active-label {
  font-size: 11px;
  color: #94A3B8;
  margin-bottom: 6px;
}

.active-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 22px;
  align-items: center;
}

.active-badge {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  padding: 3px 7px;
  border-radius: 10px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.2);
  animation: badgeIn 0.2s ease;
}

.active-empty {
  font-size: 11px;
  color: rgba(148, 163, 184, 0.4);
}

@keyframes badgeIn {
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
