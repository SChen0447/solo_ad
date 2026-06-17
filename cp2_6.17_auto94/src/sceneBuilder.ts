import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SceneObject, SceneData } from './textParser';

interface MeshWithData extends THREE.Mesh {
  userData: {
    sceneObject: SceneObject;
    isGlow?: boolean;
  };
}

interface AnimationState {
  active: boolean;
  startTime: number;
  duration: number;
  startY: number;
  targetY: number;
  bouncePeak: number;
}

interface PositionAnimationState {
  active: boolean;
  startTime: number;
  duration: number;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
}

interface ColorAnimationState {
  active: boolean;
  startTime: number;
  duration: number;
  startColor: THREE.Color;
  targetColor: THREE.Color;
}

interface ObjectEntry {
  data: SceneObject;
  mainMesh: MeshWithData;
  glowMesh: MeshWithData | null;
  dropAnimation: AnimationState | null;
  moveAnimation: PositionAnimationState | null;
  colorAnimation: ColorAnimationState | null;
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let container: HTMLElement;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let objects: ObjectEntry[] = [];
let selectedObject: ObjectEntry | null = null;
let onObjectSelectCallback: ((obj: SceneObject | null) => void) | null = null;
let animationFrameId: number;
let clock: THREE.Clock;
let fpsCounter: HTMLElement | null = null;
let frameCount = 0;
let lastFpsUpdate = 0;
let fireflyAnimationTime = 0;

const GRID_SIZE = 8;
const GROUND_Y = 0;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getObjectHeight(data: SceneObject): number {
  switch (data.type) {
    case 'tree': return 1.8 * data.scale.y;
    case 'bigTree': return 4 * data.scale.y;
    case 'firefly': return 0.1 * data.scale.y + 2;
    case 'rock': return 0.6 * data.scale.y;
    case 'house': return 2 * data.scale.y;
    case 'mountain': return 4 * data.scale.y;
    case 'river': return 0.1 * data.scale.y;
    case 'cloud': return 0.8 * data.scale.y + 5;
    case 'pillar': return 3 * data.scale.y;
    case 'sphere': return 0.5 * data.scale.y;
    case 'cube': return 0.8 * data.scale.y;
    case 'cylinder': return 1.5 * data.scale.y;
    case 'cone': return 1.5 * data.scale.y;
    default: return 1;
  }
}

function getGroundY(data: SceneObject): number {
  if (data.type === 'firefly') return 2;
  if (data.type === 'cloud') return 5;
  if (data.type === 'river') return 0.05;
  return GROUND_Y + getObjectHeight(data) / 2;
}

function createGeometry(type: SceneObject['type']): THREE.BufferGeometry {
  switch (type) {
    case 'tree': {
      const group = new THREE.Group();
      const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8);
      const trunk = new THREE.Mesh(trunkGeo);
      trunk.position.y = -0.5;
      trunk.castShadow = true;
      group.add(trunk);

      const leafGeo1 = new THREE.ConeGeometry(0.6, 1.2, 8);
      const leaf1 = new THREE.Mesh(leafGeo1);
      leaf1.position.y = 0.2;
      leaf1.castShadow = true;
      group.add(leaf1);

      const leafGeo2 = new THREE.ConeGeometry(0.45, 0.9, 8);
      const leaf2 = new THREE.Mesh(leafGeo2);
      leaf2.position.y = 0.9;
      leaf2.castShadow = true;
      group.add(leaf2);

      return new THREE.BufferGeometry().setFromObject(group);
    }
    case 'bigTree': {
      const group = new THREE.Group();
      const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 2, 12);
      const trunk = new THREE.Mesh(trunkGeo);
      trunk.position.y = -1;
      trunk.castShadow = true;
      group.add(trunk);

      const leafGeo1 = new THREE.SphereGeometry(1.5, 12, 8);
      const leaf1 = new THREE.Mesh(leafGeo1);
      leaf1.position.y = 0.5;
      leaf1.castShadow = true;
      group.add(leaf1);

      const leafGeo2 = new THREE.SphereGeometry(1.2, 12, 8);
      const leaf2 = new THREE.Mesh(leafGeo2);
      leaf2.position.set(1, 1, 0.5);
      leaf2.castShadow = true;
      group.add(leaf2);

      const leafGeo3 = new THREE.SphereGeometry(1.2, 12, 8);
      const leaf3 = new THREE.Mesh(leafGeo3);
      leaf3.position.set(-0.8, 1.2, -0.6);
      leaf3.castShadow = true;
      group.add(leaf3);

      return new THREE.BufferGeometry().setFromObject(group);
    }
    case 'firefly':
      return new THREE.SphereGeometry(0.1, 8, 8);
    case 'rock': {
      const group = new THREE.Group();
      const rockGeo1 = new THREE.DodecahedronGeometry(0.5, 0);
      const rock1 = new THREE.Mesh(rockGeo1);
      rock1.scale.set(1, 0.7, 0.9);
      rock1.position.y = -0.1;
      rock1.rotation.set(0.2, 0.3, 0.1);
      rock1.castShadow = true;
      group.add(rock1);
      return new THREE.BufferGeometry().setFromObject(group);
    }
    case 'house': {
      const group = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(1.5, 1.2, 1.5);
      const body = new THREE.Mesh(bodyGeo);
      body.position.y = -0.4;
      body.castShadow = true;
      group.add(body);

      const roofGeo = new THREE.ConeGeometry(1.06, 0.8, 4);
      const roof = new THREE.Mesh(roofGeo);
      roof.position.y = 0.6;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);

      const doorGeo = new THREE.BoxGeometry(0.4, 0.6, 0.05);
      const door = new THREE.Mesh(doorGeo);
      door.position.set(0, -0.5, 0.76);
      group.add(door);

      return new THREE.BufferGeometry().setFromObject(group);
    }
    case 'mountain': {
      const group = new THREE.Group();
      const mountainGeo = new THREE.ConeGeometry(2, 3, 8);
      const mountain = new THREE.Mesh(mountainGeo);
      mountain.position.y = -0.5;
      mountain.castShadow = true;
      group.add(mountain);

      const snowGeo = new THREE.TorusGeometry(0.8, 0.15, 8, 16);
      const snow = new THREE.Mesh(snowGeo);
      snow.position.y = 1.5;
      snow.rotation.x = Math.PI / 2;
      group.add(snow);

      return new THREE.BufferGeometry().setFromObject(group);
    }
    case 'river':
      return new THREE.BoxGeometry(6, 0.1, 1.5);
    case 'cloud': {
      const group = new THREE.Group();
      const cloudGeo1 = new THREE.SphereGeometry(0.6, 8, 6);
      const cloud1 = new THREE.Mesh(cloudGeo1);
      cloud1.scale.set(1.5, 0.6, 1);
      group.add(cloud1);

      const cloudGeo2 = new THREE.SphereGeometry(0.5, 8, 6);
      const cloud2 = new THREE.Mesh(cloudGeo2);
      cloud2.position.set(0.7, 0.1, 0);
      cloud2.scale.set(1.2, 0.5, 0.9);
      group.add(cloud2);

      const cloudGeo3 = new THREE.SphereGeometry(0.45, 8, 6);
      const cloud3 = new THREE.Mesh(cloudGeo3);
      cloud3.position.set(-0.6, 0.05, 0);
      cloud3.scale.set(1.1, 0.45, 0.85);
      group.add(cloud3);

      return new THREE.BufferGeometry().setFromObject(group);
    }
    case 'pillar':
      return new THREE.CylinderGeometry(0.25, 0.3, 3, 12);
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 16, 12);
    case 'cube':
      return new THREE.BoxGeometry(0.8, 0.8, 0.8);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.4, 0.4, 1.5, 16);
    case 'cone':
      return new THREE.ConeGeometry(0.6, 1.5, 12);
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

function createMaterial(data: SceneObject): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(data.color),
    metalness: data.type === 'river' ? 0.3 : 0.1,
    roughness: data.type === 'river' ? 0.2 : 0.8,
    transparent: data.type === 'cloud' || data.type === 'firefly',
    opacity: data.type === 'cloud' ? 0.7 : data.type === 'firefly' ? 0.9 : 1
  });

  if (data.emissive && data.emissiveIntensity) {
    material.emissive = new THREE.Color(data.emissive);
    material.emissiveIntensity = data.emissiveIntensity;
  }

  return material;
}

function createGlowMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x00aaff,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide
  });
}

export function init(containerEl: HTMLElement): void {
  container = containerEl;
  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  const distance = 12;
  const angle = Math.PI / 4;
  camera.position.set(
    distance * Math.cos(angle),
    distance * Math.sin(angle),
    distance * Math.cos(angle)
  );
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 3;
  controls.maxDistance = 20;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.set(0, 0, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
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

  const fillLight = new THREE.DirectionalLight(0x00aaff, 0.3);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, 0x555555, 0x555555);
  gridHelper.position.y = GROUND_Y;
  scene.add(gridHelper);

  const groundGeo = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  scene.add(ground);

  fpsCounter = document.getElementById('fpsCounter');

  renderer.domElement.addEventListener('click', onMouseClick);
  window.addEventListener('resize', onWindowResize);

  animate();
}

function onWindowResize(): void {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function onMouseClick(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const meshes = objects.map(o => o.mainMesh).filter(m => !m.userData.isGlow);
  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    const clickedMesh = intersects[0].object as MeshWithData;
    const entry = objects.find(o => o.mainMesh === clickedMesh);
    if (entry) {
      selectObject(entry);
    }
  } else {
    selectObject(null);
  }
}

function selectObject(entry: ObjectEntry | null): void {
  if (selectedObject && selectedObject.glowMesh) {
    selectedObject.glowMesh.visible = false;
  }

  selectedObject = entry;

  if (selectedObject) {
    if (selectedObject.glowMesh) {
      selectedObject.glowMesh.visible = true;
    }
    onObjectSelectCallback?.(selectedObject.data);
  } else {
    onObjectSelectCallback?.(null);
  }
}

function createObjectEntry(data: SceneObject, index: number): ObjectEntry {
  const geometry = createGeometry(data.type);
  const material = createMaterial(data);

  const mainMesh = new THREE.Mesh(geometry, material) as MeshWithData;
  mainMesh.castShadow = true;
  mainMesh.receiveShadow = true;
  mainMesh.userData.sceneObject = data;

  const glowGeo = geometry.clone();
  glowGeo.scale(1.15, 1.15, 1.15);
  const glowMat = createGlowMaterial();
  const glowMesh = new THREE.Mesh(glowGeo, glowMat) as MeshWithData;
  glowMesh.userData.isGlow = true;
  glowMesh.visible = false;

  mainMesh.add(glowMesh);

  const dropHeight = 8 + index * 0.3;
  const targetY = getGroundY(data);

  mainMesh.position.set(data.position.x, dropHeight, data.position.z);
  mainMesh.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
  mainMesh.scale.set(data.scale.x, data.scale.y, data.scale.z);

  scene.add(mainMesh);

  return {
    data,
    mainMesh,
    glowMesh,
    dropAnimation: {
      active: true,
      startTime: performance.now() + index * 50,
      duration: 800,
      startY: dropHeight,
      targetY,
      bouncePeak: targetY + 0.8
    },
    moveAnimation: null,
    colorAnimation: null
  };
}

export async function buildScene(sceneData: SceneData): Promise<void> {
  clearScene();

  if (sceneData.environment) {
    if (sceneData.environment.fogColor && sceneData.environment.fogDensity) {
      scene.fog = new THREE.FogExp2(
        new THREE.Color(sceneData.environment.fogColor),
        sceneData.environment.fogDensity
      );
    }
    if (sceneData.environment.ambientIntensity !== undefined) {
      const ambient = scene.children.find(
        c => c instanceof THREE.AmbientLight
      ) as THREE.AmbientLight;
      if (ambient) {
        ambient.intensity = sceneData.environment.ambientIntensity;
      }
    }
  } else {
    scene.fog = null;
  }

  const objectsToCreate = Math.min(sceneData.objects.length, 30);

  for (let i = 0; i < objectsToCreate; i++) {
    const data = sceneData.objects[i];
    const entry = createObjectEntry(data, i);
    objects.push(entry);
  }

  await new Promise(resolve => setTimeout(resolve, 850 + objectsToCreate * 50));
}

export async function reshuffle(): Promise<void> {
  const halfGrid = (GRID_SIZE - 2) / 2;
  const usedPositions: { x: number; z: number }[] = [];

  for (const entry of objects) {
    let attempts = 0;
    let x: number, z: number;

    do {
      x = (Math.random() - 0.5) * 2 * halfGrid;
      z = (Math.random() - 0.5) * 2 * halfGrid;
      attempts++;
    } while (
      attempts < 30 &&
      usedPositions.some(p => Math.sqrt((x - p.x) ** 2 + (z - p.z) ** 2) < 1.2)
    );

    usedPositions.push({ x, z });

    const targetY = getGroundY(entry.data);
    entry.data.position.x = x;
    entry.data.position.z = z;
    entry.data.position.y = 0;

    entry.moveAnimation = {
      active: true,
      startTime: performance.now(),
      duration: 500,
      startPos: entry.mainMesh.position.clone(),
      targetPos: new THREE.Vector3(x, targetY, z)
    };

    entry.data.rotation.y = Math.random() * Math.PI * 2;
  }

  if (selectedObject) {
    onObjectSelectCallback?.(selectedObject.data);
  }

  await new Promise(resolve => setTimeout(resolve, 500));
}

export function getSelectedObject(): SceneObject | null {
  return selectedObject?.data || null;
}

export function updateObjectColor(id: string, color: string): void {
  const entry = objects.find(o => o.data.id === id);
  if (!entry) return;

  const material = entry.mainMesh.material as THREE.MeshStandardMaterial;
  const startColor = material.color.clone();
  const targetColor = new THREE.Color(color);

  entry.colorAnimation = {
    active: true,
    startTime: performance.now(),
    duration: 300,
    startColor,
    targetColor
  };

  entry.data.color = color;

  if (entry.data.emissive) {
    entry.data.emissive = color;
    material.emissive = new THREE.Color(color);
  }
}

export function updateObjectPosition(id: string, position: { x: number; y: number; z: number }): void {
  const entry = objects.find(o => o.data.id === id);
  if (!entry) return;

  const targetY = position.y + getObjectHeight(entry.data) / 2;

  entry.moveAnimation = {
    active: true,
    startTime: performance.now(),
    duration: 1000,
    startPos: entry.mainMesh.position.clone(),
    targetPos: new THREE.Vector3(position.x, targetY, position.z)
  };

  entry.data.position = { ...position };
}

export function setOnObjectSelect(callback: (obj: SceneObject | null) => void): void {
  onObjectSelectCallback = callback;
}

function clearScene(): void {
  for (const entry of objects) {
    scene.remove(entry.mainMesh);
    entry.mainMesh.geometry.dispose();
    if (Array.isArray(entry.mainMesh.material)) {
      entry.mainMesh.material.forEach(m => m.dispose());
    } else {
      entry.mainMesh.material.dispose();
    }
    if (entry.glowMesh) {
      entry.glowMesh.geometry.dispose();
      if (Array.isArray(entry.glowMesh.material)) {
        entry.glowMesh.material.forEach(m => m.dispose());
      } else {
        entry.glowMesh.material.dispose();
      }
    }
  }
  objects = [];
  selectedObject = null;
}

function animate(): void {
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const now = performance.now();

  controls.update();
  fireflyAnimationTime += delta;

  for (const entry of objects) {
    if (entry.dropAnimation && entry.dropAnimation.active) {
      const elapsed = now - entry.dropAnimation.startTime;
      if (elapsed >= 0) {
        const t = Math.min(elapsed / entry.dropAnimation.duration, 1);
        const eased = easeOutCubic(t);

        if (t < 0.6) {
          const fallT = t / 0.6;
          entry.mainMesh.position.y = lerp(
            entry.dropAnimation.startY,
            entry.dropAnimation.bouncePeak,
            fallT
          );
        } else {
          const bounceT = (t - 0.6) / 0.4;
          const bounceEased = easeOutElastic(bounceT);
          entry.mainMesh.position.y = lerp(
            entry.dropAnimation.bouncePeak,
            entry.dropAnimation.targetY,
            bounceEased
          );
        }

        if (t >= 1) {
          entry.dropAnimation.active = false;
          entry.mainMesh.position.y = entry.dropAnimation.targetY;
        }
      }
    }

    if (entry.moveAnimation && entry.moveAnimation.active) {
      const elapsed = now - entry.moveAnimation.startTime;
      const t = Math.min(elapsed / entry.moveAnimation.duration, 1);
      const eased = easeOutCubic(t);

      entry.mainMesh.position.lerpVectors(
        entry.moveAnimation.startPos,
        entry.moveAnimation.targetPos,
        eased
      );

      if (t >= 1) {
        entry.moveAnimation.active = false;
        entry.mainMesh.position.copy(entry.moveAnimation.targetPos);
      }
    }

    if (entry.colorAnimation && entry.colorAnimation.active) {
      const elapsed = now - entry.colorAnimation.startTime;
      const t = Math.min(elapsed / entry.colorAnimation.duration, 1);
      const eased = easeOutCubic(t);

      const material = entry.mainMesh.material as THREE.MeshStandardMaterial;
      material.color.lerpColors(
        entry.colorAnimation.startColor,
        entry.colorAnimation.targetColor,
        eased
      );

      if (t >= 1) {
        entry.colorAnimation.active = false;
        material.color.copy(entry.colorAnimation.targetColor);
      }
    }

    if (entry.data.type === 'firefly') {
      const baseY = getGroundY(entry.data);
      const fireflyIndex = objects.indexOf(entry);
      const offset = fireflyIndex * 0.5;
      entry.mainMesh.position.y = baseY + Math.sin(fireflyAnimationTime * 2 + offset) * 0.5;
      entry.mainMesh.position.x = entry.data.position.x + Math.cos(fireflyAnimationTime * 1.5 + offset) * 0.3;
      entry.mainMesh.position.z = entry.data.position.z + Math.sin(fireflyAnimationTime * 1.2 + offset * 0.7) * 0.3;

      const material = entry.mainMesh.material as THREE.MeshStandardMaterial;
      material.opacity = 0.6 + Math.sin(fireflyAnimationTime * 3 + offset) * 0.3;
    }

    if (entry.glowMesh && entry.glowMesh.visible) {
      const pulse = 1 + Math.sin(now * 0.005) * 0.1;
      entry.glowMesh.scale.set(pulse, pulse, pulse);
    }
  }

  renderer.render(scene, camera);

  frameCount++;
  if (now - lastFpsUpdate >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
    if (fpsCounter) {
      fpsCounter.textContent = `FPS: ${fps}`;
      fpsCounter.style.color = fps >= 50 ? '#00d4aa' : fps >= 30 ? '#ffaa00' : '#ff4444';
    }
    frameCount = 0;
    lastFpsUpdate = now;
  }
}

export function dispose(): void {
  cancelAnimationFrame(animationFrameId);
  clearScene();
  renderer.dispose();
  renderer.domElement.removeEventListener('click', onMouseClick);
  window.removeEventListener('resize', onWindowResize);
  controls.dispose();
}
