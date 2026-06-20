import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { ControlPanel } from './controlPanel';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let particleSystem: ParticleSystem;

let yaw = 0;
let pitch = 0;
let targetYaw = 0;
let targetPitch = 0;
let targetDistance = 10;
let currentDistance = 10;

const SENSITIVITY = 0.5 * (Math.PI / 180);
const MIN_PITCH = -Math.PI / 2;
const MAX_PITCH = Math.PI / 2;
const MIN_DISTANCE = 0.5;
const MAX_DISTANCE = 15;
const ZOOM_STEP = 0.1;
const ZOOM_SMOOTH = 0.1;
const ROTATION_SMOOTH = 0.1;

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

let starPoints: THREE.Points;
const STAR_COUNT = 800;

declare module 'three' {
  interface PointsMaterial {
    _baseOpacities?: Float32Array;
    _opacities?: Float32Array;
  }
}

function initStars(): void {
  const starCanvas = document.createElement('canvas');
  starCanvas.width = 512;
  starCanvas.height = 512;
  const starCtx = starCanvas.getContext('2d')!;
  starCtx.fillStyle = '#fff';
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const a = 0.1 + Math.random() * 0.2;
    starCtx.globalAlpha = a;
    starCtx.fillRect(x, y, 1, 1);
  }
  starCtx.globalAlpha = 1;

  const starTexture = new THREE.CanvasTexture(starCanvas);
  starTexture.wrapS = THREE.RepeatWrapping;
  starTexture.wrapT = THREE.RepeatWrapping;
  starTexture.repeat.set(4, 4);

  const starGeo = new THREE.PlaneGeometry(200, 200);
  const starMat = new THREE.MeshBasicMaterial({
    map: starTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const starMesh = new THREE.Mesh(starGeo, starMat);
  starMesh.position.z = -80;
  scene.add(starMesh);

  const bgPositions = new Float32Array(STAR_COUNT * 3);
  const bgColors = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    bgPositions[i * 3] = (Math.random() - 0.5) * 100;
    bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
    bgPositions[i * 3 + 2] = -50 - Math.random() * 50;
    bgColors[i * 3] = 1;
    bgColors[i * 3 + 1] = 1;
    bgColors[i * 3 + 2] = 1;
  }
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
  bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));

  const bgStarCanvas = document.createElement('canvas');
  bgStarCanvas.width = 8;
  bgStarCanvas.height = 8;
  const bgCtx = bgStarCanvas.getContext('2d')!;
  const grad = bgCtx.createRadialGradient(4, 4, 0, 4, 4, 4);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, 8, 8);
  const bgStarTex = new THREE.CanvasTexture(bgStarCanvas);

  const bgStarMat = new THREE.PointsMaterial({
    size: 0.5,
    map: bgStarTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    sizeAttenuation: true,
  });
  bgStarMat._baseOpacities = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    bgStarMat._baseOpacities[i] = 0.1 + Math.random() * 0.2;
  }
  bgStarMat._opacities = new Float32Array(STAR_COUNT);
  starPoints = new THREE.Points(bgGeo, bgStarMat);
  scene.add(starPoints);
}

function updateStars(): void {
  if (!starPoints) return;
  const mat = starPoints.material as THREE.PointsMaterial;
  const base = mat._baseOpacities as Float32Array;
  const opacs = mat._opacities as Float32Array;
  const colorAttr = starPoints.geometry.getAttribute('color') as THREE.BufferAttribute;
  const colors = colorAttr.array as Float32Array;
  for (let i = 0; i < STAR_COUNT; i++) {
    if (Math.random() < 0.05) {
      opacs[i] = base[i] + Math.random() * 0.5;
    } else {
      opacs[i] = base[i];
    }
    const o = opacs[i];
    colors[i * 3] = o;
    colors[i * 3 + 1] = o;
    colors[i * 3 + 2] = o;
  }
  colorAttr.needsUpdate = true;
}

function init(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  initStars();

  const maxParticles = window.innerWidth < 768 ? 3000 : 5000;
  particleSystem = new ParticleSystem(maxParticles);
  scene.add(particleSystem.group);

  void new ControlPanel(particleSystem);

  renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);

  window.addEventListener('resize', onResize);
}

function onMouseDown(e: MouseEvent): void {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging) return;
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  targetYaw -= dx * SENSITIVITY;
  targetPitch -= dy * SENSITIVITY;
  targetPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, targetPitch));
}

function onMouseUp(): void {
  isDragging = false;
}

function onTouchStart(e: TouchEvent): void {
  if (e.touches.length === 1) {
    isDragging = true;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
  }
  e.preventDefault();
}

function onTouchMove(e: TouchEvent): void {
  if (!isDragging || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - lastMouseX;
  const dy = e.touches[0].clientY - lastMouseY;
  lastMouseX = e.touches[0].clientX;
  lastMouseY = e.touches[0].clientY;

  targetYaw -= dx * SENSITIVITY;
  targetPitch -= dy * SENSITIVITY;
  targetPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, targetPitch));
  e.preventDefault();
}

function onTouchEnd(): void {
  isDragging = false;
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  if (e.deltaY > 0) {
    targetDistance = Math.min(MAX_DISTANCE, targetDistance + ZOOM_STEP * 10);
  } else {
    targetDistance = Math.max(MIN_DISTANCE, targetDistance - ZOOM_STEP * 10);
  }
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateCamera(): void {
  yaw += (targetYaw - yaw) * ROTATION_SMOOTH;
  pitch += (targetPitch - pitch) * ROTATION_SMOOTH;
  currentDistance += (targetDistance - currentDistance) * ZOOM_SMOOTH;

  const cosPitch = Math.cos(pitch);
  const x = currentDistance * cosPitch * Math.sin(yaw);
  const y = currentDistance * Math.sin(pitch);
  const z = currentDistance * cosPitch * Math.cos(yaw);

  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}

function animate(): void {
  requestAnimationFrame(animate);

  updateCamera();
  particleSystem.update();
  updateStars();

  renderer.render(scene, camera);
}

init();
animate();
