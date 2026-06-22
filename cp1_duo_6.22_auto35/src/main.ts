import * as THREE from 'three';
import { createScene, disposeScene } from './sceneSetup';
import { ParticleEngine } from './particleEngine';

const container = document.getElementById('app') as HTMLElement;
if (!container) {
  throw new Error('Container element #app not found');
}

const fpsValueEl = document.getElementById('fps-value') as HTMLElement;
const particleCountEl = document.getElementById('particle-count') as HTMLElement;

const ctx = createScene(container);
const { scene, camera, renderer, controls, physicsParams } = ctx;

const particleEngine = new ParticleEngine(5000);
particleEngine.initParticles();
scene.add(particleEngine.particles);

const clock = new THREE.Clock();
let frameCount = 0;
let fpsTimeAccumulator = 0;
let lastFpsDisplayTime = performance.now();
let currentFps = 0;
let fpsProtectionCooldownMs = 0;
const FPS_PROTECTION_INTERVAL_MS = 5000;
const FPS_UPDATE_INTERVAL_MS = 1000;

function animate(): void {
  const deltaTime = Math.min(clock.getDelta(), 0.1);

  frameCount++;
  fpsTimeAccumulator += deltaTime;
  const now = performance.now();

  if (now - lastFpsDisplayTime >= FPS_UPDATE_INTERVAL_MS) {
    currentFps = Math.round(frameCount / fpsTimeAccumulator);
    if (fpsValueEl) {
      fpsValueEl.textContent = String(currentFps);
      fpsValueEl.style.color = currentFps >= 45 ? '#4caf50' : currentFps >= 30 ? '#ffc107' : '#f44336';
    }
    if (particleCountEl) {
      particleCountEl.textContent = `粒子: ${particleEngine.getActiveCount()}`;
    }
    frameCount = 0;
    fpsTimeAccumulator = 0;
    lastFpsDisplayTime = now;

    if (currentFps < 30 && fpsProtectionCooldownMs <= 0 && particleEngine.getActiveCount() > 2000) {
      particleEngine.reduceParticleCount(0.8);
      fpsProtectionCooldownMs = FPS_PROTECTION_INTERVAL_MS;
      console.warn(`[FPS监控] FPS=${currentFps} < 30，已自动减少粒子数量至 ${particleEngine.getActiveCount()}`);
    }
  }

  if (fpsProtectionCooldownMs > 0) {
    fpsProtectionCooldownMs -= deltaTime * 1000;
    if (fpsProtectionCooldownMs < 0) fpsProtectionCooldownMs = 0;
  }

  particleEngine.update(deltaTime, physicsParams);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

if (particleCountEl) {
  particleCountEl.textContent = `粒子: ${particleEngine.getActiveCount()}`;
}

window.addEventListener('beforeunload', () => {
  disposeScene(ctx);
  particleEngine.dispose();
});
