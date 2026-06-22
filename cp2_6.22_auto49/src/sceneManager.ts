import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlantData, Season, SEASON_LIGHT_COLORS, SEASON_AMBIENT_INTENSITY } from './plantLibrary';
import {
  createPlant,
  updatePlantSeason,
  createGroundShadow,
  createSelectionRing,
  createSnowPlane,
  createFallingLeavesParticle,
  updateFallingLeaves,
  animateSeasonTransition,
  getPlantColorHex,
} from './plantFactory';

export interface PlantedInstance {
  id: string;
  data: PlantData;
  group: THREE.Group;
  shadow: THREE.Mesh;
  position: THREE.Vector3;
  rotationY: number;
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let ground: THREE.Mesh;
let ambientLight: THREE.AmbientLight;
let directionalLight: THREE.DirectionalLight;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

let plantedInstances: PlantedInstance[] = [];
let nextInstanceId = 0;
let currentSeason: Season = 'spring';

let selectedInstance: PlantedInstance | null = null;
let selectionRing: THREE.Mesh | null = null;

let snowPlane: THREE.Mesh | null = null;
let fallingLeaves: THREE.Points | null = null;

let seasonAnimations: {
  update: (t: number) => void;
  isComplete: (t: number) => boolean;
}[] = [];

let onPlantSelected: ((instance: PlantedInstance | null) => void) | null = null;
let onPlantAdded: ((instance: PlantedInstance) => void) | null = null;
let onPlantRemoved: ((instanceId: string) => void) | null = null;

const GROUND_SIZE = 25;
const GROUND_COLOR = 0x4CAF50;

export function initScene(container: HTMLElement): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 30, 60);

  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
  camera.position.set(8, 6, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.5;
  controls.maxDistance = 5.0 * 8;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.target.set(0, 0, 0);

  ambientLight = new THREE.AmbientLight(0xffffff, SEASON_AMBIENT_INTENSITY[currentSeason]);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 15, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -15;
  directionalLight.shadow.camera.right = 15;
  directionalLight.shadow.camera.top = 15;
  directionalLight.shadow.camera.bottom = -15;
  scene.add(directionalLight);

  const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  const groundMat = new THREE.MeshLambertMaterial({ color: GROUND_COLOR });
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(GROUND_SIZE, 25, 0x388E3C, 0x388E3C);
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.15;
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  applySeasonLighting(currentSeason, true);

  window.addEventListener('resize', () => onResize(container));
}

function onResize(container: HTMLElement): void {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

export function addPlant(data: PlantData, position: THREE.Vector3): PlantedInstance {
  const group = createPlant(data, currentSeason);
  const rotationY = Math.random() * Math.PI * 2;
  group.rotation.y = rotationY;
  group.position.copy(position);
  scene.add(group);

  const shadow = createGroundShadow(data.crownRange);
  shadow.position.copy(position);
  shadow.position.y = 0.01;
  scene.add(shadow);

  const id = `plant_${nextInstanceId++}`;
  const instance: PlantedInstance = {
    id,
    data,
    group,
    shadow,
    position: position.clone(),
    rotationY,
  };
  group.userData.instanceId = id;
  plantedInstances.push(instance);

  if (onPlantAdded) onPlantAdded(instance);

  return instance;
}

export function removePlant(instanceId: string): void {
  const idx = plantedInstances.findIndex((p) => p.id === instanceId);
  if (idx === -1) return;

  const instance = plantedInstances[idx];

  if (selectedInstance && selectedInstance.id === instanceId) {
    deselectPlant();
  }

  scene.remove(instance.group);
  scene.remove(instance.shadow);

  instance.group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
  });
  instance.shadow.geometry.dispose();
  (instance.shadow.material as THREE.Material).dispose();

  plantedInstances.splice(idx, 1);

  if (onPlantRemoved) onPlantRemoved(instanceId);
}

export function setSeason(season: Season, animated: boolean = true): void {
  if (season === currentSeason) return;

  const prevSeason = currentSeason;
  currentSeason = season;

  seasonAnimations = [];

  if (animated) {
    plantedInstances.forEach((instance) => {
      const anim = animateSeasonTransition(instance.group, prevSeason, season, 2000);
      seasonAnimations.push(anim);
    });

    animateLightingTransition(prevSeason, season, 2000);
  } else {
    plantedInstances.forEach((instance) => {
      updatePlantSeason(instance.group, season);
      instance.group.userData.currentSeason = season;
    });
    applySeasonLighting(season, true);
  }

  updateSeasonEffects(season);
}

function animateLightingTransition(from: Season, to: Season, duration: number): void {
  const fromColor = new THREE.Color(...SEASON_LIGHT_COLORS[from]);
  const toColor = new THREE.Color(...SEASON_LIGHT_COLORS[to]);
  const fromIntensity = SEASON_AMBIENT_INTENSITY[from];
  const toIntensity = SEASON_AMBIENT_INTENSITY[to];
  const startTime = performance.now();

  function update() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    ambientLight.color.copy(fromColor).lerp(toColor, eased);
    ambientLight.intensity = fromIntensity + (toIntensity - fromIntensity) * eased;

    if (t < 1) requestAnimationFrame(update);
  }
  update();
}

function applySeasonLighting(season: Season, immediate: boolean = false): void {
  const lc = SEASON_LIGHT_COLORS[season];
  ambientLight.color.setRGB(lc[0], lc[1], lc[2]);
  ambientLight.intensity = SEASON_AMBIENT_INTENSITY[season];
}

function updateSeasonEffects(season: Season): void {
  if (snowPlane) {
    scene.remove(snowPlane);
    snowPlane.geometry.dispose();
    (snowPlane.material as THREE.Material).dispose();
    snowPlane = null;
  }
  if (fallingLeaves) {
    scene.remove(fallingLeaves);
    fallingLeaves.geometry.dispose();
    (fallingLeaves.material as THREE.Material).dispose();
    fallingLeaves = null;
  }

  if (season === 'winter') {
    snowPlane = createSnowPlane();
    scene.add(snowPlane);
  } else if (season === 'autumn') {
    fallingLeaves = createFallingLeavesParticle();
    scene.add(fallingLeaves);
  }
}

export function selectPlant(instance: PlantedInstance): void {
  deselectPlant();

  selectedInstance = instance;
  selectionRing = createSelectionRing(instance.data.crownRange);
  selectionRing.position.copy(instance.position);
  selectionRing.position.y = 0.15;
  scene.add(selectionRing);

  if (onPlantSelected) onPlantSelected(instance);
}

export function deselectPlant(): void {
  if (selectionRing) {
    scene.remove(selectionRing);
    selectionRing.geometry.dispose();
    (selectionRing.material as THREE.Material).dispose();
    selectionRing = null;
  }
  selectedInstance = null;
  if (onPlantSelected) onPlantSelected(null);
}

export function getPlantedInstances(): PlantedInstance[] {
  return plantedInstances;
}

export function getCurrentSeason(): Season {
  return currentSeason;
}

export function getScene(): THREE.Scene {
  return scene;
}

export function getCamera(): THREE.PerspectiveCamera {
  return camera;
}

export function getRenderer(): THREE.WebGLRenderer {
  return renderer;
}

export function getControls(): OrbitControls {
  return controls;
}

export function getRaycaster(): THREE.Raycaster {
  return raycaster;
}

export function getGround(): THREE.Mesh {
  return ground;
}

export function getSelectedInstance(): PlantedInstance | null {
  return selectedInstance;
}

export function setOnPlantSelected(cb: (instance: PlantedInstance | null) => void): void {
  onPlantSelected = cb;
}

export function setOnPlantAdded(cb: (instance: PlantedInstance) => void): void {
  onPlantAdded = cb;
}

export function setOnPlantRemoved(cb: (instanceId: string) => void): void {
  onPlantRemoved = cb;
}

export function findPlantInstanceAtClick(event: MouseEvent, container: HTMLElement): PlantedInstance | null {
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  for (const instance of plantedInstances) {
    const meshes: THREE.Mesh[] = [];
    instance.group.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) return instance;
  }

  return null;
}

export function getGroundIntersection(event: MouseEvent, container: HTMLElement): THREE.Vector3 | null {
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(ground, false);
  if (intersects.length > 0) {
    return intersects[0].point.clone();
  }
  return null;
}

export function renderLoop(): void {
  requestAnimationFrame(renderLoop);

  const now = performance.now();

  seasonAnimations = seasonAnimations.filter((anim) => {
    anim.update(now);
    return !anim.isComplete(now);
  });

  if (selectionRing && selectedInstance) {
    selectionRing.rotation.z += (Math.PI * 2) / (3 * 60);
    selectionRing.position.copy(selectedInstance.position);
    selectionRing.position.y = 0.15;
  }

  if (fallingLeaves) {
    updateFallingLeaves(fallingLeaves);
  }

  controls.update();
  renderer.render(scene, camera);
}

export function captureScreenshot(width: number = 1920, height: number = 1080): string {
  const prevW = renderer.domElement.width;
  const prevH = renderer.domElement.height;

  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const prevBg = scene.background;
  scene.background = new THREE.Color(0x87CEEB);
  renderer.render(scene, camera);

  const dataUrl = renderer.domElement.toDataURL('image/png');

  renderer.setSize(prevW, prevH);
  camera.aspect = prevW / prevH;
  camera.updateProjectionMatrix();
  scene.background = prevBg;

  return dataUrl;
}

export function captureSnapshot(): string {
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL('image/jpeg', 0.6);
}

export function saveCameraState(): { position: THREE.Vector3; target: THREE.Vector3 } {
  return {
    position: camera.position.clone(),
    target: controls.target.clone(),
  };
}

export function restoreCameraState(state: { position: THREE.Vector3; target: THREE.Vector3 }, duration: number = 500): void {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();

  function animate() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    camera.position.lerpVectors(startPos, state.position, eased);
    controls.target.lerpVectors(startTarget, state.target, eased);
    controls.update();

    if (t < 1) requestAnimationFrame(animate);
  }
  animate();
}
