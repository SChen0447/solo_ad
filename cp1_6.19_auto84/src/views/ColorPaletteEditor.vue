<template>
  <div class="editor-container">
    <div v-if="isExtracting" class="loading-overlay">
      <div class="loading-ring"></div>
      <p class="loading-text">正在提取颜色...</p>
    </div>

    <div v-if="toast.show" class="toast" :class="{ 'toast-enter': toast.show }">
      {{ toast.message }}
    </div>

    <div v-if="!card" class="no-card">
      <p>未找到该卡片，<a @click="router.push('/')">返回看板</a></p>
    </div>

    <div v-else class="editor-layout">
      <div class="image-section">
        <div class="image-wrapper" @click="triggerUpload" @dragover.prevent @drop="handleDrop">
          <img
            v-if="card.imageUrl"
            :src="card.imageUrl"
            :alt="card.fileName"
            class="preview-image"
          />
          <div v-else class="upload-placeholder">
            <span class="upload-icon">📷</span>
            <p>点击或拖拽上传图片</p>
            <p class="upload-hint">支持 jpg / png / webp，最大 5MB</p>
          </div>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style="display: none"
          @change="handleFileChange"
        />
      </div>

      <div class="palette-section">
        <h2 class="section-title">色彩板</h2>

        <div class="color-list">
          <div
            v-for="(color, index) in localColors"
            :key="index"
            class="color-item"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover.prevent="handleDragOver($event, index)"
            @dragend="handleDragEnd"
            @drop="handleDropColor($event, index)"
            :class="{ dragging: dragIndex === index, 'drag-over': dragOverIndex === index }"
          >
            <div class="color-swatch" :style="{ backgroundColor: color }" @click="openPicker(index)">
              <span class="drag-handle">⋮⋮</span>
            </div>
            <div class="color-hex">{{ color.toUpperCase() }}</div>
          </div>
        </div>

        <div v-if="picker.visible" class="picker-modal" @click.self="closePicker">
          <div class="picker-content">
            <h3 class="picker-title">选择颜色</h3>
            <div class="picker-grid">
              <div
                v-for="(color, cIdx) in presetColors"
                :key="cIdx"
                class="picker-cell"
                :style="{ backgroundColor: color }"
                @click="selectColor(color)"
              ></div>
            </div>
            <button class="picker-close" @click="closePicker">关闭</button>
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn-secondary" @click="addColor" :disabled="localColors.length >= 10">
            + 添加色块
          </button>
          <button class="btn-primary" @click="saveChanges">
            保存变更
          </button>
        </div>

        <div class="tags-section">
          <h3 class="tags-title">标签（最多3个，每个10字符以内）</h3>
          <div class="tags-input-wrap">
            <div class="tags-display">
              <span
                v-for="(tag, tIdx) in localTags"
                :key="tIdx"
                class="editor-tag"
              >
                {{ tag }}
                <button class="tag-remove" @click="removeTag(tIdx)">×</button>
              </span>
              <input
                v-if="localTags.length < 3"
                v-model="tagInput"
                class="tag-input"
                placeholder="输入标签后按回车"
                maxlength="10"
                @keydown.enter="addTag"
              />
            </div>
          </div>
        </div>

        <button class="back-btn" @click="router.push('/')">
          ← 返回看板
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInspirationStore } from '../stores/inspirationStore'
import { extractColors } from '../utils/colorExtractor'
import confetti from 'canvas-confetti'

const route = useRoute()
const router = useRouter()
const store = useInspirationStore()

const cardId = computed(() => route.params.id as string)
const card = computed(() => store.cardById(cardId.value))

const localColors = ref<string[]>([])
const localTags = ref<string[]>([])
const tagInput = ref('')
const isExtracting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const picker = reactive({
  visible: false,
  targetIndex: -1
})

const toast = reactive({
  show: false,
  message: ''
})

const presetColors: string[] = [
  '#ff0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc', '#ff8080', '#ff4d4d', '#ff1a1a', '#e60000', '#b30000',
  '#ff8000', '#ff9933', '#ffb366', '#ffcc99', '#ffe6cc', '#ffa64d', '#ff8c1a', '#e67300', '#b35900', '#804000',
  '#ffd700', '#ffdb4d', '#ffe066', '#ffe580', '#fff0b3', '#ffd700', '#e6c200', '#b39a00', '#807200', '#ffcc00',
  '#00ff00', '#33ff33', '#66ff66', '#99ff99', '#ccffcc', '#4dff4d', '#1aff1a', '#00e600', '#00b300', '#008000',
  '#00ffff', '#33ffff', '#66ffff', '#99ffff', '#ccffff', '#1ae6e6', '#00b3b3', '#008080', '#004d4d', '#003333',
  '#0080ff', '#3399ff', '#66b3ff', '#99ccff', '#cce5ff', '#1a75ff', '#005ce6', '#0047b3', '#003380', '#001f4d',
  '#8000ff', '#9933ff', '#b366ff', '#cc99ff', '#e6ccff', '#6a00e6', '#5300b3', '#3c0080', '#26004d', '#7b2ff7',
  '#ff00ff', '#ff33ff', '#ff66ff', '#ff99ff', '#ffccff', '#ff00bf', '#cc0099', '#990073', '#66004d', '#ff1493',
  '#8b4513', '#a0522d', '#cd853f', '#d2691e', '#deb887', '#a67c52', '#c68642', '#8b7d6b', '#6b4423', '#5d4037',
  '#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3', '#cccccc', '#ffffff'
]

watch(card, (newCard) => {
  if (newCard) {
    localColors.value = [...newCard.colors]
    localTags.value = [...newCard.tags]
  }
}, { immediate: true })

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  await processFile(file)
}

async function handleDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  await processFile(file)
}

async function processFile(file: File) {
  if (!file.type.match(/image\/(jpeg|png|webp)/)) {
    alert('颜色提取失败，请尝试更清晰的图片')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('颜色提取失败，请尝试更清晰的图片')
    return
  }

  isExtracting.value = true
  try {
    const colors = await extractColors(file)
    localColors.value = colors
    isExtracting.value = false
    showToast('颜色提取成功')
  } catch {
    isExtracting.value = false
    alert('颜色提取失败，请尝试更清晰的图片')
  }
}

function openPicker(index: number) {
  picker.targetIndex = index
  picker.visible = true
}

function closePicker() {
  picker.visible = false
  picker.targetIndex = -1
}

function selectColor(color: string) {
  if (picker.targetIndex >= 0 && picker.targetIndex < localColors.value.length) {
    localColors.value[picker.targetIndex] = color
  }
  closePicker()
}

function addColor() {
  if (localColors.value.length < 10) {
    localColors.value.push('#ffffff')
  }
}

function handleDragStart(e: DragEvent, index: number) {
  dragIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function handleDragOver(_e: DragEvent, index: number) {
  dragOverIndex.value = index
}

function handleDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

function handleDropColor(_e: DragEvent, dropIndex: number) {
  if (dragIndex.value === null || dragIndex.value === dropIndex) {
    handleDragEnd()
    return
  }
  const colors = [...localColors.value]
  const [removed] = colors.splice(dragIndex.value, 1)
  colors.splice(dropIndex, 0, removed)
  localColors.value = colors
  handleDragEnd()
}

function addTag() {
  const val = tagInput.value.trim()
  if (val && val.length <= 10 && localTags.value.length < 3 && !localTags.value.includes(val)) {
    localTags.value.push(val)
    tagInput.value = ''
  }
}

function removeTag(index: number) {
  localTags.value.splice(index, 1)
}

function saveChanges() {
  if (card.value) {
    store.updateCardColors(card.value.id, localColors.value)
    store.updateCardTags(card.value.id, localTags.value)

    const confettiColors = localColors.value.slice(0, 2)
    confetti({
      particleCount: 60,
      colors: confettiColors,
      spread: 70,
      origin: { y: 0.6 },
      startVelocity: 30,
      ticks: 60,
      scalar: 0.8
    })

    showToast('卡片已保存')
  }
}

function showToast(msg: string) {
  toast.message = msg
  toast.show = true
  setTimeout(() => {
    toast.show = false
  }, 2000)
}
</script>

<style scoped>
.editor-container {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-ring {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #4a90d9;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 16px;
  color: #4a5568;
  font-size: 14px;
}

.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #2d3748;
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 2000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.toast-enter {
  opacity: 1;
}

.no-card {
  text-align: center;
  padding: 80px 20px;
  color: #4a5568;
}

.no-card a {
  color: #4a90d9;
  cursor: pointer;
  text-decoration: underline;
}

.editor-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

@media (max-width: 640px) {
  .editor-layout {
    flex-direction: column;
    gap: 24px;
  }
}

.image-section {
  flex-shrink: 0;
}

.image-wrapper {
  width: 400px;
  max-width: 100%;
  background: #ffffff;
  border: 2px dashed #cbd5e0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.image-wrapper:hover {
  border-color: #4a90d9;
}

@media (max-width: 640px) {
  .image-wrapper {
    width: 100%;
  }
}

.preview-image {
  max-width: 400px;
  max-height: 400px;
  width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
}

.upload-placeholder {
  padding: 60px 20px;
  text-align: center;
  color: #a0aec0;
}

.upload-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.upload-placeholder p {
  font-size: 14px;
  margin-bottom: 4px;
}

.upload-hint {
  font-size: 12px;
  color: #cbd5e0;
}

.palette-section {
  flex: 1;
  min-width: 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 16px;
}

.color-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 20px;
}

.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: grab;
  transition: transform 0.2s ease;
}

.color-item.dragging {
  opacity: 0.4;
  transform: scale(0.95);
}

.color-item.drag-over {
  transform: translateY(-4px);
}

.color-swatch {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.color-swatch:hover {
  transform: scale(1.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.drag-handle {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  opacity: 0;
  transition: opacity 0.2s ease;
  letter-spacing: -2px;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.color-swatch:hover .drag-handle {
  opacity: 1;
}

.color-hex {
  font-size: 12px;
  color: #4a5568;
  font-family: monospace;
}

.picker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
}

.picker-content {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  max-width: 360px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.picker-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #2d3748;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  margin-bottom: 16px;
}

.picker-cell {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: transform 0.15s ease;
}

.picker-cell:hover {
  transform: scale(1.15);
  z-index: 1;
  border-color: #4a90d9;
}

.picker-close {
  width: 100%;
  padding: 10px;
  background: #edf2f7;
  border: none;
  border-radius: 8px;
  color: #4a5568;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.picker-close:hover {
  background: #e2e8f0;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.btn-secondary {
  padding: 10px 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #4a5568;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover:not(:disabled) {
  background: #f7fafc;
  border-color: #cbd5e0;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  padding: 10px 24px;
  background: #4a90d9;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-primary:hover {
  background: #357abd;
}

.tags-section {
  margin-bottom: 20px;
}

.tags-title {
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
  margin-bottom: 10px;
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.editor-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #edf2f7;
  color: #4a5568;
  border-radius: 8px;
  font-size: 12px;
}

.tag-remove {
  background: none;
  border: none;
  color: #a0aec0;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-remove:hover {
  color: #e53e3e;
}

.tag-input {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 12px;
  outline: none;
  min-width: 120px;
  transition: border-color 0.2s ease;
}

.tag-input:focus {
  border-color: #4a90d9;
}

.back-btn {
  background: none;
  border: none;
  color: #4a90d9;
  font-size: 14px;
  cursor: pointer;
  padding: 6px 0;
  transition: color 0.2s ease;
}

.back-btn:hover {
  color: #357abd;
}
</style>
