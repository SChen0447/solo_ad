<template>
  <div class="property-panel">
    <div class="panel-header">
      <span class="panel-title">属性面板</span>
    </div>

    <div class="panel-content" v-if="selectedKeyframe">
      <div class="section-title">关键帧属性</div>

      <div class="property-row">
        <label class="property-label">帧序号</label>
        <input
          type="number"
          class="property-input number-input"
          :value="selectedKeyframeFrame"
          @change="onFrameChange"
          min="0"
        />
      </div>

      <div class="property-row">
        <label class="property-label">X 位移</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="-500"
            max="500"
            step="1"
            :value="keyframeProps.x ?? 0"
            @input="onPropertyChange('x', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="keyframeProps.x ?? 0"
            @change="onPropertyInputChange('x', $event)"
          />
        </div>
      </div>

      <div class="property-row">
        <label class="property-label">Y 位移</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="-500"
            max="500"
            step="1"
            :value="keyframeProps.y ?? 0"
            @input="onPropertyChange('y', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="keyframeProps.y ?? 0"
            @change="onPropertyInputChange('y', $event)"
          />
        </div>
      </div>

      <div class="property-row">
        <label class="property-label">旋转</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="-360"
            max="360"
            step="1"
            :value="keyframeProps.rotation ?? 0"
            @input="onPropertyChange('rotation', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="keyframeProps.rotation ?? 0"
            @change="onPropertyInputChange('rotation', $event)"
          />
        </div>
      </div>

      <div class="property-row">
        <label class="property-label">缩放</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="0.1"
            max="3"
            step="0.01"
            :value="keyframeProps.scale ?? 1"
            @input="onPropertyChange('scale', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="keyframeProps.scale ?? 1"
            @change="onPropertyInputChange('scale', $event)"
            step="0.1"
          />
        </div>
      </div>

      <div class="property-row">
        <label class="property-label">不透明度</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="0"
            max="1"
            step="0.01"
            :value="keyframeProps.opacity ?? 1"
            @input="onPropertyChange('opacity', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="keyframeProps.opacity ?? 1"
            @change="onPropertyInputChange('opacity', $event)"
            step="0.1"
            min="0"
            max="1"
          />
        </div>
      </div>

      <div class="property-row">
        <label class="property-label">缓动函数</label>
        <select
          class="property-input select-input"
          :value="selectedKeyframe.easing"
          @change="onEasingChange"
        >
          <option value="linear">线性 (Linear)</option>
          <option value="easeIn">缓入 (Ease In)</option>
          <option value="easeOut">缓出 (Ease Out)</option>
          <option value="easeInOut">缓入缓出 (Ease In Out)</option>
          <option value="easeInCubic">三次缓入</option>
          <option value="easeOutCubic">三次缓出</option>
          <option value="easeInOutCubic">三次缓入缓出</option>
        </select>
      </div>

      <div class="action-buttons">
        <button class="btn btn-danger" @click="onDeleteKeyframe">删除关键帧</button>
      </div>
    </div>

    <div class="panel-content" v-else-if="selectedElement">
      <div class="section-title">元素属性</div>

      <div class="property-row">
        <label class="property-label">名称</label>
        <input
          type="text"
          class="property-input"
          :value="selectedElement.name"
          @change="onElementNameChange"
        />
      </div>

      <div class="property-row">
        <label class="property-label">类型</label>
        <span class="property-value">{{ getElementTypeName(selectedElement.type) }}</span>
      </div>

      <div class="section-title">初始状态</div>

      <div class="property-row">
        <label class="property-label">X 位置</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="-500"
            max="500"
            step="1"
            :value="selectedElement.initialState.x"
            @input="onInitialStateChange('x', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="selectedElement.initialState.x"
            @change="onInitialStateInputChange('x', $event)"
          />
        </div>
      </div>

      <div class="property-row">
        <label class="property-label">Y 位置</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="-500"
            max="500"
            step="1"
            :value="selectedElement.initialState.y"
            @input="onInitialStateChange('y', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="selectedElement.initialState.y"
            @change="onInitialStateInputChange('y', $event)"
          />
        </div>
      </div>

      <div class="property-row">
        <label class="property-label">旋转</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="-360"
            max="360"
            step="1"
            :value="selectedElement.initialState.rotation"
            @input="onInitialStateChange('rotation', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="selectedElement.initialState.rotation"
            @change="onInitialStateInputChange('rotation', $event)"
          />
        </div>
      </div>

      <div class="property-row">
        <label class="property-label">缩放</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="0.1"
            max="3"
            step="0.01"
            :value="selectedElement.initialState.scale"
            @input="onInitialStateChange('scale', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="selectedElement.initialState.scale"
            @change="onInitialStateInputChange('scale', $event)"
            step="0.1"
          />
        </div>
      </div>

      <div class="property-row">
        <label class="property-label">不透明度</label>
        <div class="property-control">
          <input
            type="range"
            class="slider"
            min="0"
            max="1"
            step="0.01"
            :value="selectedElement.initialState.opacity"
            @input="onInitialStateChange('opacity', $event)"
          />
          <input
            type="number"
            class="property-input small"
            :value="selectedElement.initialState.opacity"
            @change="onInitialStateInputChange('opacity', $event)"
            step="0.1"
            min="0"
            max="1"
          />
        </div>
      </div>

      <div class="section-title">样式</div>

      <div class="property-row">
        <label class="property-label">宽度</label>
        <input
          type="number"
          class="property-input number-input"
          :value="selectedElement.style.width"
          @change="onStyleChange('width', $event)"
          min="1"
        />
      </div>

      <div class="property-row">
        <label class="property-label">高度</label>
        <input
          type="number"
          class="property-input number-input"
          :value="selectedElement.style.height"
          @change="onStyleChange('height', $event)"
          min="1"
        />
      </div>

      <div class="property-row">
        <label class="property-label">填充颜色</label>
        <input
          type="color"
          class="property-input color-input"
          :value="selectedElement.style.fill"
          @input="onStyleColorChange('fill', $event)"
        />
      </div>

      <div class="action-buttons">
        <button class="btn btn-primary" @click="onAddKeyframe">添加关键帧</button>
        <button class="btn btn-danger" @click="onDeleteElement">删除元素</button>
      </div>
    </div>

    <div class="panel-empty" v-else>
      <div class="empty-icon">🎬</div>
      <p>选择一个元素或关键帧</p>
      <p class="empty-hint">以编辑其属性</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { timelineManager } from '@/modules/timeline/timelineManager'
import type { KeyframeProperties } from '@/modules/timeline/keyframe'
import type { EasingType } from '@/modules/timeline/keyframe'
import type { ElementType } from '@/modules/render/canvasElement'

const state = timelineManager.getStateSnapshot()

const selectedElement = computed(() => {
  if (!state.selectedElementId.value) return null
  return state.elements.value.find(e => e.id === state.selectedElementId.value) || null
})

const selectedKeyframeFrame = computed(() => state.selectedKeyframeFrame.value)

const selectedKeyframe = computed(() => {
  if (
    !state.selectedKeyframeElementId.value ||
    state.selectedKeyframeFrame.value === null
  ) return null

  const element = state.elements.value.find(
    e => e.id === state.selectedKeyframeElementId.value
  )
  if (!element) return null

  return element.getKeyframeAtFrame(state.selectedKeyframeFrame.value) || null
})

const keyframeProps = computed(() => {
  if (!selectedKeyframe.value) return {}
  return selectedKeyframe.value.properties
})

function onPropertyChange(prop: keyof KeyframeProperties, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)

  if (
    state.selectedKeyframeElementId.value &&
    state.selectedKeyframeFrame.value !== null
  ) {
    timelineManager.updateKeyframeProperties(
      state.selectedKeyframeElementId.value,
      state.selectedKeyframeFrame.value,
      { [prop]: value }
    )
  }
}

function onPropertyInputChange(prop: keyof KeyframeProperties, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)

  if (
    state.selectedKeyframeElementId.value &&
    state.selectedKeyframeFrame.value !== null
  ) {
    timelineManager.updateKeyframeProperties(
      state.selectedKeyframeElementId.value,
      state.selectedKeyframeFrame.value,
      { [prop]: value }
    )
  }
}

function onEasingChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const easing = target.value as EasingType

  if (
    state.selectedKeyframeElementId.value &&
    state.selectedKeyframeFrame.value !== null
  ) {
    timelineManager.updateKeyframeEasing(
      state.selectedKeyframeElementId.value,
      state.selectedKeyframeFrame.value,
      easing
    )
  }
}

function onFrameChange(event: Event) {
  const target = event.target as HTMLInputElement
  const newFrame = parseInt(target.value, 10)

  if (
    state.selectedKeyframeElementId.value &&
    state.selectedKeyframeFrame.value !== null
  ) {
    timelineManager.moveKeyframe(
      state.selectedKeyframeElementId.value,
      state.selectedKeyframeFrame.value,
      newFrame
    )
  }
}

function onDeleteKeyframe() {
  if (
    state.selectedKeyframeElementId.value &&
    state.selectedKeyframeFrame.value !== null
  ) {
    timelineManager.removeKeyframe(
      state.selectedKeyframeElementId.value,
      state.selectedKeyframeFrame.value
    )
  }
}

function onElementNameChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (selectedElement.value) {
    selectedElement.value.name = target.value
  }
}

function onInitialStateChange(prop: keyof KeyframeProperties, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)

  if (selectedElement.value) {
    ;(selectedElement.value.initialState as Record<string, number>)[prop] = value
  }
}

function onInitialStateInputChange(prop: keyof KeyframeProperties, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)

  if (selectedElement.value) {
    ;(selectedElement.value.initialState as Record<string, number>)[prop] = value
  }
}

function onStyleChange(prop: string, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseInt(target.value, 10)

  if (selectedElement.value) {
    ;(selectedElement.value.style as Record<string, number>)[prop] = value
  }
}

function onStyleColorChange(prop: string, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value

  if (selectedElement.value) {
    ;(selectedElement.value.style as Record<string, string>)[prop] = value
  }
}

function onAddKeyframe() {
  if (selectedElement.value) {
    const currentFrame = state.currentFrame.value
    const props = selectedElement.value.getInterpolatedProperties(currentFrame)
    timelineManager.addKeyframe(
      selectedElement.value.id,
      currentFrame,
      {
        x: props.x,
        y: props.y,
        rotation: props.rotation,
        scale: props.scale,
        opacity: props.opacity
      },
      'easeOutCubic'
    )
    timelineManager.selectKeyframe(selectedElement.value.id, currentFrame)
  }
}

function onDeleteElement() {
  if (selectedElement.value) {
    timelineManager.removeElement(selectedElement.value.id)
  }
}

function getElementTypeName(type: ElementType): string {
  const names: Record<ElementType, string> = {
    rectangle: '矩形',
    circle: '圆形',
    text: '文本'
  }
  return names[type] || type
}
</script>

<style scoped>
.property-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-left: 1px solid #2a2a4a;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 13px;
}

.panel-header {
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid #2a2a4a;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(90deg, #00d4ff 0%, #ff00ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: #00d4ff;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 16px 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.section-title:first-child {
  margin-top: 0;
}

.property-row {
  margin-bottom: 12px;
}

.property-label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 6px;
}

.property-control {
  display: flex;
  gap: 8px;
  align-items: center;
}

.slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(90deg, #2a2a4a 0%, #3a3a5a 100%);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00d4ff 0%, #ff00ff 100%);
  cursor: pointer;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
  transition: box-shadow 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 14px rgba(0, 212, 255, 0.9);
}

.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00d4ff 0%, #ff00ff 100%);
  cursor: pointer;
  border: none;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
}

.property-input {
  background: #0f0f1a;
  border: 1px solid #2a2a4a;
  color: #e0e0e0;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.property-input:focus {
  border-color: #00d4ff;
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
}

.property-input.small {
  width: 70px;
  text-align: right;
}

.property-input.number-input {
  width: 100%;
  box-sizing: border-box;
}

.select-input {
  width: 100%;
  cursor: pointer;
}

.color-input {
  width: 100%;
  height: 32px;
  padding: 2px;
  cursor: pointer;
}

.property-value {
  display: block;
  padding: 6px 0;
  color: #00d4ff;
  font-size: 12px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary {
  background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
  color: #fff;
  box-shadow: 0 2px 10px rgba(0, 212, 255, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #00e5ff 0%, #00aadd 100%);
  box-shadow: 0 4px 16px rgba(0, 212, 255, 0.5);
  transform: translateY(-1px);
}

.btn-danger {
  background: linear-gradient(135deg, #ff3366 0%, #cc0033 100%);
  color: #fff;
  box-shadow: 0 2px 10px rgba(255, 51, 102, 0.3);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #ff4477 0%, #dd0044 100%);
  box-shadow: 0 4px 16px rgba(255, 51, 102, 0.5);
  transform: translateY(-1px);
}

.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.panel-empty p {
  margin: 4px 0;
  font-size: 13px;
}

.empty-hint {
  font-size: 11px !important;
  color: #444;
}
</style>
