<template>
  <div class="filter-panel">
    <h3 class="filter-panel__title">风格选择</h3>
    <div class="filter-panel__grid">
      <button
        v-for="style in styles"
        :key="style.id"
        class="filter-card"
        :class="{ 'filter-card--active': selectedStyleId === style.id, 'filter-card--loading': isLoading && selectedStyleId === style.id }"
        @click="handleSelect(style.id)"
      >
        <div class="filter-card__preview">
          <span class="filter-card__icon">{{ style.icon }}</span>
        </div>
        <span class="filter-card__name">{{ style.name }}</span>
        <div v-if="selectedStyleId === style.id && isLoading" class="filter-card__spinner"></div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FilterStyle } from '@/composables/useFilter'

defineProps<{
  styles: FilterStyle[]
  selectedStyleId: string
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', styleId: string): void
}>()

function handleSelect(styleId: string) {
  emit('select', styleId)
}
</script>

<style scoped>
.filter-panel {
  background: #16213e;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.filter-panel__title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 16px 0;
}

.filter-panel__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.filter-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  background: #1a2744;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.filter-card:hover {
  transform: translateY(-3px);
  background: #1e2d4d;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.filter-card--active {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.1);
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(233, 69, 96, 0.3);
}

.filter-card--active:hover {
  transform: scale(1.05) translateY(-3px);
}

.filter-card--loading {
  pointer-events: none;
}

.filter-card__preview {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f3460;
  border-radius: 8px;
  overflow: hidden;
}

.filter-card__icon {
  font-size: 24px;
}

.filter-card__name {
  font-size: 12px;
  color: #e2e8f0;
  font-weight: 500;
}

.filter-card__spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border: 2px solid rgba(233, 69, 96, 0.3);
  border-top-color: #e94560;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .filter-panel {
    padding: 16px;
  }

  .filter-panel__grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .filter-card {
    padding: 8px 4px;
  }

  .filter-card__preview {
    width: 40px;
    height: 40px;
  }

  .filter-card__icon {
    font-size: 20px;
  }

  .filter-card__name {
    font-size: 11px;
  }
}
</style>
