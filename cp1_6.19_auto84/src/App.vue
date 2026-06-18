<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <span class="app-icon">🎨</span>
        <span class="app-title">影迹追光</span>
      </div>
      <div class="header-right">
        <button class="new-btn" @click="handleNewInspiration">
          + 新建灵感
        </button>
      </div>
    </header>
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useInspirationStore } from './stores/inspirationStore'
import { extractColors } from './utils/colorExtractor'

const router = useRouter()
const store = useInspirationStore()

async function handleNewInspiration() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,image/webp'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('颜色提取失败，请尝试更清晰的图片')
      return
    }
    try {
      const colors = await extractColors(file)
      const card = store.addCard(file, colors)
      router.push(`/editor/${card.id}`)
    } catch {
      alert('颜色提取失败，请尝试更清晰的图片')
    }
  }
  input.click()
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  height: 100%;
  width: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
    Arial, sans-serif;
  background-color: #f7fafc;
  color: #2d3748;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  height: 56px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-icon {
  font-size: 24px;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
}

.header-right {
  display: flex;
  align-items: center;
}

.new-btn {
  background: #4a90d9;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.new-btn:hover {
  background: #357abd;
}

.app-main {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
