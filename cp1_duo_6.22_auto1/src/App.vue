<script setup lang="ts">
import KanbanBoard from '@/view/KanbanBoard.vue'
import EfficiencyChart from '@/view/EfficiencyChart.vue'
import HeatMap from '@/view/HeatMap.vue'
import NotificationBar from '@/view/NotificationBar.vue'
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="brand">
        <div class="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div class="brand-text">
          <h1 class="app-title">TeamPulse</h1>
          <p class="app-subtitle">团队协作效率分析平台</p>
        </div>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-value">{{ store.tasks.length }}</span>
          <span class="stat-label">总任务</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ store.doneTasks.length }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ store.inProgressTasks.length }}</span>
          <span class="stat-label">进行中</span>
        </div>
      </div>
    </header>

    <main class="app-main">
      <section class="kanban-section">
        <KanbanBoard />
      </section>

      <div class="analytics-grid">
        <section class="chart-section">
          <EfficiencyChart />
        </section>
        <section class="heatmap-section">
          <HeatMap />
        </section>
      </div>
    </main>

    <NotificationBar />
  </div>
</template>

<script lang="ts">
import { useTaskStore } from '@/data/taskStore'
export default {
  setup() {
    return { store: useTaskStore() }
  },
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+SC:wght@400;500;600&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
  min-height: 100vh;
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #fff;
  overflow-x: hidden;
}

#app {
  width: 100%;
  min-height: 100vh;
}

.app-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  padding: 20px 28px;
  background: linear-gradient(135deg, rgba(26, 26, 46, 0.8), rgba(22, 33, 62, 0.8));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  flex-wrap: wrap;
  gap: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e94560, #8b5cf6);
  border-radius: 14px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(233, 69, 96, 0.3);
}

.brand-text .app-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #fff, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
}

.brand-text .app-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 2px 0 0 0;
  letter-spacing: 0.5px;
}

.header-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #e94560;
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.app-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.analytics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 1280px) {
  .analytics-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .app-container {
    padding: 16px;
  }

  .app-header {
    padding: 16px;
  }

  .header-stats {
    gap: 20px;
  }

  .stat-value {
    font-size: 20px;
  }
}
</style>
