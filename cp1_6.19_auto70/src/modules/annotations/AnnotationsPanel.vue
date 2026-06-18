<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDesignStore } from '@/stores/designStore'
import { STATUS_COLORS, STATUS_LABELS } from '@/types'
import type { AnnotationStatus } from '@/types'
import { MessageSquare, ChevronDown, Trash2 } from 'lucide-vue-next'

const store = useDesignStore()
const replyInputs = ref<Record<string, string>>({})

const annotations = computed(() => store.currentImageAnnotations)
const statusSummary = computed(() => store.statusSummary)

function getStatusColor(status: AnnotationStatus): string {
  return STATUS_COLORS[status]
}

function getStatusLabel(status: AnnotationStatus): string {
  return STATUS_LABELS[status]
}

function changeStatus(annotationId: string, status: AnnotationStatus) {
  store.updateAnnotationStatus(annotationId, status)
}

function submitReply(annotationId: string) {
  const content = (replyInputs.value[annotationId] ?? '').trim()
  if (!content) return
  store.addReply(annotationId, content)
  replyInputs.value[annotationId] = ''
}

function deleteAnnotation(id: string) {
  store.deleteAnnotation(id)
}

function selectAnnotation(id: string) {
  store.setActiveAnnotation(id)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getAnnotationThumbnail(a: { x: number; y: number; radius: number }): string {
  if (!store.currentImage) return ''
  const img = new Image()
  img.src = store.currentImage.url
  const size = 64
  const cvs = document.createElement('canvas')
  cvs.width = size
  cvs.height = size
  const ctx = cvs.getContext('2d')
  if (!ctx) return ''
  const scaleRatio = size / (a.radius * 4)
  const sx = a.x - a.radius * 2
  const sy = a.y - a.radius * 2
  const sw = a.radius * 4
  const sh = a.radius * 4
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)
  return cvs.toDataURL()
}
</script>

<template>
  <div class="annotations-panel">
    <div class="panel-header">
      <h2 class="panel-title">标注列表</h2>
      <div class="status-summary">
        <span class="status-dot" style="background: #FF6B35"></span>
        <span class="status-count">{{ statusSummary.pending }}</span>
        <span class="status-dot" style="background: #4B7BEC"></span>
        <span class="status-count">{{ statusSummary['in-progress'] }}</span>
        <span class="status-dot" style="background: #20BF6B"></span>
        <span class="status-count">{{ statusSummary.completed }}</span>
      </div>
    </div>

    <div v-if="annotations.length === 0" class="empty-state">
      <MessageSquare :size="32" color="#ccc" />
      <p>暂无标注</p>
      <p class="empty-hint">在画布上点击并拖拽以创建标注</p>
    </div>

    <div v-else class="annotations-list">
      <div
        v-for="a in annotations"
        :key="a.id"
        class="annotation-card"
        :class="{ active: store.activeAnnotationId === a.id }"
        @click="selectAnnotation(a.id)"
      >
        <div class="card-header">
          <span class="status-indicator" :style="{ background: getStatusColor(a.status) }"></span>
          <div class="status-select-wrapper">
            <select
              class="status-select"
              :value="a.status"
              @click.stop
              @change="changeStatus(a.id, ($event.target as HTMLSelectElement).value as AnnotationStatus)"
            >
              <option value="pending">{{ getStatusLabel('pending') }}</option>
              <option value="in-progress">{{ getStatusLabel('in-progress') }}</option>
              <option value="completed">{{ getStatusLabel('completed') }}</option>
            </select>
            <ChevronDown :size="12" class="select-icon" />
          </div>
          <button class="delete-btn" title="删除标注" @click.stop="deleteAnnotation(a.id)">
            <Trash2 :size="14" />
          </button>
        </div>

        <div class="card-body">
          <div class="thumbnail-wrapper">
            <img
              :src="store.currentImage?.url ?? ''"
              class="thumbnail"
              :style="{
                objectFit: 'cover',
                objectPosition: `${(a.x / (store.currentImage?.naturalWidth ?? 1)) * 100}% ${(a.y / (store.currentImage?.naturalHeight ?? 1)) * 100}%`,
              }"
              alt="标注缩略图"
            />
          </div>
          <div class="annotation-content">
            <p class="content-text">{{ a.content }}</p>
            <span class="content-time">{{ formatTime(a.createdAt) }}</span>
          </div>
        </div>

        <div class="replies-section">
          <div
            v-for="r in store.getAnnotationReplies(a.id)"
            :key="r.id"
            class="reply-item"
          >
            <p class="reply-text">{{ r.content }}</p>
            <span class="reply-time">{{ formatTime(r.createdAt) }}</span>
          </div>

          <div v-if="store.getAnnotationReplies(a.id).length < 3" class="reply-input-row">
            <input
              v-model="replyInputs[a.id]"
              class="reply-input"
              placeholder="添加回复..."
              maxlength="256"
              @keydown.enter="submitReply(a.id)"
              @click.stop
            />
            <button
              class="reply-submit"
              :disabled="!(replyInputs[a.id] ?? '').trim()"
              @click.stop="submitReply(a.id)"
            >
              发送
            </button>
          </div>
          <p v-else class="replies-limit">已达最大回复数</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.annotations-panel {
  width: 320px;
  height: 100%;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #222;
  margin-bottom: 8px;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-count {
  font-size: 12px;
  color: #888;
  margin-right: 8px;
  font-variant-numeric: tabular-nums;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #999;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: #bbb;
}

.annotations-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.annotations-list::-webkit-scrollbar {
  width: 4px;
}

.annotations-list::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;
}

.annotation-card {
  background: white;
  border-radius: 6px;
  padding: 12px;
  border: 1px solid #eee;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.annotation-card:hover {
  border-color: #d0d0d0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.annotation-card.active {
  border-color: #4b7bec;
  box-shadow: 0 0 0 1px #4b7bec;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.3s;
}

.status-select-wrapper {
  position: relative;
  flex: 1;
}

.status-select {
  appearance: none;
  width: 100%;
  padding: 4px 24px 4px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 12px;
  color: #555;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.status-select:hover {
  border-color: #ccc;
}

.select-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #999;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #ccc;
  transition: all 0.15s;
}

.delete-btn:hover {
  background: #fff0f0;
  color: #e74c3c;
}

.card-body {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.thumbnail-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f0f0f0;
}

.thumbnail {
  width: 100%;
  height: 100%;
}

.annotation-content {
  flex: 1;
  min-width: 0;
}

.content-text {
  font-size: 13px;
  color: #333;
  line-height: 1.5;
  word-break: break-word;
  margin-bottom: 4px;
}

.content-time {
  font-size: 11px;
  color: #bbb;
}

.replies-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 8px;
}

.reply-item {
  padding: 6px 0;
}

.reply-text {
  font-size: 12px;
  color: #555;
  line-height: 1.5;
  word-break: break-word;
}

.reply-time {
  font-size: 10px;
  color: #ccc;
}

.reply-input-row {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.reply-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
}

.reply-input:focus {
  border-color: #4b7bec;
}

.reply-submit {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #4b7bec;
  color: white;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.reply-submit:hover:not(:disabled) {
  background: #3a6bd4;
}

.reply-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.replies-limit {
  font-size: 11px;
  color: #ccc;
  text-align: center;
  margin-top: 4px;
}
</style>
