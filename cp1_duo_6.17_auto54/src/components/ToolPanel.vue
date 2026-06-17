<template>
  <div class="tool-panel">
    <div class="panel-section">
      <h3 class="section-title">画布设置</h3>
      <div class="grid-selector">
        <button
          v-for="size in gridSizes"
          :key="size"
          class="grid-btn"
          :class="{ active: gridSize === size }"
          @click="handleGridSize(size)"
        >
          {{ size }}×{{ size }}
        </button>
      </div>
    </div>

    <div class="panel-section">
      <h3 class="section-title">绘制工具</h3>
      <div class="tool-buttons">
        <button
          v-for="tool in tools"
          :key="tool.type"
          class="tool-btn"
          :class="{ active: currentTool === tool.type, scaled: scalingTool === tool.type }"
          :title="tool.label"
          @click="handleTool(tool.type)"
        >
          <span class="tool-icon" v-html="tool.icon"></span>
          <span class="tool-label">{{ tool.label }}</span>
        </button>
      </div>
      <div class="brush-size">
        <span class="label">画笔大小</span>
        <div class="size-btns">
          <button
            v-for="s in brushSizes"
            :key="s"
            class="size-btn"
            :class="{ active: brushSize === s }"
            @click="$emit('change-brush-size', s)"
          >
            {{ s }}×{{ s }}
          </button>
        </div>
      </div>
    </div>

    <div class="panel-section">
      <h3 class="section-title">主题调色板</h3>
      <select class="preset-select" @change="handlePresetChange">
        <option value="">选择预设...</option>
        <option v-for="p in presets" :key="p.name" :value="p.name">{{ p.name }}</option>
      </select>
      <div class="palette-grid">
        <div
          v-for="(color, idx) in palette"
          :key="idx"
          class="palette-color"
          :class="{ selected: selectedColor === color, bouncing: bouncingIndex === idx }"
          :style="{ backgroundColor: color }"
          :title="color"
          @click="handleColorSelect(color, idx)"
        >
          <input
            type="color"
            :value="color"
            @input="handleColorEdit($event, idx)"
            @click.stop
          />
        </div>
      </div>
      <div class="current-color">
        <span class="label">当前颜色</span>
        <div class="color-preview" :style="{ backgroundColor: selectedColor }"></div>
        <span class="color-hex">{{ selectedColor }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ToolType, BrushSize, GridSize, PalettePreset } from '../utils/animationEngine'

const props = defineProps<{
  currentTool: ToolType
  brushSize: BrushSize
  gridSize: GridSize
  palette: string[]
  selectedColor: string
  presets: PalettePreset[]
}>()

const emit = defineEmits<{
  'change-tool': [tool: ToolType]
  'change-brush-size': [size: BrushSize]
  'change-grid-size': [size: GridSize]
  'select-color': [color: string]
  'apply-preset': [colors: string[]]
  'update-color': [index: number, color: string]
}>()

const gridSizes: GridSize[] = [16, 32]
const brushSizes: BrushSize[] = [1, 2, 3]

const scalingTool = ref<ToolType | null>(null)
const bouncingIndex = ref<number | null>(null)

const tools = [
  { type: 'pencil' as ToolType, label: '铅笔', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>' },
  { type: 'eraser' as ToolType, label: '橡皮擦', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20H8L3 15l9-9 8 8-6 6"/><path d="M18 13l-5-5"/></svg>' },
  { type: 'fill' as ToolType, label: '填充', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11h-6V5M5 5l6 6 6-6"/><rect x="3" y="13" width="18" height="8" rx="1"/></svg>' },
  { type: 'picker' as ToolType, label: '取色器', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z"/></svg>' }
]

function handleTool(tool: ToolType) {
  scalingTool.value = tool
  setTimeout(() => {
    scalingTool.value = null
  }, 200)
  emit('change-tool', tool)
}

function handleGridSize(size: GridSize) {
  emit('change-grid-size', size)
}

function handleColorSelect(color: string, idx: number) {
  bouncingIndex.value = idx
  setTimeout(() => {
    bouncingIndex.value = null
  }, 150)
  emit('select-color', color)
}

function handleColorEdit(e: Event, idx: number) {
  const target = e.target as HTMLInputElement
  emit('update-color', idx, target.value)
  if (props.selectedColor === props.palette[idx]) {
    emit('select-color', target.value)
  }
}

function handlePresetChange(e: Event) {
  const target = e.target as HTMLSelectElement
  const preset = props.presets.find(p => p.name === target.value)
  if (preset) {
    emit('apply-preset', preset.colors)
  }
  target.value = ''
}
</script>

<style scoped>
.tool-panel {
  width: 240px;
  min-width: 240px;
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

.grid-selector {
  display: flex;
  gap: 6px;
}

.grid-btn {
  flex: 1;
  padding: 8px;
  background: #3d3d42;
  border-radius: 6px;
  font-size: 13px;
  color: #9a9a9e;
  transition: all 0.2s ease;
}

.grid-btn:hover {
  background: #4d4d52;
}

.grid-btn.active {
  background: #6c6cff;
  color: #ffffff;
}

.tool-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: #3d3d42;
  border-radius: 6px;
  color: #9a9a9e;
  transition: all 0.2s ease;
}

.tool-btn:hover {
  background: #4d4d52;
  color: #e0e0e0;
}

.tool-btn.active {
  background: #6c6cff;
  color: #ffffff;
}

.tool-btn.scaled {
  transform: scale(1.08);
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-label {
  font-size: 11px;
}

.brush-size {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.brush-size .label {
  font-size: 12px;
  color: #9a9a9e;
}

.size-btns {
  display: flex;
  gap: 4px;
  flex: 1;
}

.size-btn {
  flex: 1;
  padding: 4px;
  background: #3d3d42;
  border-radius: 6px;
  font-size: 12px;
  color: #9a9a9e;
  transition: all 0.2s ease;
}

.size-btn:hover {
  background: #4d4d52;
}

.size-btn.active {
  background: #6c6cff;
  color: #ffffff;
}

.preset-select {
  width: 100%;
  font-size: 13px;
}

.palette-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.palette-color {
  aspect-ratio: 1;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  transition: transform 0.15s ease;
  border: 2px solid transparent;
  overflow: hidden;
}

.palette-color:hover {
  opacity: 0.9;
}

.palette-color.selected {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.palette-color.bouncing {
  animation: bounce 0.15s ease;
}

@keyframes bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.palette-color input[type="color"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.current-color {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
  background: #1e1e22;
  border-radius: 6px;
}

.current-color .label {
  font-size: 12px;
  color: #9a9a9e;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 2px solid #3d3d42;
}

.color-hex {
  font-size: 12px;
  color: #e0e0e0;
  font-family: monospace;
}
</style>
