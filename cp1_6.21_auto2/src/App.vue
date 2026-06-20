<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useColorStore } from '@/stores/colorStore'
import { hslToHex, hexToHsl } from '@/colorEngine/colorHarmony'
import PalettePanel from '@/components/PalettePanel.vue'
import PreviewCard from '@/components/PreviewCard.vue'

const store = useColorStore()
const hexInput = ref(store.baseColor)
const hue = ref(217)
const saturation = ref(91)
const lightness = ref(60)

const exportToast = ref('')
const showExportToast = ref(false)
const exportFormat = ref<'css' | 'scss'>('css')

function updateFromHSL() {
  const hex = hslToHex({ h: hue.value, s: saturation.value, l: lightness.value })
  hexInput.value = hex
  store.setBaseColor(hex)
}

function updateFromHex(val: string) {
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
    const hsl = hexToHsl(val)
    hue.value = hsl.h
    saturation.value = hsl.s
    lightness.value = hsl.l
    store.setBaseColor(val)
  }
}

watch(hexInput, updateFromHex)

watch([hue, saturation, lightness], updateFromHSL)

const conicGradient = computed(() => {
  const stops = []
  for (let i = 0; i <= 360; i += 30) {
    stops.push(`${hslToHex({ h: i, s: saturation.value, l: lightness.value })} ${i}deg`)
  }
  return `conic-gradient(${stops.join(', ')})`
})

const wheelStyle = computed(() => ({
  background: conicGradient.value,
  boxShadow: `inset 0 0 0 12px hsl(${hue.value}, ${saturation.value}%, ${lightness.value}%)`
}))

function onWheelClick(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const dx = e.clientX - cx
  const dy = e.clientY - cy
  const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
  hue.value = ((angle % 360) + 360) % 360
}

let dragging = false

function onWheelDown(e: MouseEvent) {
  dragging = true
  onWheelClick(e)
}

function onWheelMove(e: MouseEvent) {
  if (dragging) onWheelClick(e)
}

function onWheelUp() {
  dragging = false
}

onMounted(() => {
  document.addEventListener('mousemove', onWheelMove)
  document.addEventListener('mouseup', onWheelUp)
  updateFromHSL()
})

function showExportMsg(msg: string) {
  exportToast.value = msg
  showExportToast.value = true
  setTimeout(() => { showExportToast.value = false }, 1500)
}

async function copyExport(format: 'css' | 'scss') {
  exportFormat.value = format
  const content = format === 'css' ? store.exportCSS() : store.exportSCSS()
  try {
    await navigator.clipboard.writeText(content)
    showExportMsg(`已复制${format.toUpperCase()}变量`)
  } catch {
    showExportMsg('复制失败')
  }
}

function downloadExport(format: 'css' | 'scss') {
  exportFormat.value = format
  const content = format === 'css' ? store.exportCSS() : store.exportSCSS()
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `palette.${format === 'css' ? 'css' : 'scss'}`
  a.click()
  URL.revokeObjectURL(url)
  showExportMsg(`已下载 ${format.toUpperCase()} 文件`)
}

const appBg = computed(() => {
  const h = hue.value
  return `hsl(${h}, 15%, ${store.isDarkMode ? '12%' : '96%'})`
})
</script>

<template>
  <div class="app" :style="{ backgroundColor: appBg }" @mouseup="onWheelUp">
    <div class="export-toast" :class="{ visible: showExportToast }">{{ exportToast }}</div>

    <header class="header">
      <h1 class="app-title" :style="{ color: store.isDarkMode ? '#fff' : store.textColor }">
        调色板生成器
      </h1>
      <p class="app-subtitle" :style="{ color: store.isDarkMode ? '#9ca3af' : '#6b7280' }">
        选择基础色，自动生成和谐的 UI 调色板
      </p>
    </header>

    <section class="picker-section">
      <div class="picker-wrapper">
        <div
          class="color-wheel"
          :style="wheelStyle"
          @mousedown="onWheelDown"
          @click="onWheelClick"
        >
          <div
            class="wheel-pointer"
            :style="{ transform: `rotate(${hue}deg) translateY(-92px)` }"
          >
            <span class="pointer-dot"></span>
          </div>
        </div>

        <div class="controls">
          <div class="control-row">
            <label class="control-label">HEX</label>
            <input
              v-model="hexInput"
              type="text"
              class="hex-input"
              maxlength="7"
              :style="{
                backgroundColor: store.isDarkMode ? '#1f2937' : '#fff',
                color: store.isDarkMode ? '#fff' : '#1f2937',
                borderColor: store.palette.neutral[1].hex
              }"
            />
            <input
              v-model="hexInput"
              type="color"
              class="native-picker"
            />
          </div>

          <div class="control-row">
            <label class="control-label">色相</label>
            <input v-model.number="hue" type="range" min="0" max="360" class="slider hue-slider" />
            <span class="slider-value">{{ hue }}°</span>
          </div>

          <div class="control-row">
            <label class="control-label">饱和度</label>
            <input v-model.number="saturation" type="range" min="0" max="100" class="slider sat-slider" />
            <span class="slider-value">{{ saturation }}%</span>
          </div>

          <div class="control-row">
            <label class="control-label">明度</label>
            <input v-model.number="lightness" type="range" min="0" max="100" class="slider light-slider" />
            <span class="slider-value">{{ lightness }}%</span>
          </div>
        </div>
      </div>
    </section>

    <main class="main-content">
      <div class="content-left">
        <PalettePanel />
      </div>
      <div class="content-right">
        <PreviewCard />
      </div>
    </main>

    <footer class="footer">
      <div class="export-group">
        <button
          class="export-btn"
          :style="{ backgroundColor: store.primary500.hex, color: store.isDarkMode ? '#fff' : '#fff' }"
          @click="copyExport('css')"
        >
          复制 CSS 变量
        </button>
        <button
          class="export-btn export-btn-alt"
          :style="{ borderColor: store.primary500.hex, color: store.primary500.hex }"
          @click="copyExport('scss')"
        >
          复制 SCSS 映射
        </button>
      </div>
      <div class="export-group">
        <button
          class="export-btn export-btn-ghost"
          :style="{ color: store.textColor, borderColor: store.palette.neutral[1].hex }"
          @click="downloadExport('css')"
        >
          下载 .css
        </button>
        <button
          class="export-btn export-btn-ghost"
          :style="{ color: store.textColor, borderColor: store.palette.neutral[1].hex }"
          @click="downloadExport('scss')"
        >
          下载 .scss
        </button>
      </div>
    </footer>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  padding: 32px 24px 48px;
  transition: background-color 0.3s ease;
  position: relative;
}

.export-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  padding: 10px 22px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease, transform 0.2s ease;
  z-index: 9999;
}

.export-toast.visible {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.app-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.app-subtitle {
  margin: 0;
  font-size: 14px;
}

.picker-section {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.picker-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  width: 100%;
  max-width: 520px;
}

.color-wheel {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  position: relative;
  cursor: crosshair;
  transition: transform 0.2s ease;
}

.color-wheel:hover {
  transform: scale(1.03);
}

.wheel-pointer {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.pointer-dot {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid rgba(0, 0, 0, 0.6);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
}

.controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  width: 56px;
  font-size: 13px;
  font-weight: 500;
  color: inherit;
  flex-shrink: 0;
  color: #6b7280;
}

.hex-input {
  flex: 1;
  padding: 8px 12px;
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'SF Mono', Consolas, monospace;
  outline: none;
  transition: border-color 0.2s ease;
}

.hex-input:focus {
  border-color: #3b82f6;
}

.native-picker {
  width: 40px;
  height: 36px;
  border: none;
  padding: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.native-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.native-picker::-webkit-color-swatch {
  border: 1.5px solid #e5e7eb;
  border-radius: 6px;
}

.slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #3b82f6;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #3b82f6;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.hue-slider {
  background: linear-gradient(to right,
    hsl(0, 100%, 50%),
    hsl(60, 100%, 50%),
    hsl(120, 100%, 50%),
    hsl(180, 100%, 50%),
    hsl(240, 100%, 50%),
    hsl(300, 100%, 50%),
    hsl(360, 100%, 50%)
  );
}

.sat-slider {
  background: linear-gradient(to right, hsl(var(--hue, 217), 0%, 50%), hsl(var(--hue, 217), 100%, 50%));
}

.light-slider {
  background: linear-gradient(to right, #000, hsl(var(--hue, 217), var(--sat, 91%), 50%), #fff);
}

.slider-value {
  width: 48px;
  text-align: right;
  font-size: 13px;
  font-family: 'SF Mono', Consolas, monospace;
  color: #6b7280;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto 32px;
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}

.content-left,
.content-right {
  min-width: 0;
}

:deep(.palette-panel),
:deep(.preview-card) {
  height: 100%;
}

.footer {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 24px 0 0;
  border-top: 1px solid rgba(128, 128, 128, 0.15);
}

.export-group {
  display: flex;
  gap: 10px;
}

.export-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
}

.export-btn:hover {
  transform: scale(1.04);
  filter: brightness(1.08);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.export-btn:active {
  transform: scale(0.98);
}

.export-btn-alt {
  background: transparent;
  border: 1.5px solid;
}

.export-btn-ghost {
  background: transparent;
  border: 1.5px solid;
}
</style>
