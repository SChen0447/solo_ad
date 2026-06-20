<script setup lang="ts">
import { ref } from 'vue'
import { useColorStore } from '@/stores/colorStore'
import { isDarkColor } from '@/colorEngine/colorHarmony'
import type { ColorSwatch } from '@/colorEngine/types'

const store = useColorStore()
const copiedKey = ref<string | null>(null)
const toastMsg = ref('')
const showToast = ref(false)

async function copyColor(swatch: ColorSwatch) {
  try {
    await navigator.clipboard.writeText(swatch.hex)
    copiedKey.value = swatch.name
    toastMsg.value = '已复制'
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
      copiedKey.value = null
    }, 500)
  } catch {
    toastMsg.value = '复制失败'
    showToast.value = true
    setTimeout(() => { showToast.value = false }, 500)
  }
}

function getTextColor(hex: string): string {
  return isDarkColor(hex) ? '#FFFFFF' : '#1F2937'
}
</script>

<template>
  <div class="palette-panel">
    <div class="toast" :class="{ visible: showToast }">{{ toastMsg }}</div>

    <section class="palette-section">
      <h3 class="section-title">主色 Primary</h3>
      <div class="swatch-grid">
        <div
          v-for="swatch in store.palette.primary"
          :key="swatch.name"
          class="swatch-item"
          :class="{ copied: copiedKey === swatch.name }"
          :style="{ backgroundColor: swatch.hex, color: getTextColor(swatch.hex) }"
          @click="copyColor(swatch)"
        >
          <span class="swatch-label">{{ swatch.name }}</span>
          <span class="swatch-value">{{ swatch.hex }}</span>
        </div>
      </div>
    </section>

    <section class="palette-section">
      <h3 class="section-title">辅助色 Secondary</h3>
      <div class="swatch-grid">
        <div
          v-for="swatch in store.palette.secondary"
          :key="swatch.name"
          class="swatch-item"
          :class="{ copied: copiedKey === swatch.name }"
          :style="{ backgroundColor: swatch.hex, color: getTextColor(swatch.hex) }"
          @click="copyColor(swatch)"
        >
          <span class="swatch-label">{{ swatch.name }}</span>
          <span class="swatch-value">{{ swatch.hex }}</span>
        </div>
      </div>
    </section>

    <section class="palette-section">
      <h3 class="section-title">中性色 Neutral</h3>
      <div class="swatch-grid">
        <div
          v-for="swatch in store.palette.neutral"
          :key="swatch.name"
          class="swatch-item"
          :class="{ copied: copiedKey === swatch.name }"
          :style="{ backgroundColor: swatch.hex, color: getTextColor(swatch.hex) }"
          @click="copyColor(swatch)"
        >
          <span class="swatch-label">{{ swatch.name }}</span>
          <span class="swatch-value">{{ swatch.hex }}</span>
        </div>
      </div>
    </section>

    <section class="palette-section">
      <h3 class="section-title">功能色 Functional</h3>
      <div class="swatch-grid">
        <div
          v-for="swatch in [store.palette.functional.success, store.palette.functional.warning, store.palette.functional.danger]"
          :key="swatch.name"
          class="swatch-item"
          :class="{ copied: copiedKey === swatch.name }"
          :style="{ backgroundColor: swatch.hex, color: getTextColor(swatch.hex) }"
          @click="copyColor(swatch)"
        >
          <span class="swatch-label">{{ swatch.name }}</span>
          <span class="swatch-value">{{ swatch.hex }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.palette-panel {
  position: relative;
  padding: 24px;
  background: var(--panel-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  border-radius: 6px;
  font-size: 14px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease, transform 0.2s ease;
  z-index: 1000;
}

.toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.palette-section {
  margin-bottom: 28px;
}

.palette-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  letter-spacing: 0.3px;
}

.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.swatch-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 80px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  user-select: none;
}

.swatch-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.swatch-item.copied {
  transform: scale(1.02);
}

.swatch-label {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.swatch-value {
  font-size: 13px;
  font-weight: 600;
  font-family: 'SF Mono', Consolas, monospace;
}
</style>
