<script setup lang="ts">
import NotePalette from '@/components/NotePalette.vue'
import Timeline from '@/components/Timeline.vue'
import Visualizer from '@/components/Visualizer.vue'
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div class="brand-text">
          <h1 class="brand-title">Melody Studio</h1>
          <p class="brand-sub">交互式音乐创作与可视化</p>
        </div>
      </div>
      <div class="hint-bar">
        <span class="hint-item">
          <kbd>点击</kbd> 音符添加到时间轴
        </span>
        <span class="hint-item">
          <kbd>拖拽</kbd> 音符到指定拍子
        </span>
        <span class="hint-item">
          <kbd>Delete</kbd> 删除选中音符
        </span>
      </div>
    </header>

    <main class="app-main">
      <aside class="panel panel-left">
        <NotePalette />
      </aside>

      <section class="panel panel-center">
        <Timeline />
      </section>

      <aside class="panel panel-right">
        <Visualizer />
      </aside>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse at top, rgba(79, 70, 229, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(124, 58, 237, 0.06) 0%, transparent 50%),
    #0F172A;
}

.app-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgba(2, 6, 23, 0.6);
  border-bottom: 1px solid rgba(99, 102, 241, 0.2);
  backdrop-filter: blur(10px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 0 18px rgba(99, 102, 241, 0.5);
}

.brand-icon svg {
  width: 22px;
  height: 22px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #E2E8F0, #C7D2FE);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 0.5px;
}

.brand-sub {
  margin: 2px 0 0 0;
  font-size: 11px;
  color: #64748B;
  letter-spacing: 0.3px;
}

.hint-bar {
  display: flex;
  align-items: center;
  gap: 18px;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94A3B8;
}

kbd {
  display: inline-block;
  padding: 2px 7px;
  font-size: 10px;
  font-family: inherit;
  font-weight: 600;
  color: #C7D2FE;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 4px;
}

.app-main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.panel {
  min-height: 0;
}

.panel-left {
  flex: 0 0 25%;
  min-width: 200px;
}

.panel-center {
  flex: 1 1 auto;
  min-width: 0;
  border-left: 1px solid rgba(99, 102, 241, 0.08);
  border-right: 1px solid rgba(99, 102, 241, 0.08);
}

.panel-right {
  flex: 0 0 25%;
  min-width: 200px;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 10px;
    padding: 10px 16px;
  }

  .hint-bar {
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .hint-item {
    font-size: 11px;
  }

  .app-main {
    flex-direction: column;
  }

  .panel-left,
  .panel-right,
  .panel-center {
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
  }

  .panel-left {
    flex: 0 0 32%;
    max-height: 32%;
  }

  .panel-center {
    flex: 1 1 auto;
    min-height: 40%;
  }

  .panel-right {
    flex: 0 0 28%;
    max-height: 28%;
  }

  .panel-left,
  .panel-right {
    border: none;
  }

  .panel-center {
    border-top: 1px solid rgba(99, 102, 241, 0.15);
    border-bottom: 1px solid rgba(99, 102, 241, 0.15);
    border-left: none;
    border-right: none;
  }
}
</style>
