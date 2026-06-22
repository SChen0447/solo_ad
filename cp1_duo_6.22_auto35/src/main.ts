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
let fpsAccumulator = 0;
let lastFpsUpdateTime = performance.now();
let currentFps = 0;
let fpsProtectionCooldown = 0;
const FPS_PROTECTION_INTERVAL = 5000;

function animate(): void {
  const deltaTime = Math.min(clock.getDelta(), 0.1);
  const elapsedTime = clock.elapsedTime;

  frameCount++;
  fpsAccumulator += deltaTime;
  const now = performance.now();

  if (now - lastFpsUpdateTime >= 1000) {
    currentFps = Math.round(frameCount / fpsAccumulator);
    if (fpsValueEl) {
      fpsValueEl.textContent = String(currentFps);
      fpsValueEl.style.color = currentFps >= 45 ? '#4caf50' : currentFps >= 30 ? '#ffc107' : '#f44336';
    }
    if (particleCountEl) {
      particleCountEl.textContent = `粒子: ${particleEngine.getActiveCount()}`;
    }
    frameCount = 0;
    fpsAccumulator = 0;
    lastFpsUpdateTime = now;

    if (currentFps < 30 && fpsProtectionCooldown <= 0 && particleEngine.getActiveCount() > 2000) {
      particleEngine.reduceParticleCount(0.8);
      fpsProtectionCooldown = FPS_PROTECTION_INTERVAL;
      console.warn(`[FPS监控] FPS=${currentFps} < 30，已自动减少粒子数量至 ${particleEngine.getActiveCount()}`);
    }
  }

  if (fpsProtectionCooldown > 0) {
    fpsProtectionCooldown -= 1000;
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
