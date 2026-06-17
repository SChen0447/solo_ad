<template>
  <div class="app-container" :class="{ 'mobile-layout': isMobile }">
    <ToolPanel
      :currentTool="currentTool"
      :brushSize="brushSize"
      :gridSize="gridSize"
      :palette="palette"
      :selectedColor="selectedColor"
      :presets="presetPalettes"
      @change-tool="handleToolChange"
      @change-brush-size="brushSize = $event"
      @change-grid-size="handleGridSizeChange"
      @select-color="selectedColor = $event"
      @apply-preset="applyPreset"
      @update-color="updatePaletteColor"
    />
    <CanvasGrid
      :frames="frames"
      :currentFrameIndex="currentFrameIndex"
      :gridSize="gridSize"
      :currentTool="currentTool"
      :brushSize="brushSize"
      :selectedColor="selectedColor"
      :highlightColor="highlightColor"
      :onionPrevOpacity="onionPrevOpacity"
      :onionNextOpacity="onionNextOpacity"
      @update-frame="updateFramePixels"
      @select-frame="currentFrameIndex = $event"
      @add-frame="addFrame"
      @copy-frame="copyFrame"
      @delete-frame="deleteFrame"
      @reorder-frames="reorderFrames"
      @pick-color="handlePickColor"
    />
    <PreviewExport
      :frames="frames"
      :currentFrameIndex="currentFrameIndex"
      :gridSize="gridSize"
      :playbackSpeed="playbackSpeed"
      :onionPrevOpacity="onionPrevOpacity"
      :onionNextOpacity="onionNextOpacity"
      :isPlaying="isPlaying"
      @change-speed="playbackSpeed = $event"
      @change-onion-prev="onionPrevOpacity = $event"
      @change-onion-next="onionNextOpacity = $event"
      @toggle-play="togglePlay"
      @prev-frame="prevFrame"
      @next-frame="nextFrame"
      @goto-frame="currentFrameIndex = $event"
      @export-spritesheet="handleExportSpritesheet"
      @export-gif="handleExportGif"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import ToolPanel from './components/ToolPanel.vue'
import CanvasGrid from './components/CanvasGrid.vue'
import PreviewExport from './components/PreviewExport.vue'
import {
  Frame,
  ToolType,
  BrushSize,
  GridSize,
  PalettePreset,
  PRESET_PALETTES,
  createEmptyPixels,
  clonePixels,
  generateFrameId,
  getMostSaturatedColor,
  AnimationEngine
} from './utils/animationEngine'
import { exportSpritesheet, exportGif } from './utils/exportSprite'

const isMobile = ref(false)

const currentTool = ref<ToolType>('pencil')
const previousTool = ref<ToolType>('pencil')
const brushSize = ref<BrushSize>(1)
const gridSize = ref<GridSize>(16)

const presetPalettes = ref<PalettePreset[]>(PRESET_PALETTES)
const palette = ref<string[]>([...PRESET_PALETTES[0].colors])
const selectedColor = ref<string>(PRESET_PALETTES[0].colors[1])

const frames = ref<Frame[]>([
  { id: generateFrameId(), pixels: createEmptyPixels(16), delay: 100 }
])
const currentFrameIndex = ref(0)

const playbackSpeed = ref(1)
const onionPrevOpacity = ref(0)
const onionNextOpacity = ref(0)
const isPlaying = ref(false)

let engine: AnimationEngine | null = null

const highlightColor = computed(() => getMostSaturatedColor(palette.value))

function handleGridSizeChange(size: GridSize) {
  if (size === gridSize.value) return
  gridSize.value = size
  frames.value = frames.value.map(f => ({
    ...f,
    pixels: resizePixels(f.pixels, size)
  }))
}

function resizePixels(old: (string | null)[][], newSize: GridSize): (string | null)[][] {
  const result = createEmptyPixels(newSize)
  const minSize = Math.min(old.length, newSize)
  for (let y = 0; y < minSize; y++) {
    for (let x = 0; x < minSize; x++) {
      result[y][x] = old[y][x]
    }
  }
  return result
}

function applyPreset(colors: string[]) {
  palette.value = [...colors]
  if (!colors.includes(selectedColor.value)) {
    selectedColor.value = colors[0]
  }
}

function updatePaletteColor(index: number, color: string) {
  palette.value[index] = color
  if (frames.value[currentFrameIndex.value]) {
    frames.value = [...frames.value]
  }
}

function updateFramePixels(index: number, pixels: (string | null)[][]) {
  if (index >= 0 && index < frames.value.length) {
    frames.value[index] = { ...frames.value[index], pixels }
  }
}

function addFrame(afterIndex?: number) {
  const idx = afterIndex !== undefined ? afterIndex + 1 : frames.value.length
  const newFrame: Frame = {
    id: generateFrameId(),
    pixels: createEmptyPixels(gridSize.value),
    delay: 100
  }
  frames.value.splice(idx, 0, newFrame)
  currentFrameIndex.value = idx
}

function copyFrame(index: number) {
  if (index < 0 || index >= frames.value.length) return
  const newFrame: Frame = {
    id: generateFrameId(),
    pixels: clonePixels(frames.value[index].pixels),
    delay: 100
  }
  frames.value.splice(index + 1, 0, newFrame)
  currentFrameIndex.value = index + 1
}

function deleteFrame(index: number) {
  if (frames.value.length <= 1) return
  frames.value.splice(index, 1)
  if (currentFrameIndex.value >= frames.value.length) {
    currentFrameIndex.value = frames.value.length - 1
  }
}

function reorderFrames(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return
  const [moved] = frames.value.splice(fromIndex, 1)
  frames.value.splice(toIndex, 0, moved)
}

function handlePickColor(color: string) {
  if (palette.value.includes(color)) {
    selectedColor.value = color
    currentTool.value = previousTool.value
  }
}

function handleToolChange(tool: ToolType) {
  currentTool.value = tool
}

watch(currentTool, (newTool, oldTool) => {
  if (newTool === 'picker' && oldTool !== undefined && oldTool !== 'picker') {
    previousTool.value = oldTool
  }
})

function togglePlay() {
  if (!engine) return
  engine.toggle()
  isPlaying.value = engine.getIsPlaying()
}

function prevFrame() {
  if (engine) {
    engine.stop()
    isPlaying.value = false
    engine.prevFrame()
  }
}

function nextFrame() {
  if (engine) {
    engine.stop()
    isPlaying.value = false
    engine.nextFrame()
  }
}

watch(currentFrameIndex, (idx) => {
  if (engine) {
    engine.setCurrentIndex(idx)
  }
})

watch(playbackSpeed, (speed) => {
  if (engine) {
    engine.setPlaybackSpeed(speed)
  }
})

watch(frames, (f) => {
  if (engine) {
    engine.setFrames(f)
  }
}, { deep: true })

function handleExportSpritesheet() {
  exportSpritesheet(frames.value, gridSize.value)
}

async function handleExportGif() {
  await exportGif(frames.value, gridSize.value, playbackSpeed.value)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prevFrame()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    nextFrame()
  }
}

function handleResize() {
  isMobile.value = window.innerWidth < 800
}

onMounted(() => {
  engine = new AnimationEngine((idx) => {
    currentFrameIndex.value = idx
  })
  engine.setFrames(frames.value)
  engine.setPlaybackSpeed(playbackSpeed.value)

  window.addEventListener('keydown', handleKeydown)
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (engine) {
    engine.destroy()
  }
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.app-container {
  display: flex;
  width: 100%;
  height: 100%;
  background: #1e1e22;
}

.app-container.mobile-layout {
  flex-direction: column;
  overflow-y: auto;
  height: auto;
  min-height: 100%;
}
</style>
