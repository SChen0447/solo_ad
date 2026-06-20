import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createParticles, updateParticles } from './particleSystem';
import { createUI } from './uiController';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;

const AUTO_ROTATE_SPEED = 0.01;
let autoRotateAngle = 0;
let isUserInteracting = false;
let userInteractionTimer: number | null = null;
const USER_INTERACTION_PAUSE_DURATION = 2000;

let isResettingCamera = false;
let resetCameraStartTime = 0;
const RESET_DURATION = 300;
let resetStartPosition = new THREE.Vector3();
let resetTargetPosition = new THREE.Vector3();
let resetStartTarget = new THREE.Vector3();
let resetTargetTarget = new THREE.Vector3();

const initialCameraPosition = new THREE.Vector3(15, 10, 15);
const initialCameraTarget = new THREE.Vector3(0, 0, 0);

function init(): void {
  const app = document.getElementById('app');
  if (!app) return;
  
  scene = new THREE.Scene();
  
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 512;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d')!;
  const gradient = bgCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, '#1a1a3e');
  gradient.addColorStop(0.5, '#0d0d2b');
  gradient.addColorStop(1, '#050510');
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, 512, 512);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;
  
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.copy(initialCameraPosition);
  camera.lookAt(initialCameraTarget);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050510, 1);
  app.appendChild(renderer.domElement);
  
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.enablePan = true;
  
  controls.addEventListener('start', onUserInteractionStart);
  controls.addEventListener('change', onUserInteraction);
  controls.addEventListener('end', onUserInteractionEnd);
  
  renderer.domElement.addEventListener('wheel', onUserInteraction);
  
  createGroundGrid();
  
  createParticles(scene);
  
  createUI(app, {
    onResetView: resetCameraView
  });
  
  clock = new THREE.Clock();
  
  window.addEventListener('resize', onWindowResize);
  
  animate();
}

function createGroundGrid(): void {
  const gridSize = 20;
  const gridDivisions = 20;
  
  const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x4444aa, 0x333366);
  gridHelper.position.y = -10;
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.15;
  scene.add(gridHelper);
}

function onUserInteractionStart(): void {
  isUserInteracting = true;
  if (userInteractionTimer) {
    clearTimeout(userInteractionTimer);
    userInteractionTimer = null;
  }
}

function onUserInteraction(): void {
  isUserInteracting = true;
  if (userInteractionTimer) {
    clearTimeout(userInteractionTimer);
  }
  userInteractionTimer = window.setTimeout(() => {
    isUserInteracting = false;
    userInteractionTimer = null;
  }, USER_INTERACTION_PAUSE_DURATION);
}

function onUserInteractionEnd(): void {
  if (userInteractionTimer) {
    clearTimeout(userInteractionTimer);
  }
  userInteractionTimer = window.setTimeout(() => {
    isUserInteracting = false;
    userInteractionTimer = null;
  }, USER_INTERACTION_PAUSE_DURATION);
}

function resetCameraView(): void {
  if (isResettingCamera) return;
  
  isResettingCamera = true;
  resetCameraStartTime = performance.now();
  resetStartPosition.copy(camera.position);
  resetTargetPosition.copy(initialCameraPosition);
  resetStartTarget.copy(controls.target);
  resetTargetTarget.copy(initialCameraTarget);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateCameraReset(): void {
  if (!isResettingCamera) return;
  
  const elapsed = performance.now() - resetCameraStartTime;
  const progress = Math.min(elapsed / RESET_DURATION, 1);
  const t = easeInOutCubic(progress);
  
  camera.position.lerpVectors(resetStartPosition, resetTargetPosition, t);
  controls.target.lerpVectors(resetStartTarget, resetTargetTarget, t);
  
  if (progress >= 1) {
    isResettingCamera = false;
    camera.position.copy(initialCameraPosition);
    controls.target.copy(initialCameraTarget);
  }
}

function autoRotateCamera(delta: number): void {
  if (isUserInteracting || isResettingCamera) return;
  
  autoRotateAngle += AUTO_ROTATE_SPEED * delta;
  
  const radius = camera.position.distanceTo(controls.target);
  const height = camera.position.y - controls.target.y;
  
  camera.position.x = controls.target.x + Math.cos(autoRotateAngle) * radius * 0.7;
  camera.position.z = controls.target.z + Math.sin(autoRotateAngle) * radius * 0.7;
  camera.position.y = controls.target.y + height;
  
  camera.lookAt(controls.target);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  updateParticles(delta);
  
  updateCameraReset();
  
  if (!isResettingCamera) {
    autoRotateCamera(delta);
  }
  
  controls.update();
  
  renderer.render(scene, camera);
}

init();
