import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createGalaxy, DEFAULT_CONFIG, GalaxyConfig, GalaxyGroup } from './galaxy';
import { createInteraction, updateInteraction, InteractionState } from './interaction';

const FPS_ELEMENT = document.getElementById('fps-counter')!;
const PERF_ELEMENT = document.getElementById('perf-mode')!;

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

let frameCount = 0;
let fpsTime = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  galaxy.update(delta);
  updateInteraction(interaction, delta);

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
