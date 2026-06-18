<template>
  <div class="board-container">
    <div v-if="store.allTags.length > 0" class="tags-filter">
      <span class="filter-label">标签筛选：</span>
      <button
        class="filter-chip"
        :class="{ active: store.activeTag === null }"
        @click="store.setActiveTag(null)"
      >
        全部
      </button>
      <button
        v-for="tag in store.allTags"
        :key="tag"
        class="filter-chip"
        :class="{ active: store.activeTag === tag }"
        @click="store.setActiveTag(tag)"
      >
        {{ tag }}
      </button>
    </div>

    <div v-if="store.sortedCards.length === 0" class="empty-state">
      <div class="empty-icon">🖼️</div>
      <p class="empty-text">暂无灵感卡片，点击右上角"新建灵感"开始创作</p>
    </div>

    <div class="masonry-grid">
      <div
        v-for="card in store.sortedCards"
        :key="card.id"
        class="card-wrapper"
        :class="{ 'card-leaving': removingIds.has(card.id) }"
      >
        <div class="inspiration-card" @click="goToEditor(card.id)">
          <button
            class="delete-btn"
            @click.stop="handleRemove(card.id)"
          >
            ×
          </button>
          <img
            :src="card.imageUrl"
            :alt="card.fileName"
            class="card-image"
          />
          <div class="card-body">
            <div class="color-bar">
              <div
                v-for="(color, idx) in card.colors"
                :key="idx"
                class="color-sample"
                :style="{ backgroundColor: color }"
              />
            </div>
            <div class="card-meta">
              <span class="card-filename" :title="card.fileName">{{ card.fileName }}</span>
              <span class="card-date">{{ formatDate(card.createdAt) }}</span>
            </div>
            <div v-if="card.tags.length > 0" class="card-tags">
              <span
                v-for="tag in card.tags"
                :key="tag"
                class="card-tag"
                @click.stop="store.setActiveTag(tag)"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useInspirationStore } from '../stores/inspirationStore'

const router = useRouter()
const store = useInspirationStore()

const removingIds = new Set<string>()

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function goToEditor(id: string) {
  router.push(`/editor/${id}`)
}

function handleRemove(id: string) {
  removingIds.add(id)
  setTimeout(() => {
    store.removeCard(id)
    removingIds.delete(id)
  }, 300)
}
</script>

<style scoped>
.board-container {
  max-width: 1200px;
  margin: 0 auto;
}

.tags-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #edf2f7;
}

.filter-label {
  font-size: 14px;
  color: #4a5568;
  margin-right: 4px;
}

.filter-chip {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #4a5568;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  background: #edf2f7;
}

.filter-chip.active {
  background: #4a90d9;
  color: #ffffff;
  border-color: #4a90d9;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #a0aec0;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-text {
  font-size: 15px;
}

.masonry-grid {
  column-count: 2;
  column-gap: 16px;
}

@media (max-width: 640px) {
  .masonry-grid {
    column-count: 1;
  }
}

.card-wrapper {
  break-inside: avoid;
  margin-bottom: 16px;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.card-wrapper.card-leaving {
  opacity: 0;
  transform: scale(0.8);
}

.inspiration-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #edf2f7;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.inspiration-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ff4757;
  color: #ffffff;
  border: none;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.inspiration-card:hover .delete-btn {
  opacity: 1;
}

.card-image {
  width: 100%;
  max-height: 240px;
  object-fit: cover;
  display: block;
}

.card-body {
  padding: 12px;
}

.color-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}

.color-sample {
  flex: 1;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-filename {
  font-size: 14px;
  color: #2d3748;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-date {
  font-size: 12px;
  color: #a0aec0;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.card-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px;
  background: #edf2f7;
  color: #4a5568;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.card-tag:hover {
  background: #e2e8f0;
}
</style>
