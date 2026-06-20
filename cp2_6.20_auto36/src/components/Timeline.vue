<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useMusicStore, getNoteColor, getNoteHeight } from '@/stores/musicStore'
import { initAudioContext, playNote } from '@/utils/audioEngine'

const store = useMusicStore()
const timelineRef = ref<HTMLDivElement | null>(null)
const playBtnRef = ref<HTMLButtonElement | null>(null)
const playBtnAnimating = ref(false)
const dragOverBeat = ref<number | null>(null)
let rafId: number | null = null

const totalWidth = computed(() => store.totalBeats * store.beatWidth)
const playheadX = computed(() => store.currentBeatFloat * store.beatWidth)

function beatLoop() {
  store.updatePlayback(performance.now())
  rafId = requestAnimationFrame(beatLoop)
}

watch(() => store.isPlaying, (playing) => {
  if (playing && rafId === null) {
    rafId = requestAnimationFrame(beatLoop)
  } else if (!playing && rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
})

function handlePlayToggle() {
  initAudioContext()
  playBtnAnimating.value = true
  if (!store.isPlaying) {
    const beatNotes = store.placedNotes.filter(p => p.beat === store.currentBeat)
    for (const pn of beatNotes) {
      playNote(pn.id, pn.note.frequency, 300)
    }
  }
  store.togglePlay()
  setTimeout(() => {
    playBtnAnimating.value = false
  }, 300)
}

function handleReset() {
  store.resetPlayback()
}

function handleTempoInput(e: Event) {
  const value = parseFloat((e.target as HTMLInputElement).value)
  store.setTempo(value)
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  if (!timelineRef.value) return
  const rect = timelineRef.value.getBoundingClientRect()
  const scrollLeft = timelineRef.value.scrollLeft
  const x = (e.clientX - rect.left) + scrollLeft
  const beat = Math.floor(x / store.beatWidth)
  if (beat >= 0 && beat < store.totalBeats) {
    dragOverBeat.value = beat
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }
}

function handleDragLeave() {
  dragOverBeat.value = null
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  initAudioContext()
  const noteId = e.dataTransfer?.getData('noteId')
  const placedId = e.dataTransfer?.getData('placedNoteId')
  if (!timelineRef.value) {
    dragOverBeat.value = null
    return
  }
  const rect = timelineRef.value.getBoundingClientRect()
  const scrollLeft = timelineRef.value.scrollLeft
  const x = (e.clientX - rect.left) + scrollLeft
  const beat = Math.floor(x / store.beatWidth)
  dragOverBeat.value = null
  if (beat < 0 || beat >= store.totalBeats) return

  if (noteId) {
    const note = store.notes.find(n => n.id === noteId)
    if (note) {
      store.addNoteToTimeline(noteId, beat)
      playNote(`drop-${noteId}`, note.frequency, 200)
    }
  } else if (placedId) {
    const pn = store.placedNotes.find(p => p.id === placedId)
    if (pn) {
      store.removeNoteById(placedId)
      store.addNoteToTimeline(pn.noteId, beat)
      playNote(`move-${placedId}`, pn.note.frequency, 200)
    }
  }
}

function handleNoteDragStart(e: DragEvent, placedId: string, noteId: string) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('placedNoteId', placedId)
    e.dataTransfer.setData('noteId', noteId)
    e.dataTransfer.effectAllowed = 'move'
  }
}

function handleNoteClick(placedId: string, e: MouseEvent) {
  e.stopPropagation()
  store.selectNote(store.selectedNoteId === placedId ? null : placedId)
}

function handleTimelineClick() {
  store.selectNote(null)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedNoteId) {
      store.removeSelectedNote()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => {
    if (timelineRef.value) {
      timelineRef.value.scrollLeft = 0
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <div class="timeline-wrapper" @click="handleTimelineClick">
    <div class="timeline-header">
      <h3 class="timeline-title">时间轴</h3>
      <div class="beat-info">
        拍子: {{ Math.floor(store.currentBeat) + 1 }} / {{ store.totalBeats }}
      </div>
    </div>

    <div
      ref="timelineRef"
      class="timeline-scroll"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <div class="timeline-inner" :style="{ width: totalWidth + 'px' }">
        <div class="beat-ruler">
          <div
            v-for="b in store.totalBeats"
            :key="b"
            class="beat-mark"
            :class="{ 'beat-major': (b - 1) % 4 === 0, 'beat-hover': dragOverBeat === b - 1 }"
            :style="{ left: (b - 1) * store.beatWidth + 'px' }"
          >
            <span v-if="(b - 1) % 4 === 0" class="beat-num">{{ b }}</span>
          </div>
        </div>

        <div class="timeline-track">
          <div
            v-for="pn in store.placedNotes"
            :key="pn.id"
            class="placed-note"
            :class="{ selected: store.selectedNoteId === pn.id, resetting: store.isResetting }"
            draggable="true"
            :style="{
              left: pn.beat * store.beatWidth + ((store.beatWidth - 30) / 2) + 'px',
              bottom: '8px',
              height: getNoteHeight(pn.note.index) + 'px',
              background: `linear-gradient(180deg, ${getNoteColor(pn.note.index)} 0%, ${getNoteColor(pn.note.index)}cc 100%)`
            }"
            @click="(e) => handleNoteClick(pn.id, e)"
            @dragstart="(e) => handleNoteDragStart(e, pn.id, pn.noteId)"
          >
            <span class="placed-note-label">{{ pn.note.name }}</span>
          </div>

          <div
            class="playhead"
            :style="{
              transform: `translateX(${playheadX}px)`,
              opacity: store.isResetting ? 0 : 1
            }"
          ></div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button
        ref="playBtnRef"
        class="control-btn play-btn"
        :class="{ playing: store.isPlaying, animating: playBtnAnimating }"
        @click="handlePlayToggle"
      >
        <svg v-if="!store.isPlaying" class="icon" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="6,4 20,12 6,20" />
        </svg>
        <svg v-else class="icon" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      </button>

      <button class="control-btn reset-btn" @click="handleReset">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <polyline points="3 3 3 8 8 8" />
        </svg>
      </button>

      <div class="tempo-control">
        <span class="tempo-label">速度</span>
        <div class="slider-wrap">
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            :value="store.tempo"
            class="tempo-slider"
            @input="handleTempoInput"
          />
          <span class="tempo-value" :style="{ left: ((store.tempo - 0.5) / 1.5) * 100 + '%' }">
            {{ store.tempo.toFixed(1) }}x
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.95);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
}

.timeline-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #E2E8F0;
  letter-spacing: 1px;
}

.beat-info {
  font-size: 13px;
  color: #94A3B8;
  font-variant-numeric: tabular-nums;
}

.timeline-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  padding: 10px 0;
  scroll-behavior: smooth;
}

.timeline-scroll::-webkit-scrollbar {
  height: 6px;
}

.timeline-scroll::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.6);
  border-radius: 3px;
}

.timeline-scroll::-webkit-scrollbar-thumb {
  background: linear-gradient(90deg, #4F46E5, #6366F1);
  border-radius: 3px;
}

.timeline-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(90deg, #6366F1, #7C3AED);
}

.timeline-inner {
  position: relative;
  height: 100%;
  min-width: 100%;
}

.beat-ruler {
  position: relative;
  height: 24px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  margin: 0 10px;
}

.beat-mark {
  position: absolute;
  width: 40px;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding-left: 2px;
  transition: background 0.15s;
}

.beat-mark::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: 8px;
  background: rgba(99, 102, 241, 0.3);
}

.beat-mark.beat-major::before {
  height: 14px;
  background: rgba(99, 102, 241, 0.6);
}

.beat-mark.beat-hover {
  background: rgba(245, 158, 11, 0.15);
  border-radius: 4px 4px 0 0;
}

.beat-mark.beat-hover::before {
  background: #F59E0B;
  height: 16px;
}

.beat-num {
  font-size: 10px;
  color: #64748B;
  font-weight: 500;
}

.timeline-track {
  position: relative;
  height: calc(100% - 40px);
  margin: 8px 10px 0;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 39px,
      rgba(99, 102, 241, 0.05) 39px,
      rgba(99, 102, 241, 0.05) 40px
    );
  border-radius: 4px;
  overflow: hidden;
}

.placed-note {
  position: absolute;
  width: 30px;
  border-radius: 5px;
  border: 1px solid rgba(99, 102, 241, 0.35);
  cursor: grab;
  transition: box-shadow 0.2s, opacity 0.25s, transform 0.2s;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
  user-select: none;
}

.placed-note:hover {
  transform: translateY(-2px);
}

.placed-note:active {
  cursor: grabbing;
}

.placed-note.selected {
  box-shadow: 0 0 5px #F59E0B, 0 0 12px rgba(245, 158, 11, 0.5);
  border-color: #F59E0B;
}

.placed-note.resetting {
  animation: noteReset 0.5s ease;
}

@keyframes noteReset {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
}

.placed-note-label {
  font-size: 9px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #EF4444, #DC2626);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
  transition: transform 0.08s linear, opacity 0.25s;
  pointer-events: none;
  z-index: 5;
}

.playhead::before {
  content: '';
  position: absolute;
  top: -6px;
  left: -5px;
  width: 12px;
  height: 12px;
  background: #EF4444;
  transform: rotate(45deg);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.8);
}

.controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-top: 1px solid rgba(99, 102, 241, 0.2);
  background: rgba(15, 23, 42, 0.9);
}

.control-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(99, 102, 241, 0.35);
  background: rgba(30, 41, 59, 0.8);
  color: #E2E8F0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.2);
  transition: background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
}

.play-btn.animating {
  animation: spinAndColor 0.3s ease;
}

.play-btn.playing {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: #fff;
  box-shadow: 0 0 14px rgba(124, 58, 237, 0.5);
}

@keyframes spinAndColor {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.control-btn:hover {
  box-shadow: 0 0 14px rgba(99, 102, 241, 0.5);
}

.control-btn:active {
  transform: scale(0.92);
}

.icon {
  width: 20px;
  height: 20px;
}

.tempo-control {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 360px;
}

.tempo-label {
  font-size: 13px;
  color: #94A3B8;
  min-width: 32px;
}

.slider-wrap {
  flex: 1;
  position: relative;
  padding-top: 4px;
}

.tempo-slider {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(30, 41, 59, 0.9);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.tempo-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  cursor: pointer;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
  transition: transform 0.15s;
}

.tempo-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.tempo-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  cursor: pointer;
  border: none;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
}

.tempo-value {
  position: absolute;
  top: -18px;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 600;
  color: #F59E0B;
  background: rgba(30, 41, 59, 0.95);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(245, 158, 11, 0.4);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  transition: left 0.05s;
}
</style>
