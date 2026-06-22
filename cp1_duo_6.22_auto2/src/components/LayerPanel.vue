<template>
  <div class="layer-panel">
    <div class="panel-header">
      <span class="panel-title">图层列表</span>
    </div>

    <div class="panel-content">
      <div class="layer-list">
        <div
          v-for="(element, index) in reversedElements"
          :key="element.id"
          class="layer-item"
          :class="{ selected: state.selectedElementId === element.id, hidden: !element.visible }"
          @click="selectElement(element.id)"
        >
          <div class="layer-icon">
            {{ getElementIcon(element.type) }}
          </div>
          <span class="layer-name">{{ element.name }}</span>
          <button
            class="layer-visibility-btn"
            @click.stop="toggleVisibility(element.id)"
            :title="element.visible ? '隐藏' : '显示'"
          >
            {{ element.visible ? '👁' : '👁‍🗨' }}
          </button>
        </div>
      </div>

      <div class="add-element-section">
        <div class="section-label">添加元素</div>
        <div class="add-buttons">
          <button class="add-btn" @click="addRectangle">
            <span class="btn-icon">▢</span>
            <span>矩形</span>
          </button>
          <button class="add-btn" @click="addCircle">
            <span class="btn-icon">○</span>
            <span>圆形</span>
          </button>
          <button class="add-btn" @click="addText">
            <span class="btn-icon">T</span>
            <span>文本</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { timelineManager } from '@/modules/timeline/timelineManager'
import { CanvasElement } from '@/modules/render/canvasElement'
import type { ElementType } from '@/modules/render/canvasElement'

const state = timelineManager.getStateSnapshot()

const reversedElements = computed(() => {
  return [...state.elements.value].reverse()
})

function selectElement(elementId: string) {
  timelineManager.selectElement(elementId)
}

function toggleVisibility(elementId: string) {
  const element = state.elements.value.find(e => e.id === elementId)
  if (element) {
    element.visible = !element.visible
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

function generateId(): string {
  return 'el_' + Math.random().toString(36).substr(2, 9)
}

function addRectangle() {
  const id = generateId()
  const element = new CanvasElement(
    id,
    '矩形 ' + (state.elements.value.length + 1),
    'rectangle',
    { x: 300, y: 200, rotation: 0, scale: 1, opacity: 1 },
    {
      width: 120,
      height: 80,
      fill: '#00d4ff',
      stroke: '#0099cc',
      strokeWidth: 2,
      borderRadius: 8
    }
  )
  timelineManager.addElement(element)
  timelineManager.selectElement(id)
}

function addCircle() {
  const id = generateId()
  const element = new CanvasElement(
    id,
    '圆形 ' + (state.elements.value.length + 1),
    'circle',
    { x: 300, y: 250, rotation: 0, scale: 1, opacity: 1 },
    {
      width: 80,
      height: 80,
      fill: '#ff00ff',
      stroke: '#cc00cc',
      strokeWidth: 2
    }
  )
  timelineManager.addElement(element)
  timelineManager.selectElement(id)
}

function addText() {
  const id = generateId()
  const element = new CanvasElement(
    id,
    '文本 ' + (state.elements.value.length + 1),
    'text',
    { x: 300, y: 300, rotation: 0, scale: 1, opacity: 1 },
    {
      width: 200,
      height: 50,
      fill: '#ffffff',
      stroke: 'transparent',
      strokeWidth: 0,
      text: 'Hello 动画工坊',
      fontSize: 28,
      fontFamily: 'Microsoft YaHei, sans-serif'
    }
  )
  timelineManager.addElement(element)
  timelineManager.selectElement(id)
}
</script>

<style scoped>
.layer-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-right: 1px solid #2a2a4a;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
}

.panel-header {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid #2a2a4a;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(90deg, #00d4ff 0%, #ff00ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-item:hover {
  background: rgba(0, 212, 255, 0.08);
  border-color: rgba(0, 212, 255, 0.2);
}

.layer-item.selected {
  background: linear-gradient(90deg, rgba(0, 212, 255, 0.15) 0%, rgba(255, 0, 255, 0.05) 100%);
  border-color: rgba(0, 212, 255, 0.4);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.1);
}

.layer-item.hidden {
  opacity: 0.5;
}

.layer-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 212, 255, 0.1);
  border-radius: 4px;
  font-size: 14px;
  color: #00d4ff;
}

.layer-name {
  flex: 1;
  font-size: 12px;
  color: #ccc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-visibility-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.layer-visibility-btn:hover {
  opacity: 1;
}

.add-element-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #2a2a4a;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.add-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #2a2a4a 0%, #1a1a2e 100%);
  border: 1px solid #3a3a5a;
  color: #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: linear-gradient(135deg, #3a3a6a 0%, #2a2a4e 100%);
  border-color: #00d4ff;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.25);
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 16px;
  color: #00d4ff;
}
</style>
