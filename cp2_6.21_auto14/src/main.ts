import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createParticles, updateParticles } from './particleSystem';
import { createUI } from './uiController';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let gridHelper: THREE.GridHelper;

let autoRotateEnabled = true;
let userInteracting = false;
let orbitDragging = false;
let orbitDamping = false;
const autoRotateSpeed = 0.01;
let lastInteractionTime = 0;
const interactionResumeDelay = 2000;

let resettingCamera = false;
let resetStartTime = 0;
const resetDuration = 300;
const initialCameraPos = new THREE.Vector3(15, 10, 15);
const initialTarget = new THREE.Vector3(0, 0, 0);
const resetStartPos = new THREE.Vector3();
const resetStartTarget = new THREE.Vector3();

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = createRadialGradientTexture();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(initialCameraPos);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.target.copy(initialTarget);
  controls.update();

  setupInteractionListeners();
  setupOrbitControlsListeners();

  gridHelper = new THREE.GridHelper(20, 20, 0x404080, 0x303060);
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.15;
  gridHelper.position.y = -10;
  scene.add(gridHelper);

  createParticles(scene);

  createUI({
    onResetCamera: resetCamera
  });

  window.addEventListener('resize', onWindowResize);

  animate();
}

function createRadialGradientTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createRadialGradient(
    256, 256, 50,
    256, 256, 300
  );
  gradient.addColorStop(0, '#0A0A2A');
  gradient.addColorStop(0.5, '#080820');
  gradient.addColorStop(1, '#020208');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function markInteraction(): void {
  userInteracting = true;
  autoRotateEnabled = false;
  lastInteractionTime = performance.now();
}

function endInteraction(): void {
  userInteracting = false;
  lastInteractionTime = performance.now();
}

function setupInteractionListeners(): void {
  const dom = renderer.domElement;

  dom.addEventListener('mousedown', () => {
    markInteraction();
  });

  dom.addEventListener('touchstart', () => {
    markInteraction();
  }, { passive: true });

  document.addEventListener('mouseup', () => {
    endInteraction();
  });

  document.addEventListener('touchend', () => {
    endInteraction();
  });

  dom.addEventListener('wheel', () => {
    markInteraction();
  }, { passive: true });

  dom.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
}

function setupOrbitControlsListeners(): void {
  controls.addEventListener('start', () => {
    orbitDragging = true;
    orbitDamping = true;
    markInteraction();
  });

  controls.addEventListener('change', () => {
    if (orbitDragging) {
      markInteraction();
    }
  });

  controls.addEventListener('end', () => {
    orbitDragging = false;
    endInteraction();
  });
}

function resetCamera(): void {
  if (resettingCamera) return;
  
  resettingCamera = true;
  resetStartTime = performance.now();
  resetStartPos.copy(camera.position);
  resetStartTarget.copy(controls.target);
  orbitDragging = false;
  orbitDamping = false;
}

function updateResetCamera(_deltaMs: number): void {
  if (!resettingCamera) return;

  const elapsed = performance.now() - resetStartTime;
  const t = Math.min(1, elapsed / resetDuration);
  
  const eased = easeInOutCubic(t);
  
  camera.position.lerpVectors(resetStartPos, initialCameraPos, eased);
  controls.target.lerpVectors(resetStartTarget, initialTarget, eased);
  controls.update();

  if (t >= 1) {
    resettingCamera = false;
    orbitDamping = false;
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateAutoRotate(delta: number): void {
  if (resettingCamera) return;
  
  if (orbitDragging || userInteracting) {
    return;
  }

  if (!autoRotateEnabled) {
    const now = performance.now();
    if (now - lastInteractionTime > interactionResumeDelay) {
      autoRotateEnabled = true;
    } else {
      return;
    }
  }

  const angle = autoRotateSpeed * delta;
  const radius = camera.position.distanceTo(controls.target);
  const currentAngle = Math.atan2(
    camera.position.x - controls.target.x,
    camera.position.z - controls.target.z
  );
  const newAngle = currentAngle + angle;
  
  camera.position.x = controls.target.x + Math.sin(newAngle) * radius;
  camera.position.z = controls.target.z + Math.cos(newAngle) * radius;
  camera.lookAt(controls.target);
}

let lastTime = performance.now();

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  updateResetCamera(delta * 1000);
  
  if (!resettingCamera) {
    controls.update();
  }

  updateAutoRotate(delta);
  updateParticles(delta);

  renderer.render(scene, camera);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init();
