import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createGalaxy, DEFAULT_CONFIG, GalaxyConfig, GalaxyGroup } from './galaxy';
import { createInteraction, updateInteraction, InteractionState } from './interaction';

const FPS_ELEMENT = document.getElementById('fps-counter')!;
const PERF_ELEMENT = document.getElementById('perf-mode')!;
const TWINKLE_ELEMENT = document.getElementById('twinkle-status')!;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let interaction: InteractionState;
let galaxy: GalaxyGroup;
let clock: THREE.Clock;
let performanceMode = false;
let lowFpsFrames = 0;
const LOW_FPS_THRESHOLD = 30;
const LOW_FPS_TRIGGER_FRAMES = 60;

function init(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(5, 4, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,
    0.4,
    0.1
  );
  composer.addPass(bloomPass);

  interaction = createInteraction(camera, renderer.domElement);
  interaction.onTwinkleToggle = (enabled: boolean) => {
    TWINKLE_ELEMENT.textContent = `Twinkle: ${enabled ? 'ON' : 'OFF'}`;
    if (!enabled) {
      resetTwinkleColors();
    }
  };

  galaxy = createGalaxy(DEFAULT_CONFIG);
  scene.add(galaxy.group);

  clock = new THREE.Clock();

  window.addEventListener('resize', onResize);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function buildPerformanceConfig(): GalaxyConfig {
  return {
    ...DEFAULT_CONFIG,
    coreParticleCount: Math.floor(DEFAULT_CONFIG.coreParticleCount / 2),
    armParticleCount: Math.floor(DEFAULT_CONFIG.armParticleCount / 2),
    dustParticleCountPerSide: Math.floor(DEFAULT_CONFIG.dustParticleCountPerSide / 2),
    bgStarCount: Math.floor(DEFAULT_CONFIG.bgStarCount / 2),
  };
}

function switchToPerformanceMode(): void {
  if (performanceMode) return;
  performanceMode = true;
  PERF_ELEMENT.style.display = 'block';

  scene.remove(galaxy.group);
  galaxy.group.traverse((child) => {
    if (child instanceof THREE.Points) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
  });

  galaxy = createGalaxy(buildPerformanceConfig());
  scene.add(galaxy.group);
}

function updateCoreSizePulse(time: number): void {
  const sizeAttr = galaxy.corePoints.geometry.getAttribute('size') as THREE.BufferAttribute;
  const sizes = sizeAttr.array as Float32Array;
  const baseSizes = galaxy.coreSizePulse.baseSizes;
  const phases = galaxy.coreSizePulse.phases;
  const freqs = galaxy.coreSizePulse.frequencies;
  const amps = galaxy.coreSizePulse.amplitudes;

  for (let i = 0; i < baseSizes.length; i++) {
    const pulse = Math.sin(2 * Math.PI * freqs[i] * time + phases[i]);
    sizes[i] = baseSizes[i] + amps[i] * pulse;
  }
  sizeAttr.needsUpdate = true;
}

function updateTwinkle(time: number): void {
  if (!interaction.twinkleEnabled) return;

  const coreColorAttr = galaxy.corePoints.geometry.getAttribute('color') as THREE.BufferAttribute;
  const coreColors = coreColorAttr.array as Float32Array;
  const coreBase = galaxy.coreTwinkle.baseColors;
  const corePhases = galaxy.coreTwinkle.phases;
  const coreFreqs = galaxy.coreTwinkle.frequencies;
  const coreAmps = galaxy.coreTwinkle.amplitudes;

  for (let i = 0; i < coreBase.length / 3; i++) {
    const phase = corePhases[i];
    const freq = coreFreqs[i];
    const amp = coreAmps[i];
    const twinkle = 1.0 + amp * Math.sin(2 * Math.PI * freq * time + phase);

    const idx = i * 3;
    coreColors[idx] = coreBase[idx] * twinkle;
    coreColors[idx + 1] = coreBase[idx + 1] * twinkle;
    coreColors[idx + 2] = coreBase[idx + 2] * twinkle;
  }
  coreColorAttr.needsUpdate = true;

  const armColorAttr = galaxy.armPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
  const armColors = armColorAttr.array as Float32Array;
  const armBase = galaxy.armTwinkle.baseColors;
  const armPhases = galaxy.armTwinkle.phases;
  const armFreqs = galaxy.armTwinkle.frequencies;
  const armAmps = galaxy.armTwinkle.amplitudes;
  const armMask = galaxy.armTwinkle.mask;

  for (let i = 0; i < armBase.length / 3; i++) {
    if (!armMask[i]) {
      const idx = i * 3;
      armColors[idx] = armBase[idx];
      armColors[idx + 1] = armBase[idx + 1];
      armColors[idx + 2] = armBase[idx + 2];
      continue;
    }

    const phase = armPhases[i];
    const freq = armFreqs[i];
    const amp = armAmps[i];
    const twinkle = 1.0 + amp * Math.sin(2 * Math.PI * freq * time + phase);

    const idx = i * 3;
    armColors[idx] = armBase[idx] * twinkle;
    armColors[idx + 1] = armBase[idx + 1] * twinkle;
    armColors[idx + 2] = armBase[idx + 2] * twinkle;
  }
  armColorAttr.needsUpdate = true;
}

function resetTwinkleColors(): void {
  const coreColorAttr = galaxy.corePoints.geometry.getAttribute('color') as THREE.BufferAttribute;
  const coreColors = coreColorAttr.array as Float32Array;
  const coreBase = galaxy.coreTwinkle.baseColors;
  for (let i = 0; i < coreBase.length; i++) {
    coreColors[i] = coreBase[i];
  }
  coreColorAttr.needsUpdate = true;

  const armColorAttr = galaxy.armPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
  const armColors = armColorAttr.array as Float32Array;
  const armBase = galaxy.armTwinkle.baseColors;
  for (let i = 0; i < armBase.length; i++) {
    armColors[i] = armBase[i];
  }
  armColorAttr.needsUpdate = true;
}

let frameCount = 0;
let fpsTime = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  galaxy.update(delta);
  updateInteraction(interaction, delta);
  updateCoreSizePulse(elapsed);
  updateTwinkle(elapsed);

  composer.render();

  frameCount++;
  fpsTime += delta;
  if (fpsTime >= 0.25) {
    const fps = Math.round(frameCount / fpsTime);
    FPS_ELEMENT.textContent = `FPS: ${fps}`;
    frameCount = 0;
    fpsTime = 0;

    if (fps < LOW_FPS_THRESHOLD) {
      lowFpsFrames += 4;
    } else {
      lowFpsFrames = Math.max(0, lowFpsFrames - 1);
    }

    if (lowFpsFrames > LOW_FPS_TRIGGER_FRAMES) {
      switchToPerformanceMode();
    }
  }
}

init();
animate();
