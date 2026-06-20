<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useMusicStore, getNoteColor } from '@/stores/musicStore'
import { initAudioContext, playNote } from '@/utils/audioEngine'

const store = useMusicStore()
const paletteRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const nextBeat = ref(0)
let ctx: CanvasRenderingContext2D | null = null
let rafId: number | null = null

const pressedIds = reactive<Set<string>>(new Set())
const brightIds = reactive<Set<string>>(new Set())

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  radius: number
}
const particles: Particle[] = []

function getParticleCount(index: number): number {
  if (index <= 4) return 3
  if (index <= 10) return 5
  return 7
}

function getParticleRadius(index: number): number {
  const t = index / 23
  return 2 + 3 * t
}

function spawnParticles(btnEl: HTMLElement, noteIndex: number) {
  if (!paletteRef.value || !canvasRef.value) return
  const paletteRect = paletteRef.value.getBoundingClientRect()
  const btnRect = btnEl.getBoundingClientRect()
  const cx = btnRect.left + btnRect.width / 2 - paletteRect.left
  const cy = btnRect.top + btnRect.height / 2 - paletteRect.top
  const color = getComputedStyle(btnEl).getPropertyValue('--particle-color') || '#7C3AED'
  const count = getParticleCount(noteIndex)
  const baseRadius = getParticleRadius(noteIndex)
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
    const speed = 20 + Math.random() * 30
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 300,
      maxLife: 300,
      color,
      radius: baseRadius + Math.random() * 1.5
    })
  }
}

function render() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  const now = performance.now()
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    const dt = 16
    p.x += p.vx * (dt / 1000)
    p.y += p.vy * (dt / 1000)
    p.vx *= 0.96
    p.vy *= 0.96
    p.life -= dt
    const alpha = Math.max(0, p.life / p.maxLife)
    ctx.globalAlpha = alpha
    ctx.fillStyle = p.color
    ctx.shadowBlur = 10
    ctx.shadowColor = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2)
    ctx.fill()
    if (p.life <= 0) particles.splice(i, 1)
  }
  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
  rafId = requestAnimationFrame(render)
  void now
}

function handleNoteClick(noteId: string, frequency: number, index: number) {
  initAudioContext()
  pressedIds.add(noteId)
  brightIds.add(noteId)
  setTimeout(() => {
    pressedIds.delete(noteId)
  }, 150)
  setTimeout(() => {
    brightIds.delete(noteId)
  }, 200)
  playNote(`preview-${noteId}`, frequency, 200)
  const beat = nextBeat.value
  store.addNoteToTimeline(noteId, beat)
  nextBeat.value = (nextBeat.value + 1) % store.totalBeats
  void index
}

function handleNoteDragStart(e: DragEvent, noteId: string) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('noteId', noteId)
    e.dataTransfer.effectAllowed = 'copy'
  }
}

function handleHover(e: MouseEvent) {
  const btn = (e.target as HTMLElement).closest('.note-btn') as HTMLElement | null
  if (btn && !btn.dataset.hovered) {
    const idx = parseInt(btn.dataset.noteIndex || '0', 10)
    btn.dataset.hovered = '1'
    spawnParticles(btn, idx)
    setTimeout(() => {
      if (btn) delete btn.dataset.hovered
    }, 300)
  }
}

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d')
    const resize = () => {
      if (!canvasRef.value || !paletteRef.value) return
      canvasRef.value.width = paletteRef.value.clientWidth
      canvasRef.value.height = paletteRef.value.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)
    render()
  }
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div ref="paletteRef" class="note-palette" @mouseover="handleHover">
    <canvas ref="canvasRef" class="particle-canvas"></canvas>
    <h3 class="palette-title">音符库</h3>
    <div class="notes-grid">
      <div
        v-for="note in store.notes"
        :key="note.id"
        class="note-btn"
        :class="{
          pressed: pressedIds.has(note.id),
          bright: brightIds.has(note.id)
        }"
        draggable="true"
        :data-note-index="note.index"
        :style="{
          '--particle-color': getNoteColor(note.index),
          '--bright-color': getNoteColor(note.index),
          background: `linear-gradient(135deg, #4F46E5 0%, ${getNoteColor(note.index)} 100%)`
        }"
        @click="handleNoteClick(note.id, note.frequency, note.index)"
        @dragstart="(e) => handleNoteDragStart(e, note.id)"
      >
        <span class="note-label">{{ note.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.note-palette {
  position: relative;
  height: 100%;
  background: rgba(15, 23, 42, 0.8);
  border-right: 1px solid rgba(99, 102, 241, 0.3);
  padding: 20px 16px;
  overflow-y: auto;
  box-shadow: inset 0 0 20px rgba(99, 102, 241, 0.05);
}

.particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.palette-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #E2E8F0;
  text-align: center;
  letter-spacing: 1px;
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  justify-items: center;
}

.note-btn {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  position: relative;
  z-index: 5;
  user-select: none;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.2);
}

.note-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.5);
}

.note-btn.pressed {
  animation: pressBounce 0.15s ease-out;
}

@keyframes pressBounce {
  0% {
    transform: scale(1.1);
  }
  30% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1.1);
  }
}

.note-btn.bright {
  animation: brightPulse 0.2s ease-out;
}

@keyframes brightPulse {
  0% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.2);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3), 0 0 8px var(--bright-color, #7C3AED);
  }
  100% {
    filter: brightness(1);
  }
}

.note-label {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
</style>
