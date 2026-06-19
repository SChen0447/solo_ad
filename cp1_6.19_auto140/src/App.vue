<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import type { StarParticle } from '@/types/game';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const particles = ref<StarParticle[]>([]);
let animationId: number | null = null;

function generateParticles(count: number = 200): void {
  const newParticles: StarParticle[] = [];
  for (let i = 0; i < count; i++) {
    newParticles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.15 + 0.05,
      opacity: Math.random() * 0.8 + 0.2,
      color: Math.random() > 0.7 ? '#00bbf9' : '#ffffff',
    });
  }
  particles.value = newParticles;
}

function render(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.value.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.opacity;
    ctx.fill();
    ctx.globalAlpha = 1;

    p.x += p.speed;
    p.y += p.speed * 0.2;

    if (p.x > canvas.width) p.x = 0;
    if (p.y > canvas.height) p.y = 0;
  });

  animationId = requestAnimationFrame(render);
}

function resizeCanvas(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

onMounted(() => {
  resizeCanvas();
  generateParticles(200);
  render();
  window.addEventListener('resize', resizeCanvas);
});

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  window.removeEventListener('resize', resizeCanvas);
});
</script>

<template>
  <div class="app-container">
    <canvas ref="canvasRef" class="star-canvas" />
    <div class="content-layer">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.star-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.content-layer {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
