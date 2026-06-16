<template>
  <div
    class="uploader"
    :class="{ 'uploader--dragging': isDragging, 'uploader--has-image': hasImage }"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="uploader__input"
      @change="handleFileChange"
    />

    <div v-if="!hasImage" class="uploader__placeholder" @click="triggerFileInput">
      <div class="uploader__icon">📸</div>
      <h3 class="uploader__title">上传图片</h3>
      <p class="uploader__hint">点击或拖拽图片到这里</p>
      <p class="uploader__subhint">支持 JPG、PNG、WebP 等格式</p>
    </div>

    <div v-else class="uploader__preview" @click="triggerFileInput">
      <img :src="imageSrc" alt="预览图片" class="uploader__image" />
      <div class="uploader__overlay">
        <span>点击更换图片</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  imageSrc?: string
}>()

const emit = defineEmits<{
  (e: 'upload', file: File): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const hasImage = computed(() => !!props.imageSrc)

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type.startsWith('image/')) {
    emit('upload', file)
  }
}

function handleDragOver() {
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    emit('upload', file)
  }
}
</script>

<style scoped>
.uploader {
  position: relative;
  width: 100%;
  min-height: 300px;
  border: 2px dashed rgba(233, 69, 96, 0.3);
  border-radius: 16px;
  background: #16213e;
  transition: all 0.3s ease;
  overflow: hidden;
  cursor: pointer;
}

.uploader--dragging {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.05);
  transform: scale(1.02);
}

.uploader--has-image {
  border-style: solid;
  border-color: rgba(255, 255, 255, 0.1);
}

.uploader__input {
  display: none;
}

.uploader__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  padding: 32px;
  text-align: center;
}

.uploader__icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.uploader__title {
  font-size: 22px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 8px 0;
}

.uploader__hint {
  font-size: 14px;
  color: #94a3b8;
  margin: 0 0 4px 0;
}

.uploader__subhint {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.uploader__preview {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.uploader__image {
  max-width: 100%;
  max-height: 500px;
  object-fit: contain;
  display: block;
}

.uploader__overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.uploader__preview:hover .uploader__overlay {
  opacity: 1;
}

@media (max-width: 768px) {
  .uploader {
    min-height: 200px;
  }

  .uploader__placeholder {
    height: 200px;
    padding: 20px;
  }

  .uploader__icon {
    font-size: 48px;
  }

  .uploader__title {
    font-size: 18px;
  }

  .uploader__preview {
    min-height: 200px;
  }

  .uploader__image {
    max-height: 300px;
  }
}
</style>
