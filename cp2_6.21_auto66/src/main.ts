import * as THREE from 'three';
import { createTerrain } from './terrain';
import { FishSchool, Turtle, CreatureParams } from './creatures';
import { ControlPanel, ControlParams } from './controls';
import { UIManager } from './ui';

const app = document.getElementById('app');
if (!app) throw new Error('App element not found');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const defaultCameraPosition = new THREE.Vector3(0, 15, 25);
const defaultCameraTarget = new THREE.Vector3(0, 0, 0);
camera.position.copy(defaultCameraPosition);
camera.lookAt(defaultCameraTarget);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
app.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 30, 10);
directionalLight.castShadow = false;
scene.add(directionalLight);

const terrainResult = createTerrain(scene);
const fishSchool = new FishSchool(scene);
const turtle = new Turtle(scene);

let currentParams: ControlParams = {
  waterClarity: 0.5,
  causticsIntensity: 0.6,
  fishActivity: 0.5,
};

const controlPanel = new ControlPanel({
  onParamsChange: (params) => {
    currentParams = params;
    if (scene.fog instanceof THREE.FogExp2) {
      const minFog = 0.005;
      const maxFog = 0.08;
      scene.fog.density = maxFog - (params.waterClarity - 0.1) * ((maxFog - minFog) / 0.9);
      (scene as any).fogDensity = scene.fog.density;
    }
  },
  onResetView: () => {
    animateCamera(defaultCameraPosition, defaultCameraTarget);
  },
  onRandomizeCreatures: () => {
    fishSchool.reset();
    turtle.reset();
  },
});

currentParams = controlPanel.getParams();
if (scene.fog instanceof THREE.FogExp2) {
  const minFog = 0.005;
  const maxFog = 0.08;
  scene.fog.density = maxFog - (currentParams.waterClarity - 0.1) * ((maxFog - minFog) / 0.9);
  (scene as any).fogDensity = scene.fog.density;
}

const uiManager = new UIManager(camera, renderer.domElement);
uiManager.setCreatureCount(fishSchool.getCount() + turtle.getCount());

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraTheta = Math.atan2(
  defaultCameraPosition.x - defaultCameraTarget.x,
  defaultCameraPosition.z - defaultCameraTarget.z
);
let cameraPhi = Math.acos(
  (defaultCameraPosition.y - defaultCameraTarget.y) /
    defaultCameraPosition.distanceTo(defaultCameraTarget)
);
let cameraRadius = defaultCameraPosition.distanceTo(defaultCameraTarget);
const cameraTarget = defaultCameraTarget.clone();

const minRadius = 10;
const maxRadius = 50;
const rotationSpeed = 0.3;

let isAnimatingCamera = false;
let cameraAnimationStart = 0;
let cameraAnimationDuration = 500;
let cameraStartPosition = new THREE.Vector3();
let cameraEndPosition = new THREE.Vector3();
let cameraStartTarget = new THREE.Vector3();
let cameraEndTarget = new THREE.Vector3();

function animateCamera(toPosition: THREE.Vector3, toTarget: THREE.Vector3): void {
  isAnimatingCamera = true;
  cameraAnimationStart = performance.now();
  cameraStartPosition.copy(camera.position);
  cameraEndPosition.copy(toPosition);
  cameraStartTarget.copy(cameraTarget);
  cameraEndTarget.copy(toTarget);

  const dx = toPosition.x - toTarget.x;
  const dz = toPosition.z - toTarget.z;
  cameraTheta = Math.atan2(dx, dz);
  cameraPhi = Math.acos((toPosition.y - toTarget.y) / toPosition.distanceTo(toTarget));
  cameraRadius = toPosition.distanceTo(toTarget);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

renderer.domElement.addEventListener('mousedown', (e) => {
  if (isAnimatingCamera) return;
  isDragging = true;
  previousMousePosition = { x: e.clientX, y: e.clientY };
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging || isAnimatingCamera) return;

  const deltaX = e.clientX - previousMousePosition.x;
  const deltaY = e.clientY - previousMousePosition.y;

  cameraTheta -= deltaX * rotationSpeed * 0.01;
  cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi - deltaY * rotationSpeed * 0.01));

  previousMousePosition = { x: e.clientX, y: e.clientY };
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (isAnimatingCamera) return;

  const zoomSpeed = 0.005;
  cameraRadius = Math.max(
    minRadius,
    Math.min(maxRadius, cameraRadius + e.deltaY * zoomSpeed * cameraRadius)
  );
}, { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();
let frameCount = 0;
let fpsTime = 0;

function updateCameraPosition(): void {
  camera.position.x = cameraTarget.x + cameraRadius * Math.sin(cameraPhi) * Math.sin(cameraTheta);
  camera.position.y = cameraTarget.y + cameraRadius * Math.cos(cameraPhi);
  camera.position.z = cameraTarget.z + cameraRadius * Math.sin(cameraPhi) * Math.cos(cameraTheta);
  camera.lookAt(cameraTarget);
}

function animate(): void {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  frameCount++;
  fpsTime += deltaTime;
  if (fpsTime >= 1) {
    frameCount = 0;
    fpsTime = 0;
  }

  if (isAnimatingCamera) {
    const elapsed = currentTime - cameraAnimationStart;
    if (elapsed >= cameraAnimationDuration) {
      isAnimatingCamera = false;
      camera.position.copy(cameraEndPosition);
      cameraTarget.copy(cameraEndTarget);
    } else {
      const t = easeInOut(elapsed / cameraAnimationDuration);
      camera.position.lerpVectors(cameraStartPosition, cameraEndPosition, t);
      cameraTarget.lerpVectors(cameraStartTarget, cameraEndTarget, t);
    }
    camera.lookAt(cameraTarget);
  } else if (!isDragging) {
    updateCameraPosition();
  }

  const time = currentTime * 0.001;

  terrainResult.updateCaustics(time, currentParams.causticsIntensity);

  const creatureParams: CreatureParams = {
    fishActivity: currentParams.fishActivity,
  };
  fishSchool.update(deltaTime, time, creatureParams);
  turtle.update(deltaTime, time);

  uiManager.update({
    creatureCount: fishSchool.getCount() + turtle.getCount(),
    mouseXZ: null,
  });

  renderer.render(scene, camera);
}

updateCameraPosition();
animate();

console.log(`🌊 海底生态模拟已启动 | FPS目标: 45+ | 生物总数: ${fishSchool.getCount() + turtle.getCount()}`);
