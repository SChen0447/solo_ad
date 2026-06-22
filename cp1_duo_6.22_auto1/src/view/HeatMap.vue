<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useTaskStore, type HeatMapCell } from '@/data/taskStore'
import { useResizeObserver } from '@vueuse/core'

const store = useTaskStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)
const hoveredCell = ref<HeatMapCell | null>(null)
const hoverPos = ref({ x: 0, y: 0 })

const CELL_WIDTH = 48
const CELL_HEIGHT = 40
const CELL_GAP = 4
const PADDING_LEFT = 72
const PADDING_TOP = 36

const loadColors = {
  1: { bg: '#22c55e', border: '#16a34a' },
  2: { bg: '#f59e0b', border: '#d97706' },
  3: { bg: '#ef4444', border: '#dc2626' },
}

const dates = computed(() => {
  const set = new Set<string>()
  store.heatMapData.forEach(c => set.add(c.date))
  return Array.from(set).sort()
})

const members = computed(() => store.members)

const canvasWidth = computed(() => PADDING_LEFT + dates.value.length * (CELL_WIDTH + CELL_GAP) + 20)
const canvasHeight = computed(() => PADDING_TOP + members.value.length * (CELL_HEIGHT + CELL_GAP) + 20)

let animationFrame: number | null = null
let displayData: Map<string, { level: number; targetLevel: number }> = new Map()

function getCellKey(memberId: string, date: string) {
  return `${memberId}|${date}`
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

function interpolateColor(level1: number, level2: number, t: number) {
  const c1 = hexToRgb(loadColors[level1 as 1 | 2 | 3].bg)
  const c2 = hexToRgb(loadColors[level2 as 1 | 2 | 3].bg)
  return rgbToHex(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t))
}

function drawGrid() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '11px system-ui, -apple-system, sans-serif'

  dates.value.forEach((date, colIdx) => {
    const x = PADDING_LEFT + colIdx * (CELL_WIDTH + CELL_GAP)
    const shortDate = date.slice(5)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.textAlign = 'center'
    ctx.fillText(shortDate, x + CELL_WIDTH / 2, PADDING_TOP - 12)
  })

  members.value.forEach((member, rowIdx) => {
    const y = PADDING_TOP + rowIdx * (CELL_HEIGHT + CELL_GAP)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.textAlign = 'right'
    ctx.fillText(member.name, PADDING_LEFT - 12, y + CELL_HEIGHT / 2 + 4)
  })

  store.heatMapData.forEach(cell => {
    const colIdx = dates.value.indexOf(cell.date)
    const rowIdx = members.value.findIndex(m => m.id === cell.memberId)
    if (colIdx < 0 || rowIdx < 0) return

    const key = getCellKey(cell.memberId, cell.date)
    if (!displayData.has(key)) {
      displayData.set(key, { level: cell.loadLevel, targetLevel: cell.loadLevel })
    } else {
      displayData.get(key)!.targetLevel = cell.loadLevel
    }

    const x = PADDING_LEFT + colIdx * (CELL_WIDTH + CELL_GAP)
    const y = PADDING_TOP + rowIdx * (CELL_HEIGHT + CELL_GAP)
    const display = displayData.get(key)!
    const currentLevel = display.level
    const targetLevel = display.targetLevel

    let fillColor: string
    if (currentLevel === targetLevel) {
      fillColor = loadColors[currentLevel as 1 | 2 | 3].bg
    } else {
      fillColor = interpolateColor(Math.floor(currentLevel) as 1 | 2 | 3, Math.ceil(currentLevel) as 1 | 2 | 3, currentLevel % 1)
    }

    const isHovered = hoveredCell.value?.memberId === cell.memberId && hoveredCell.value?.date === cell.date

    ctx.save()
    if (isHovered) {
      ctx.shadowColor = fillColor
      ctx.shadowBlur = 12
      ctx.globalAlpha = 0.95
    }

    ctx.fillStyle = fillColor
    ctx.beginPath()
    const radius = 6
    ctx.roundRect(x, y, CELL_WIDTH, CELL_HEIGHT, radius)
    ctx.fill()

    if (isHovered) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.restore()
  })
}

function animate() {
  let needsRedraw = false
  displayData.forEach((d) => {
    if (Math.abs(d.level - d.targetLevel) > 0.01) {
      d.level = lerp(d.level, d.targetLevel, 0.15)
      needsRedraw = true
    } else {
      d.level = d.targetLevel
    }
  })
  if (needsRedraw) {
    drawGrid()
    animationFrame = requestAnimationFrame(animate)
  }
}

function triggerAnimation() {
  store.heatMapData.forEach(cell => {
    const key = getCellKey(cell.memberId, cell.date)
    if (!displayData.has(key)) {
      displayData.set(key, { level: 1, targetLevel: cell.loadLevel })
    }
  })
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = requestAnimationFrame(animate)
}

function onMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY

  const colIdx = Math.floor((x - PADDING_LEFT) / (CELL_WIDTH + CELL_GAP))
  const rowIdx = Math.floor((y - PADDING_TOP) / (CELL_HEIGHT + CELL_GAP))

  if (colIdx >= 0 && colIdx < dates.value.length && rowIdx >= 0 && rowIdx < members.value.length) {
    const date = dates.value[colIdx]
    const memberId = members.value[rowIdx].id
    hoveredCell.value = store.heatMapData.find(c => c.date === date && c.memberId === memberId) || null
    hoverPos.value = { x: e.clientX, y: e.clientY }
    canvas.style.cursor = 'pointer'
  } else {
    hoveredCell.value = null
    canvas.style.cursor = 'default'
  }
}

function onMouseLeave() {
  hoveredCell.value = null
}

useResizeObserver(wrapperRef, () => {
  drawGrid()
})

watch(
  () => store.heatMapData,
  () => {
    triggerAnimation()
  },
  { deep: true }
)

onMounted(() => {
  if (canvasRef.value) {
    canvasRef.value.width = canvasWidth.value
    canvasRef.value.height = canvasHeight.value
    triggerAnimation()
  }
})

onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame)
})
</script>

<template>
  <div class="heatmap-wrapper">
    <div class="heatmap-header">
      <h2 class="heatmap-title">团队热力图</h2>
      <div class="legend">
        <span class="legend-label">低负荷</span>
        <div class="legend-bar"></div>
        <span class="legend-label">高负荷</span>
      </div>
    </div>
    <div ref="wrapperRef" class="heatmap-canvas-wrapper" :style="{ transition: 'all 300ms ease' }">
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
      ></canvas>
      <Teleport to="body">
        <div
          v-if="hoveredCell"
          class="heatmap-tooltip"
          :style="{
            left: hoverPos.x + 12 + 'px',
            top: hoverPos.y + 12 + 'px',
          }"
        >
          <div class="tooltip-member">
            {{ store.members.find(m => m.id === hoveredCell.memberId)?.name }}
          </div>
          <div class="tooltip-date">{{ hoveredCell.date }}</div>
          <div class="tooltip-stats">
            <span>任务切换: <strong>{{ hoveredCell.switchCount }}</strong> 次</span>
            <span>在办任务: <strong>{{ hoveredCell.inProgressCount }}</strong> 个</span>
          </div>
          <div class="tooltip-load">
            负荷等级:
            <span :class="['load-badge', `load-${hoveredCell.loadLevel}`]">
              {{ hoveredCell.loadLevel === 1 ? '低' : hoveredCell.loadLevel === 2 ? '中' : '高' }}
            </span>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.heatmap-wrapper {
  width: 100%;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 300ms ease;
}

.heatmap-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.heatmap-title {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.legend {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
}

.legend-bar {
  width: 120px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #22c55e 0%, #f59e0b 50%, #ef4444 100%);
}

.heatmap-canvas-wrapper {
  overflow-x: auto;
  transition: all 300ms ease;
}

canvas {
  display: block;
  max-width: 100%;
  transition: opacity 300ms ease, transform 300ms ease;
}

.heatmap-tooltip {
  position: fixed;
  z-index: 10000;
  background: rgba(22, 33, 62, 0.98);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  pointer-events: none;
  animation: fadeIn 200ms ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tooltip-member {
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
}

.tooltip-date {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-bottom: 10px;
}

.tooltip-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
}

.tooltip-stats strong {
  color: #fff;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
}

.tooltip-load {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.load-badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.load-1 {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.load-2 {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.load-3 {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

@media (max-width: 1024px) {
  .heatmap-canvas-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
