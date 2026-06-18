<template>
  <div class="app-root" :class="{ fullscreen: isFullscreen }">
    <header class="toolbar" :class="{ 'ui-hidden': exporting }">
      <div class="toolbar-left">
        <h1 class="title">灵感共振板</h1>
        <span class="subtitle">Inspiration Resonance Board</span>
      </div>
      <div class="toolbar-center">
        <div class="template-group">
          <span class="template-label">布局模板：</span>
          <button
            v-for="tpl in layoutTemplates"
            :key="tpl.value"
            class="template-btn"
            :class="{ active: activeTemplate === tpl.value }"
            @click="changeTemplate(tpl.value)"
          >
            {{ tpl.label }}
          </button>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="action-btn" @click="addNewBlock" title="添加色块">
          <span class="icon">＋</span>
          <span class="btn-text">添加</span>
        </button>
        <button class="action-btn" @click="toggleFullscreen" title="全屏切换">
          <span class="icon">{{ isFullscreen ? '⤓' : '⤢' }}</span>
          <span class="btn-text">{{ isFullscreen ? '退出' : '全屏' }}</span>
        </button>
        <button class="action-btn primary" @click="exportPNG" :disabled="exporting" title="导出PNG">
          <span class="icon">⬇</span>
          <span class="btn-text">{{ exporting ? '导出中...' : '快照' }}</span>
        </button>
      </div>
    </header>

    <main class="board-wrapper">
      <ResonanceBoard
        ref="boardRef"
        :blocks="blocks"
        :ripples="ripples"
        :get-resonance-pairs="getResonancePairs"
        :get-sync-blink-groups="getSyncBlinkGroups"
        :trigger-ripple-if-needed="triggerRippleIfNeeded"
        :cleanup-expired-ripples="cleanupExpiredRipples"
        :update-flight-positions="updateFlightPositions"
        @update-block="handleUpdateBlock"
        @remove-block="handleRemoveBlock"
        @add-block="handleAddBlock"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import ResonanceBoard from './components/ResonanceBoard.vue'
import { useResonance } from './composables/useResonance'
import type { LayoutTemplate, Block } from './types/block'

const boardRef = ref<InstanceType<typeof ResonanceBoard> | null>(null)
const isFullscreen = ref(false)
const exporting = ref(false)
const activeTemplate = ref<LayoutTemplate>('symmetric')

const layoutTemplates = [
  { label: '对称', value: 'symmetric' as LayoutTemplate },
  { label: '随机', value: 'random' as LayoutTemplate },
  { label: '螺旋', value: 'spiral' as LayoutTemplate },
  { label: '网格', value: 'grid' as LayoutTemplate },
  { label: '星座', value: 'constellation' as LayoutTemplate }
]

const {
  blocks,
  ripples,
  addBlock,
  removeBlock,
  updateBlock,
  getResonancePairs,
  getSyncBlinkGroups,
  triggerRippleIfNeeded,
  cleanupExpiredRipples,
  applyLayoutTemplate,
  updateFlightPositions,
  initializeDefaultBlocks
} = useResonance()

function changeTemplate(tpl: LayoutTemplate): void {
  activeTemplate.value = tpl
  applyLayoutTemplate(tpl)
}

function addNewBlock(): void {
  addBlock()
}

function handleUpdateBlock(id: string, updates: Partial<Block>): void {
  updateBlock(id, updates)
}

function handleRemoveBlock(id: string): void {
  removeBlock(id)
}

function handleAddBlock(x: number, y: number): void {
  addBlock(x, y)
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
    isFullscreen.value = true
  } else {
    document.exitFullscreen().catch(() => {})
    isFullscreen.value = false
  }
}

async function exportPNG(): Promise<void> {
  if (exporting.value) return
  exporting.value = true

  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 1000))

  try {
    if (boardRef.value) {
      await boardRef.value.exportCanvas('inspiration-resonance-board.png')
    }
  } catch (e) {
    console.error('导出失败:', e)
  }

  exporting.value = false
}

onMounted(() => {
  initializeDefaultBlocks(12)
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #0a0a1a;
  color: #e8e8f0;
}

.app-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: radial-gradient(ellipse at top, #1a1a3e 0%, #0a0a1a 60%, #050510 100%);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  background: rgba(15, 15, 35, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(120, 120, 200, 0.15);
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 100;
  flex-shrink: 0;
}

.toolbar.ui-hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-100%);
}

.toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #8b5cf6 0%, #4ecdc4 50%, #4d96ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
}

.subtitle {
  font-size: 11px;
  color: rgba(200, 200, 230, 0.4);
  letter-spacing: 1.5px;
}

.toolbar-center {
  display: flex;
  align-items: center;
}

.template-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(40, 40, 80, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(120, 120, 200, 0.1);
}

.template-label {
  font-size: 12px;
  color: rgba(200, 200, 230, 0.6);
  margin-right: 4px;
}

.template-btn {
  padding: 6px 14px;
  font-size: 12px;
  color: rgba(220, 220, 240, 0.7);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-btn:hover {
  color: #fff;
  background: rgba(139, 92, 246, 0.2);
}

.template-btn.active {
  color: #fff;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(78, 205, 196, 0.6));
  box-shadow: 0 2px 12px rgba(139, 92, 246, 0.3);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  color: rgba(220, 220, 240, 0.85);
  background: rgba(40, 40, 80, 0.5);
  border: 1px solid rgba(120, 120, 200, 0.15);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  color: #fff;
  background: rgba(60, 60, 120, 0.7);
  border-color: rgba(139, 92, 246, 0.4);
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(78, 205, 196, 0.7));
  border-color: transparent;
  color: #fff;
}

.action-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(78, 205, 196, 0.9));
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
}

.action-btn .icon {
  font-size: 14px;
}

.board-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: auto;
}
</style>
