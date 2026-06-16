<template>
  <div class="app">
    <header class="app__header">
      <div class="app__logo">
        <span class="app__logo-icon">🎨</span>
        <span class="app__logo-text">PicStyle</span>
      </div>
      <div class="app__actions">
        <button
          v-if="hasImage"
          class="app__btn app__btn--secondary"
          @click="toggleCompareMode"
        >
          <span>{{ compareMode ? '退出对比' : '对比模式' }}</span>
        </button>
        <button
          v-if="hasImage"
          class="app__btn app__btn--primary"
          @click="handleExport"
        >
          <span>导出图片</span>
        </button>
      </div>
    </header>

    <main class="app__main">
      <section class="app__canvas-area">
        <div v-if="!hasImage" class="app__upload-section">
          <ImageUploader @upload="handleUpload" />
        </div>

        <div v-else class="app__image-section">
          <div class="app__toolbar app__toolbar--top">
            <div class="app__nav">
              <button
                class="app__nav-btn"
                :disabled="!canUndo"
                @click="undo"
                title="上一个"
              >
                ←
              </button>
              <span class="app__nav-label">
                {{ historyIndex + 1 }} / {{ history.length }}
              </span>
              <button
                class="app__nav-btn"
                :disabled="!canRedo"
                @click="redo"
                title="下一个"
              >
                →
              </button>
            </div>
            <div class="app__current-style">
              当前：{{ currentStyleName }}
            </div>
          </div>

          <div
            class="app__canvas-container"
            :class="{
              'app__canvas-container--compare': compareMode,
              'app__canvas-container--compare-v': compareMode && compareDirection === 'vertical'
            }"
          >
            <template v-if="!compareMode">
              <transition name="fade-scale" mode="out-in">
                <img
                  :key="currentStyleId"
                  :src="processedImageSrc"
                  alt="处理后图片"
                  class="app__canvas-image"
                />
              </transition>
            </template>

            <template v-else>
              <div class="app__compare-container" ref="compareContainer">
                <div class="app__compare-original">
                  <img :src="originalImageSrc" alt="原图" class="app__compare-image" />
                  <span class="app__compare-label app__compare-label--left">原图</span>
                </div>
                <div
                  class="app__compare-processed"
                  :style="compareProcessedStyle"
                >
                  <img :src="processedImageSrc" alt="风格图" class="app__compare-image" />
                  <span class="app__compare-label app__compare-label--right">
                    {{ currentStyleName }}
                  </span>
                </div>
                <div
                  class="app__compare-divider"
                  :style="dividerStyle"
                  @mousedown="startDrag"
                  @touchstart="startDrag"
                >
                  <div class="app__divider-handle">
                    <span class="app__divider-icon">⇔</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="app__toolbar app__toolbar--bottom">
            <div class="app__history">
              <div class="app__history-track" ref="historyTrack">
                <div
                  v-for="(item, index) in history"
                  :key="item.id"
                  class="app__history-item"
                  :class="{ 'app__history-item--active': index === historyIndex }"
                  @click="goToHistory(index)"
                >
                  <img :src="item.imageData" :alt="item.styleName" class="app__history-thumb" />
                  <span class="app__history-name">{{ item.styleName }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside v-if="hasImage && !isMobile" class="app__sidebar">
        <FilterPanel
          :styles="filterStyles"
          :selected-style-id="currentStyleId"
          :is-loading="isProcessing"
          @select="handleFilterSelect"
        />

        <div v-if="compareMode" class="app__compare-settings">
          <h3 class="app__compare-title">对比设置</h3>
          <button
            class="app__btn app__btn--block"
            @click="toggleCompareDirection"
          >
            切换为{{ compareDirection === 'horizontal' ? '上下' : '左右' }}分屏
          </button>
        </div>
      </aside>
    </main>

    <div v-if="hasImage && isMobile" class="app__bottom-toolbar">
      <FilterPanel
        :styles="filterStyles"
        :selected-style-id="currentStyleId"
        :is-loading="isProcessing"
        @select="handleFilterSelect"
      />
      <div v-if="compareMode" class="app__compare-settings">
        <button
          class="app__btn app__btn--block"
          @click="toggleCompareDirection"
        >
          切换为{{ compareDirection === 'horizontal' ? '上下' : '左右' }}分屏
        </button>
      </div>
    </div>

    <transition name="loading-fade">
      <div v-if="isProcessing" class="app__loading">
        <div class="app__loading-spinner"></div>
        <span class="app__loading-text">处理中...</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import ImageUploader from '@/components/ImageUploader.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import { useFilter } from '@/composables/useFilter'

const {
  originalImageSrc,
  currentStyleId,
  processedImageSrc,
  isProcessing,
  history,
  historyIndex,
  canUndo,
  canRedo,
  compareMode,
  comparePosition,
  compareDirection,
  filterStyles,
  loadImage,
  applyFilter,
  undo,
  redo,
  goToHistory,
  toggleCompareMode,
  setComparePosition,
  toggleCompareDirection
} = useFilter()

const isMobile = ref(false)
const isDragging = ref(false)
const compareContainer = ref<HTMLElement | null>(null)
const historyTrack = ref<HTMLElement | null>(null)

const hasImage = computed(() => !!processedImageSrc.value)

const currentStyleName = computed(() => {
  const style = filterStyles.find(s => s.id === currentStyleId.value)
  return style?.name || '原图'
})

const compareProcessedStyle = computed(() => {
  if (compareDirection.value === 'horizontal') {
    return { clipPath: `inset(0 0 0 ${comparePosition.value}%)` }
  } else {
    return { clipPath: `inset(${comparePosition.value}% 0 0 0)` }
  }
})

const dividerStyle = computed(() => {
  if (compareDirection.value === 'horizontal') {
    return { left: `${comparePosition.value}%`, transform: 'translateX(-50%)' }
  } else {
    return { top: `${comparePosition.value}%`, transform: 'translateY(-50%)' }
  }
})

function handleUpload(file: File) {
  loadImage(file)
}

function handleFilterSelect(styleId: string) {
  if (styleId === currentStyleId.value) return
  applyFilter(styleId)
}

function handleExport() {
  const link = document.createElement('a')
  link.download = `picstyle-${currentStyleName.value}-${Date.now()}.jpg`
  link.href = processedImageSrc.value
  link.click()
}

function startDrag(e: MouseEvent | TouchEvent) {
  e.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value || !compareContainer.value) return
  e.preventDefault()

  const rect = compareContainer.value.getBoundingClientRect()
  let clientX: number, clientY: number

  if ('touches' in e) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }

  if (compareDirection.value === 'horizontal') {
    const x = clientX - rect.left
    const percent = (x / rect.width) * 100
    setComparePosition(percent)
  } else {
    const y = clientY - rect.top
    const percent = (y / rect.height) * 100
    setComparePosition(percent)
  }
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
  stopDrag()
})
</script>

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  min-height: 100vh;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  background: #1a1a2e;
  color: #ffffff;
  display: flex;
  flex-direction: column;
}

.app__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #16213e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.app__logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app__logo-icon {
  font-size: 28px;
}

.app__logo-text {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #e94560, #ff6b6b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app__actions {
  display: flex;
  gap: 12px;
}

.app__btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.app__btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.app__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app__btn--primary {
  background: linear-gradient(135deg, #e94560, #ff6b6b);
  color: white;
  box-shadow: 0 4px 14px rgba(233, 69, 96, 0.4);
}

.app__btn--primary:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(233, 69, 96, 0.5);
}

.app__btn--secondary {
  background: #1e2d4d;
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.app__btn--secondary:hover:not(:disabled) {
  background: #253558;
}

.app__btn--block {
  width: 100%;
}

.app__main {
  flex: 1;
  display: flex;
  gap: 24px;
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.app__canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.app__upload-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app__image-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.app__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #16213e;
  border-radius: 12px;
}

.app__toolbar--top {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.app__toolbar--bottom {
  padding: 8px;
}

.app__nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app__nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #1e2d4d;
  color: #e2e8f0;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app__nav-btn:hover:not(:disabled) {
  background: #e94560;
  transform: scale(1.05);
}

.app__nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.app__nav-label {
  font-size: 13px;
  color: #94a3b8;
  min-width: 60px;
  text-align: center;
}

.app__current-style {
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 500;
}

.app__canvas-container {
  position: relative;
  background: #16213e;
  border-radius: 16px;
  overflow: hidden;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.app__canvas-image {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
  display: block;
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-scale-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.fade-scale-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

.app__compare-container {
  position: relative;
  width: 100%;
  height: 500px;
  overflow: hidden;
  user-select: none;
}

.app__compare-original,
.app__compare-processed {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app__compare-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.app__compare-processed {
  will-change: clip-path;
}

.app__compare-divider {
  position: absolute;
  z-index: 10;
  cursor: ew-resize;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app__canvas-container--compare .app__compare-divider {
  top: 0;
  bottom: 0;
  width: 4px;
  background: #e94560;
  box-shadow: 0 0 10px rgba(233, 69, 96, 0.5);
}

.app__canvas-container--compare-v .app__compare-divider {
  left: 0;
  right: 0;
  width: auto;
  height: 4px;
  cursor: ns-resize;
}

.app__divider-handle {
  width: 44px;
  height: 44px;
  background: #e94560;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease;
}

.app__divider-handle:hover {
  transform: scale(1.1);
}

.app__divider-icon {
  color: white;
  font-size: 18px;
  font-weight: bold;
}

.app__compare-label {
  position: absolute;
  padding: 6px 14px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 12px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  z-index: 5;
  pointer-events: none;
}

.app__compare-label--left {
  top: 16px;
  left: 16px;
}

.app__compare-label--right {
  top: 16px;
  right: 16px;
}

.app__canvas-container--compare-v .app__compare-label--left {
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
}

.app__canvas-container--compare-v .app__compare-label--right {
  top: auto;
  bottom: 16px;
  right: 50%;
  transform: translateX(50%);
}

.app__history {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px 0;
}

.app__history-track {
  display: flex;
  gap: 10px;
  padding: 4px 8px;
}

.app__history-item {
  flex-shrink: 0;
  width: 72px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
}

.app__history-item:hover {
  transform: translateY(-2px);
}

.app__history-item--active {
  border-color: #e94560;
  box-shadow: 0 0 12px rgba(233, 69, 96, 0.4);
}

.app__history-thumb {
  width: 100%;
  height: 56px;
  object-fit: cover;
  display: block;
}

.app__history-name {
  display: block;
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
  padding: 4px 2px;
  background: #1e2d4d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app__sidebar {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.app__compare-settings {
  background: #16213e;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.app__compare-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #ffffff;
}

.app__bottom-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #16213e;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 16px;
  z-index: 100;
  max-height: 50vh;
  overflow-y: auto;
}

.app__loading {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(22, 33, 62, 0.95);
  backdrop-filter: blur(8px);
  padding: 24px 32px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.app__loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(233, 69, 96, 0.2);
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.app__loading-text {
  font-size: 14px;
  color: #e2e8f0;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: all 0.3s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.9);
}

@media (max-width: 768px) {
  .app__header {
    padding: 12px 16px;
  }

  .app__logo-text {
    font-size: 18px;
  }

  .app__btn {
    padding: 8px 14px;
    font-size: 13px;
  }

  .app__main {
    padding: 16px;
    padding-bottom: 200px;
    flex-direction: column;
  }

  .app__canvas-container {
    min-height: 300px;
  }

  .app__canvas-image {
    max-height: 400px;
  }

  .app__compare-container {
    height: 350px;
  }

  .app__sidebar {
    display: none;
  }

  .app__history-item {
    width: 60px;
  }

  .app__history-thumb {
    height: 44px;
  }
}
</style>
