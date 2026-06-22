<template>
  <div class="app-container">
    <header class="app-header">
      <div class="logo">
        <span class="logo-icon">🎬</span>
        <span class="logo-text">动画工坊</span>
        <span class="logo-subtitle">Animation Workshop</span>
      </div>
      <div class="header-actions">
        <span class="version-badge">v1.0.0</span>
      </div>
    </header>

    <main class="app-main">
      <aside class="sidebar left-sidebar">
        <LayerPanel />
      </aside>

      <section class="canvas-section">
        <CanvasPreview />
      </section>

      <aside class="sidebar right-sidebar">
        <PropertyPanel />
      </aside>
    </main>

    <footer class="app-footer">
      <TimelinePanel />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import TimelinePanel from './components/TimelinePanel.vue'
import CanvasPreview from './components/CanvasPreview.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import LayerPanel from './components/LayerPanel.vue'
import { timelineManager } from './modules/timeline/timelineManager'
import { CanvasElement } from './modules/render/canvasElement'

function initDemoScene() {
  const rect1 = new CanvasElement(
    'demo_rect_1',
    '蓝色方块',
    'rectangle',
    { x: 200, y: 150, rotation: 0, scale: 1, opacity: 1 },
    {
      width: 100,
      height: 100,
      fill: '#00d4ff',
      stroke: '#0099cc',
      strokeWidth: 2,
      borderRadius: 12
    }
  )
  rect1.addKeyframe({
    frame: 0,
    properties: { x: 150, y: 200, rotation: 0, scale: 1, opacity: 1 },
    easing: 'easeOutCubic'
  })
  rect1.addKeyframe({
    frame: 30,
    properties: { x: 350, y: 200, rotation: 180, scale: 1.2, opacity: 0.8 },
    easing: 'easeInOutCubic'
  })
  rect1.addKeyframe({
    frame: 60,
    properties: { x: 350, y: 300, rotation: 360, scale: 0.8, opacity: 1 },
    easing: 'easeOutCubic'
  })
  rect1.addKeyframe({
    frame: 90,
    properties: { x: 150, y: 300, rotation: 180, scale: 1.1, opacity: 0.9 },
    easing: 'easeInOutCubic'
  })
  rect1.addKeyframe({
    frame: 120,
    properties: { x: 150, y: 200, rotation: 0, scale: 1, opacity: 1 },
    easing: 'easeOutCubic'
  })

  const circle1 = new CanvasElement(
    'demo_circle_1',
    '品红圆形',
    'circle',
    { x: 400, y: 200, rotation: 0, scale: 1, opacity: 1 },
    {
      width: 80,
      height: 80,
      fill: '#ff00ff',
      stroke: '#cc00cc',
      strokeWidth: 3
    }
  )
  circle1.addKeyframe({
    frame: 0,
    properties: { x: 500, y: 150, scale: 1, opacity: 1 },
    easing: 'easeOutQuad'
  })
  circle1.addKeyframe({
    frame: 40,
    properties: { x: 500, y: 350, scale: 0.6, opacity: 0.6 },
    easing: 'easeInOutQuad'
  })
  circle1.addKeyframe({
    frame: 80,
    properties: { x: 500, y: 150, scale: 1.2, opacity: 1 },
    easing: 'easeOutQuad'
  })
  circle1.addKeyframe({
    frame: 120,
    properties: { x: 500, y: 150, scale: 1, opacity: 1 },
    easing: 'linear'
  })

  const text1 = new CanvasElement(
    'demo_text_1',
    '标题文字',
    'text',
    { x: 320, y: 80, rotation: 0, scale: 1, opacity: 1 },
    {
      width: 300,
      height: 60,
      fill: '#ffffff',
      stroke: 'transparent',
      strokeWidth: 0,
      text: '动画工坊',
      fontSize: 36,
      fontFamily: 'Microsoft YaHei, sans-serif'
    }
  )
  text1.addKeyframe({
    frame: 0,
    properties: { y: 30, opacity: 0, scale: 0.5 },
    easing: 'easeOutCubic'
  })
  text1.addKeyframe({
    frame: 24,
    properties: { y: 80, opacity: 1, scale: 1 },
    easing: 'easeOutCubic'
  })
  text1.addKeyframe({
    frame: 100,
    properties: { y: 80, opacity: 1, scale: 1 },
    easing: 'easeInCubic'
  })
  text1.addKeyframe({
    frame: 120,
    properties: { y: 30, opacity: 0, scale: 0.8 },
    easing: 'easeInCubic'
  })

  const rect2 = new CanvasElement(
    'demo_rect_2',
    '装饰线条',
    'rectangle',
    { x: 320, y: 400, rotation: 0, scale: 1, opacity: 1 },
    {
      width: 200,
      height: 4,
      fill: 'linear-gradient(90deg, #00d4ff, #ff00ff)',
      stroke: 'transparent',
      strokeWidth: 0,
      borderRadius: 2
    }
  )
  rect2.addKeyframe({
    frame: 0,
    properties: { x: 100, y: 420, scale: 0, opacity: 0 },
    easing: 'easeOutCubic'
  })
  rect2.addKeyframe({
    frame: 20,
    properties: { x: 320, y: 420, scale: 1, opacity: 1 },
    easing: 'easeOutCubic'
  })
  rect2.addKeyframe({
    frame: 100,
    properties: { x: 320, y: 420, scale: 1, opacity: 1 },
    easing: 'linear'
  })
  rect2.addKeyframe({
    frame: 120,
    properties: { x: 540, y: 420, scale: 0, opacity: 0 },
    easing: 'easeInCubic'
  })

  timelineManager.addElement(text1)
  timelineManager.addElement(rect1)
  timelineManager.addElement(circle1)
  timelineManager.addElement(rect2)

  timelineManager.setTotalFrames(144)
  timelineManager.setFps(24)
}

onMounted(() => {
  initDemoScene()
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
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: #0f0f1a;
  color: #e0e0e0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: #0f0f1a;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(90deg, #00d4ff 0%, #ff00ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.logo-subtitle {
  font-size: 11px;
  color: #666;
  margin-left: 6px;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.version-badge {
  padding: 4px 10px;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 12px;
  font-size: 11px;
  color: #00d4ff;
}

.app-main {
  flex: 1;
  display: flex;
  min-height: 0;
}

.sidebar {
  flex-shrink: 0;
  width: 240px;
  min-width: 200px;
  max-width: 320px;
  transition: width 0.3s ease;
}

.left-sidebar {
  border-right: 1px solid #2a2a4a;
}

.right-sidebar {
  border-left: 1px solid #2a2a4a;
}

.canvas-section {
  flex: 1;
  min-width: 0;
  display: flex;
}

.app-footer {
  height: 280px;
  flex-shrink: 0;
  border-top: 1px solid #2a2a4a;
}

@media (max-width: 1200px) {
  .sidebar {
    width: 200px;
  }
}

@media (max-width: 900px) {
  .app-main {
    flex-wrap: wrap;
  }

  .left-sidebar {
    width: 50%;
    order: 1;
    height: auto;
    max-height: 200px;
  }

  .canvas-section {
    width: 100%;
    order: 3;
    height: 400px;
  }

  .right-sidebar {
    width: 50%;
    order: 2;
    height: auto;
    max-height: 200px;
  }

  .app-footer {
    height: 240px;
  }
}

@media (max-width: 600px) {
  .left-sidebar {
    width: 100%;
    order: 1;
    max-height: 150px;
  }

  .right-sidebar {
    width: 100%;
    order: 2;
    max-height: 200px;
  }

  .canvas-section {
    order: 3;
    height: 300px;
  }

  .app-footer {
    height: 200px;
  }

  .logo-subtitle {
    display: none;
  }
}
</style>
