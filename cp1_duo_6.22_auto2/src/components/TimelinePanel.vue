<template>
  <div class="timeline-panel">
    <div class="timeline-header">
      <div class="timeline-controls">
        <button class="control-btn play-btn" @click="togglePlay" :class="{ playing: state.isPlaying }">
          <span v-if="!state.isPlaying">▶</span>
          <span v-else>⏸</span>
        </button>
        <button class="control-btn" @click="stopPlay">⏹</button>
        <button class="control-btn mode-btn" @click="toggleMode" :class="{ loop: state.playMode === 'loop' }">
          {{ state.playMode === 'loop' ? '🔁 循环' : '➡️ 单次' }}
        </button>
      </div>
      <div class="timeline-info">
        <span class="frame-info">帧: {{ state.currentFrame }} / {{ state.totalFrames }}</span>
        <span class="fps-info">{{ state.fps }} FPS</span>
      </div>
    </div>

    <div class="timeline-body" ref="timelineBodyRef" @scroll="onScroll">
      <div class="timeline-ruler" ref="rulerRef">
        <div class="ruler-track" :style="rulerStyle">
          <div
            v-for="tick in rulerTicks"
            :key="tick.frame"
            class="ruler-tick"
            :style="{ left: tick.position + 'px' }"
          >
            <span v-if="tick.major" class="tick-label">{{ tick.frame }}</span>
          </div>
        </div>
        <div class="playhead" :style="{ left: playheadPosition + 'px' }">
          <div class="playhead-triangle"></div>
          <div class="playhead-line"></div>
        </div>
      </div>

      <div class="timeline-tracks" ref="tracksRef">
        <div class="tracks-container" :style="tracksContainerStyle">
          <div
            v-for="element in state.elements"
            :key="element.id"
            class="track"
            :class="{ selected: state.selectedElementId === element.id }"
            @click="selectElement(element.id)"
          >
            <div class="track-label">
              <span class="element-icon">{{ getElementIcon(element.type) }}</span>
              <span class="element-name">{{ element.name }}</span>
            </div>
            <div class="track-keyframes">
              <div
                v-for="kf in element.keyframes"
                :key="kf.frame"
                class="keyframe-diamond"
                :class="{
                  selected: isKeyframeSelected(element.id, kf.frame),
                  'ease-out': kf.easing.includes('out'),
                  'ease-in': kf.easing.includes('in')
                }"
                :style="{ left: kf.frame * pixelsPerFrame + 'px' }"
                @mousedown.stop="startDragKeyframe($event, element.id, kf.frame)"
                @click.stop="selectKeyframe(element.id, kf.frame)"
              >
                <div class="diamond-shape"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="timeline-footer">
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-text">{{ progressPercent.toFixed(1) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { timelineManager } from '@/modules/timeline/timelineManager'
import type { ElementType } from '@/modules/render/canvasElement'

const pixelsPerFrame = 8

const timelineBodyRef = ref<HTMLDivElement | null>(null)
const rulerRef = ref<HTMLDivElement | null>(null)
const tracksRef = ref<HTMLDivElement | null>(null)

const state = timelineManager.getStateSnapshot()

const rulerStyle = computed(() => ({
  width: state.totalFrames.value * pixelsPerFrame + 'px'
}))

const tracksContainerStyle = computed(() => ({
  width: state.totalFrames.value * pixelsPerFrame + 'px'
}))

const playheadPosition = computed(() => state.currentFrame.value * pixelsPerFrame)

const progressPercent = computed(() => {
  if (state.totalFrames.value <= 1) return 0
  return (state.currentFrame.value / (state.totalFrames.value - 1)) * 100
})

const rulerTicks = computed(() => {
  const ticks: { frame: number; position: number; major: boolean }[] = []
  const step = state.fps.value > 30 ? 10 : state.fps.value > 15 ? 5 : 1
  for (let f = 0; f <= state.totalFrames.value; f += step) {
    ticks.push({
      frame: f,
      position: f * pixelsPerFrame,
      major: f % (step * 5) === 0
    })
  }
  return ticks
})

let isDragging = false
let dragElementId = ''
let dragStartFrame = 0
let dragStartX = 0

function togglePlay() {
  timelineManager.togglePlay()
}

function stopPlay() {
  timelineManager.stop()
}

function toggleMode() {
  const newMode = state.playMode.value === 'loop' ? 'once' : 'loop'
  timelineManager.setPlayMode(newMode)
}

function selectElement(elementId: string) {
  timelineManager.selectElement(elementId)
}

function isKeyframeSelected(elementId: string, frame: number): boolean {
  return (
    state.selectedKeyframeElementId.value === elementId &&
    state.selectedKeyframeFrame.value === frame
  )
}

function selectKeyframe(elementId: string, frame: number) {
  timelineManager.selectKeyframe(elementId, frame)
}

function startDragKeyframe(e: MouseEvent, elementId: string, frame: number) {
  isDragging = true
  dragElementId = elementId
  dragStartFrame = frame
  dragStartX = e.clientX

  document.addEventListener('mousemove', onDragKeyframe)
  document.addEventListener('mouseup', stopDragKeyframe)
}

function onDragKeyframe(e: MouseEvent) {
  if (!isDragging) return

  const deltaX = e.clientX - dragStartX
  const deltaFrames = Math.round(deltaX / pixelsPerFrame)
  let newFrame = dragStartFrame + deltaFrames
  newFrame = Math.max(0, Math.min(state.totalFrames.value - 1, newFrame))

  if (newFrame !== dragStartFrame) {
    timelineManager.moveKeyframe(dragElementId, dragStartFrame, newFrame)
    dragStartFrame = newFrame
    dragStartX = e.clientX
  }
}

function stopDragKeyframe() {
  isDragging = false
  document.removeEventListener('mousemove', onDragKeyframe)
  document.removeEventListener('mouseup', stopDragKeyframe)
}

function onScroll() {
  if (timelineBodyRef.value && tracksRef.value) {
    const scrollLeft = timelineBodyRef.value.scrollLeft
    if (rulerRef.value) {
      rulerRef.value.scrollLeft = scrollLeft
    }
    tracksRef.value.scrollLeft = scrollLeft
  }
}

function getElementIcon(type: ElementType): string {
  switch (type) {
    case 'rectangle':
      return '▢'
    case 'circle':
      return '○'
    case 'text':
      return 'T'
    default:
      return '□'
  }
}

let animationFrameId: number | null = null

function renderLoop() {
  animationFrameId = requestAnimationFrame(renderLoop)
}

onMounted(() => {
  renderLoop()
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  timelineManager.pause()
})
</script>

<style scoped>
.timeline-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-top: 1px solid #2a2a4a;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid #2a2a4a;
}

.timeline-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.control-btn {
  background: linear-gradient(135deg, #2a2a4a 0%, #1a1a2e 100%);
  border: 1px solid #3a3a5a;
  color: #e0e0e0;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: linear-gradient(135deg, #3a3a6a 0%, #2a2a4e 100%);
  border-color: #00d4ff;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.play-btn.playing {
  background: linear-gradient(135deg, #ff00ff 0%, #00d4ff 100%);
  border-color: transparent;
}

.mode-btn.loop {
  color: #00d4ff;
}

.timeline-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #888;
}

.frame-info {
  color: #00d4ff;
  font-weight: 600;
}

.fps-info {
  color: #ff00ff;
}

.timeline-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.timeline-ruler {
  height: 36px;
  background: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid #2a2a4a;
  position: relative;
  overflow: hidden;
}

.ruler-track {
  position: relative;
  height: 100%;
}

.ruler-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.tick-label {
  position: absolute;
  top: 4px;
  left: 4px;
  font-size: 10px;
  color: #888;
  white-space: nowrap;
}

.playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  z-index: 10;
  pointer-events: none;
}

.playhead-triangle {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #00d4ff;
  filter: drop-shadow(0 0 4px rgba(0, 212, 255, 0.8));
}

.playhead-line {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: calc(100% - 8px);
  background: linear-gradient(180deg, #00d4ff 0%, rgba(0, 212, 255, 0.3) 100%);
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
}

.timeline-tracks {
  overflow-x: auto;
  overflow-y: visible;
}

.tracks-container {
  min-width: 100%;
}

.track {
  display: flex;
  height: 44px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.15s ease;
}

.track:hover {
  background: rgba(0, 212, 255, 0.05);
}

.track.selected {
  background: linear-gradient(90deg, rgba(0, 212, 255, 0.15) 0%, rgba(255, 0, 255, 0.05) 100%);
}

.track-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  min-width: 180px;
  width: 180px;
  border-right: 1px solid #2a2a4a;
  background: rgba(0, 0, 0, 0.2);
}

.element-icon {
  font-size: 14px;
  color: #00d4ff;
}

.element-name {
  font-size: 12px;
  color: #ccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-keyframes {
  flex: 1;
  position: relative;
  min-width: 0;
}

.keyframe-diamond {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  cursor: grab;
  z-index: 5;
}

.keyframe-diamond:active {
  cursor: grabbing;
}

.diamond-shape {
  width: 12px;
  height: 12px;
  margin: 2px;
  background: linear-gradient(135deg, #ff00ff 0%, #00d4ff 100%);
  transform: rotate(45deg);
  border-radius: 2px;
  box-shadow: 0 0 6px rgba(255, 0, 255, 0.5);
  transition: all 0.2s ease;
}

.keyframe-diamond:hover .diamond-shape {
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.8);
  transform: rotate(45deg) scale(1.1);
}

.keyframe-diamond.selected .diamond-shape {
  background: linear-gradient(135deg, #00ffff 0%, #ff00ff 100%);
  box-shadow: 0 0 16px rgba(0, 255, 255, 0.9), 0 0 32px rgba(255, 0, 255, 0.5);
  animation: pulse-glow 1.5s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.8), 0 0 24px rgba(255, 0, 255, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(0, 255, 255, 1), 0 0 40px rgba(255, 0, 255, 0.7);
  }
}

.timeline-footer {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid #2a2a4a;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #1a1a2e;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid #2a2a4a;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff 0%, #ff00ff 100%);
  border-radius: 3px;
  transition: width 0.05s linear;
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}

.progress-text {
  font-size: 11px;
  color: #888;
  min-width: 50px;
  text-align: right;
}
</style>
