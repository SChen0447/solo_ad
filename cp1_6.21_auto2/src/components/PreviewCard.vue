<script setup lang="ts">
import { computed } from 'vue'
import { useColorStore } from '@/stores/colorStore'
import { isDarkColor } from '@/colorEngine/colorHarmony'

const store = useColorStore()

const p = computed(() => store.palette.primary)
const n = computed(() => store.palette.neutral)
const f = computed(() => store.palette.functional)

const cardBg = computed(() => store.isDarkMode ? n.value[3].hex : '#ffffff')
const cardText = computed(() => store.isDarkMode ? n.value[0].hex : n.value[3].hex)
const cardBorder = computed(() => store.isDarkMode ? n.value[2].hex : n.value[1].hex)

function textOnBg(bgHex: string): string {
  return isDarkColor(bgHex) ? '#FFFFFF' : '#1F2937'
}
</script>

<template>
  <div class="preview-card" :style="{ '--preview-bg': cardBg, '--preview-text': cardText, '--preview-border': cardBorder }">
    <h3 class="preview-title">组件预览 Preview</h3>

    <div class="preview-grid">
      <div class="preview-column">
        <div class="preview-group">
          <h4 class="group-title">按钮 Buttons</h4>
          <div class="button-row">
            <button class="btn btn-primary" :style="{ backgroundColor: p[2].hex, color: textOnBg(p[2].hex) }">
              Primary
            </button>
            <button class="btn btn-secondary" :style="{ backgroundColor: p[1].hex, color: textOnBg(p[1].hex) }">
              Secondary
            </button>
            <button class="btn btn-outline" :style="{ borderColor: p[2].hex, color: p[2].hex }">
              Outline
            </button>
          </div>
        </div>

        <div class="preview-group">
          <h4 class="group-title">通知横幅 Banners</h4>
          <div class="banner banner-success" :style="{ backgroundColor: f.success.hex + '1A', borderColor: f.success.hex, color: textOnBg(store.isDarkMode ? '#1f2937' : '#ffffff') }">
            <span class="icon icon-check" :style="{ borderColor: f.success.hex }"></span>
            <span class="banner-text" :style="{ color: store.isDarkMode ? f.success.hex : '#1f2937' }">操作成功，数据已保存</span>
          </div>
          <div class="banner banner-warning" :style="{ backgroundColor: f.warning.hex + '1A', borderColor: f.warning.hex }">
            <span class="icon icon-warning" :style="{ backgroundColor: f.warning.hex }"></span>
            <span class="banner-text" :style="{ color: store.isDarkMode ? f.warning.hex : '#1f2937' }">请注意，该操作不可撤销</span>
          </div>
          <div class="banner banner-danger" :style="{ backgroundColor: f.danger.hex + '1A', borderColor: f.danger.hex }">
            <span class="icon icon-cross" :style="{ borderColor: f.danger.hex }"></span>
            <span class="banner-text" :style="{ color: store.isDarkMode ? f.danger.hex : '#1f2937' }">发生错误，请重试</span>
          </div>
        </div>
      </div>

      <div class="preview-column">
        <div class="preview-group">
          <h4 class="group-title">卡片 Card</h4>
          <div
            class="demo-card"
            :style="{
              backgroundColor: cardBg,
              borderColor: cardBorder,
              color: cardText,
              boxShadow: `0 2px 8px ${p[2].hex}14`
            }"
          >
            <div class="demo-card-header" :style="{ borderBottomColor: cardBorder }">
              <div class="avatar" :style="{ backgroundColor: p[2].hex, color: textOnBg(p[2].hex) }">U</div>
              <div>
                <div class="card-title" :style="{ color: cardText }">用户信息卡片</div>
                <div class="card-subtitle" :style="{ color: n[2].hex }">刚刚更新</div>
              </div>
            </div>
            <div class="demo-card-body">
              <p class="card-description" :style="{ color: store.isDarkMode ? n[1].hex : n[3].hex }">
                这是一个基于当前调色板动态着色的卡片组件。边框、阴影、文字颜色均根据主题自动适配。
              </p>
            </div>
            <div class="demo-card-footer" :style="{ borderTopColor: cardBorder }">
              <button class="btn btn-sm" :style="{ backgroundColor: p[2].hex, color: textOnBg(p[2].hex) }">
                确认
              </button>
              <button class="btn btn-sm btn-ghost" :style="{ color: p[2].hex }">
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-card {
  padding: 24px;
  background: var(--panel-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.preview-title {
  margin: 0 0 20px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  letter-spacing: 0.3px;
}

.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .preview-grid {
    grid-template-columns: 1fr;
  }
}

.preview-group {
  margin-bottom: 24px;
}

.preview-group:last-child {
  margin-bottom: 0;
}

.group-title {
  margin: 0 0 12px 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
}

.btn:hover {
  transform: scale(1.04);
  filter: brightness(1.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn:active {
  transform: scale(0.98);
  filter: brightness(0.95);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

.btn-outline {
  background: transparent;
  border: 1.5px solid;
}

.btn-ghost {
  background: transparent;
  border: none;
  padding: 6px 12px;
}

.banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 10px;
  border-left: 4px solid;
  border-radius: 6px;
  font-size: 13px;
}

.banner:last-child {
  margin-bottom: 0;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  position: relative;
}

.icon-check {
  border: 2px solid;
  border-radius: 50%;
}

.icon-check::after {
  content: '';
  position: absolute;
  width: 5px;
  height: 9px;
  border: solid;
  border-width: 0 2px 2px 0;
  border-color: inherit;
  transform: rotate(45deg) translate(-1px, -1px);
}

.icon-warning {
  width: 20px;
  height: 20px;
  clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  position: relative;
}

.icon-warning::after {
  content: '!';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 20%);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.icon-cross {
  position: relative;
  width: 20px;
  height: 20px;
}

.icon-cross::before,
.icon-cross::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 2px;
  background: currentColor;
}

.icon-cross::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.icon-cross::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.banner-text {
  flex: 1;
  font-weight: 500;
}

.demo-card {
  border: 1px solid;
  border-radius: 10px;
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.demo-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
}

.demo-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
  flex-shrink: 0;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 2px 0;
}

.card-subtitle {
  font-size: 12px;
  margin: 0;
}

.demo-card-body {
  padding: 16px;
}

.card-description {
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.demo-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid;
}
</style>
