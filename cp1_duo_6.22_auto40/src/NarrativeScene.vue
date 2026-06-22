<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject, watch } from 'vue'
import { progressKey, type ScrollEngine } from './scroll-engine'
import { useVisualEffects, type AnimationType } from './visual-effects'

interface Props {
  sceneId: string
  sceneIndex: number
  title: string
  subtitle: string
  description: string
  colorStart: string
  colorEnd: string
  particles: Array<{ left: string; top: string; size: number; color: string }>
}

const props = defineProps<Props>()

const engine = inject<ScrollEngine>(progressKey)
const { matrixToStyle, getBackgroundGradient, calculateAnimation } = useVisualEffects()

const sceneRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const subtitleRef = ref<HTMLElement | null>(null)
const descriptionRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLElement | null>(null)
const decorRef = ref<HTMLElement | null>(null)
const particleRefs = ref<HTMLElement[]>([])

const elementIds = computed(() => ({
  title: `${props.sceneId}-title`,
  subtitle: `${props.sceneId}-subtitle`,
  description: `${props.sceneId}-description`,
  image: `${props.sceneId}-image`,
  decor: `${props.sceneId}-decor`,
  particles: props.particles.map((_, i) => `${props.sceneId}-particle-${i}`)
}))

const getElementProgress = (id: string) => {
  return engine?.progressMap.get(id)
}

const getAnimatedStyle = (id: string, type: AnimationType) => {
  const progress = getElementProgress(id)
  const matrix = calculateAnimation(type, progress)
  return matrixToStyle(matrix)
}

const sceneProgress = computed(() => {
  const titleProgress = getElementProgress(elementIds.value.title)
  return titleProgress?.sceneProgress ?? 0
})

const backgroundStyle = computed(() => {
  return {
    background: getBackgroundGradient(props.colorStart, props.colorEnd, sceneProgress.value)
  }
})

const titleStyle = computed(() => getAnimatedStyle(elementIds.value.title, 'title'))
const subtitleStyle = computed(() => getAnimatedStyle(elementIds.value.subtitle, 'slideUp'))
const descriptionStyle = computed(() => getAnimatedStyle(elementIds.value.description, 'slideUp'))
const imageStyle = computed(() => getAnimatedStyle(elementIds.value.image, 'scaleIn'))
const decorStyle = computed(() => getAnimatedStyle(elementIds.value.decor, 'rotateIn'))

const particleStyles = computed(() => {
  return props.particles.map((_, i) => getAnimatedStyle(elementIds.value.particles[i], 'particle'))
})

const setParticleRef = (el: HTMLElement | null, index: number) => {
  if (el) {
    particleRefs.value[index] = el
  }
}

watch(sceneProgress, (newVal) => {
  console.log(`[Scene ${props.sceneIndex}] Progress: ${newVal.toFixed(2)}`)
})

onMounted(() => {
  if (sceneRef.value && engine) {
    engine.registerScene(props.sceneId, sceneRef.value, props.sceneIndex)
  }

  if (titleRef.value && engine) {
    engine.registerElement(elementIds.value.title, titleRef.value, props.sceneId)
  }
  if (subtitleRef.value && engine) {
    engine.registerElement(elementIds.value.subtitle, subtitleRef.value, props.sceneId)
  }
  if (descriptionRef.value && engine) {
    engine.registerElement(elementIds.value.description, descriptionRef.value, props.sceneId)
  }
  if (imageRef.value && engine) {
    engine.registerElement(elementIds.value.image, imageRef.value, props.sceneId)
  }
  if (decorRef.value && engine) {
    engine.registerElement(elementIds.value.decor, decorRef.value, props.sceneId)
  }

  particleRefs.value.forEach((el, index) => {
    if (el && engine) {
      engine.registerElement(elementIds.value.particles[index], el, props.sceneId)
    }
  })
})

onUnmounted(() => {
  if (engine) {
    engine.unregisterScene(props.sceneId)
    engine.unregisterElement(elementIds.value.title)
    engine.unregisterElement(elementIds.value.subtitle)
    engine.unregisterElement(elementIds.value.description)
    engine.unregisterElement(elementIds.value.image)
    engine.unregisterElement(elementIds.value.decor)
    props.particles.forEach((_, index) => {
      engine.unregisterElement(elementIds.value.particles[index])
    })
  }
})
</script>

<template>
  <section :id="sceneId" ref="sceneRef" class="narrative-scene" :style="backgroundStyle">
    <div class="particles-layer">
      <div
        v-for="(particle, index) in particles"
        :key="index"
        :ref="(el) => setParticleRef(el as HTMLElement, index)"
        class="particle"
        :style="{
          left: particle.left,
          top: particle.top,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          backgroundColor: particle.color,
          ...particleStyles[index]
        }"
      ></div>
    </div>

    <div class="scene-content">
      <div class="content-wrapper">
        <h1
          :id="elementIds.title"
          ref="titleRef"
          class="scene-title"
          :style="titleStyle"
        >
          {{ title }}
        </h1>

        <div class="content-row">
          <div class="text-content">
            <h2
              :id="elementIds.subtitle"
              ref="subtitleRef"
              class="scene-subtitle"
              :style="subtitleStyle"
            >
              {{ subtitle }}
            </h2>
            <p
              :id="elementIds.description"
              ref="descriptionRef"
              class="scene-description"
              :style="descriptionStyle"
            >
              {{ description }}
            </p>
          </div>

          <div class="visual-content">
            <div
              :id="elementIds.image"
              ref="imageRef"
              class="image-placeholder"
              :style="{ ...imageStyle, background: `linear-gradient(135deg, ${colorStart} 0%, ${colorEnd} 100%)` }"
            >
              <div class="image-inner"></div>
            </div>

            <div
              :id="elementIds.decor"
              ref="decorRef"
              class="decor-circle"
              :style="{ ...decorStyle, borderColor: colorEnd }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.narrative-scene {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  transition: background 0.8s cubic-bezier(0.25, 0.1, 0.25, 1);
  will-change: background;
}

.particles-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  border-radius: 50%;
  filter: blur(20px);
  will-change: transform, opacity;
}

.scene-content {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 15%;
  z-index: 1;
}

@media (max-width: 1023px) {
  .scene-content {
    padding: 0 8%;
  }
}

@media (max-width: 767px) {
  .scene-content {
    padding: 0 5%;
  }
}

.content-wrapper {
  width: 100%;
  max-width: 1200px;
}

.scene-title {
  font-size: 2rem;
  font-weight: 700;
  color: #f0f0f0;
  margin-bottom: 3rem;
  text-align: center;
  will-change: transform, opacity;
}

@media (max-width: 767px) {
  .scene-title {
    font-size: 1.5rem;
    margin-bottom: 2rem;
  }
}

.content-row {
  display: flex;
  gap: 3rem;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 767px) {
  .content-row {
    flex-direction: column;
    gap: 2rem;
  }
}

.text-content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 767px) {
  .text-content {
    width: 100%;
  }
}

.scene-subtitle {
  font-size: 1.5rem;
  font-weight: 600;
  color: #f0f0f0;
  margin-bottom: 1.5rem;
  will-change: transform, opacity;
}

@media (max-width: 767px) {
  .scene-subtitle {
    font-size: 1.25rem;
  }
}

.scene-description {
  font-size: 1.1rem;
  line-height: 1.8;
  color: #e0e0e0;
  margin: 0;
  will-change: transform, opacity;
}

@media (max-width: 767px) {
  .scene-description {
    font-size: 1rem;
  }
}

.visual-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 300px;
}

@media (max-width: 767px) {
  .visual-content {
    width: 100%;
    min-height: 200px;
  }
}

.image-placeholder {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 16 / 10;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  will-change: transform, opacity;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.image-placeholder::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(255, 255, 255, 0.05) 100%);
}

.image-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60%;
  height: 60%;
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-inner::after {
  content: '📷';
  font-size: 2rem;
  opacity: 0.3;
}

.decor-circle {
  position: absolute;
  width: 80px;
  height: 80px;
  border: 3px solid;
  border-radius: 50%;
  top: -20px;
  right: -20px;
  opacity: 0.3;
  will-change: transform, opacity;
}

@media (max-width: 767px) {
  .decor-circle {
    width: 60px;
    height: 60px;
    top: -10px;
    right: -10px;
  }
}
</style>
