import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Molecule, Atom, AppState, DisplayMode } from './eventBus';
import { eventBus } from './eventBus';
import { getMoleculeList, getMoleculeById } from './moleculeDataModule';
import { createMoleculeGroup, updateAtomScale, updateDisplayMode, fadeInGroup } from './renderModule';
import { initControlPanel } from './controlModule';
import './style.css';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;

let currentMoleculeGroup: THREE.Group | null = null;
let currentMolecule: Molecule | null = null;

let appState: AppState = {
  currentMoleculeId: 'h2o',
  atomScale: 1.0,
  cameraDistance: 10,
  backgroundColor: '#0a0a2e',
  displayMode: 'solid'
};

let backgroundColorTarget = new THREE.Color('#0a0a2e');
let backgroundColorStart = new THREE.Color('#0a0a2e');
let isAnimatingBackground = false;
let backgroundAnimationStart = 0;
const BACKGROUND_ANIMATION_DURATION = 500;

let infoCardTimeout: number | null = null;

function initScene(): void {
  scene = new THREE.Scene();
  scene.background = backgroundColorCurrent;

  const container = document.getElementById('scene-container');
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  updateCameraPosition();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 2;
  controls.maxDistance = 30;
  controls.target.set(0, 0, 0);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  setupLighting();
  setupEventListeners();
  setupEventBus();

  const moleculeList = getMoleculeList();
  initControlPanel(moleculeList, appState);

  changeMolecule(appState.currentMoleculeId);
  animate();
}

function setupLighting(): void {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight1.position.set(5, 5, 5);
  directionalLight1.castShadow = true;
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight2.position.set(-5, -3, -5);
  scene.add(directionalLight2);
}

function setupEventListeners(): void {
  window.addEventListener('resize', handleResize);
  renderer.domElement.addEventListener('dblclick', handleDoubleClick);
}

function setupEventBus(): void {
  eventBus.on('molecule:change', (moleculeId) => {
    changeMolecule(moleculeId);
  });

  eventBus.on('atomScale:change', (scale) => {
    appState.atomScale = scale;
    if (currentMoleculeGroup) {
      updateAtomScale(currentMoleculeGroup, scale);
    }
  });

  eventBus.on('cameraDistance:change', (distance) => {
    appState.cameraDistance = distance;
    updateCameraPosition();
  });

  eventBus.on('backgroundColor:change', (color) => {
    appState.backgroundColor = color;
    backgroundColorTarget = new THREE.Color(color);
    backgroundColorStart = scene.background instanceof THREE.Color
      ? scene.background.clone()
      : new THREE.Color('#0a0a2e');
    isAnimatingBackground = true;
    backgroundAnimationStart = performance.now();
  });

  eventBus.on('displayMode:change', (mode) => {
    appState.displayMode = mode;
    if (currentMoleculeGroup) {
      updateDisplayMode(currentMoleculeGroup, mode);
    }
  });
}

function updateCameraPosition(): void {
  const distance = appState.cameraDistance;
  camera.position.set(distance * 0.5, distance * 0.5, distance);
  camera.lookAt(0, 0, 0);
  if (controls) {
    controls.target.set(0, 0, 0);
    controls.update();
  }
}

function changeMolecule(moleculeId: string): void {
  const molecule = getMoleculeById(moleculeId);
  if (!molecule) return;

  currentMolecule = molecule;
  appState.currentMoleculeId = moleculeId;

  if (currentMoleculeGroup) {
    scene.remove(currentMoleculeGroup);
    currentMoleculeGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  const newGroup = createMoleculeGroup(molecule, appState.atomScale, appState.displayMode);
  (newGroup.userData as { molecule: Molecule }).molecule = molecule;
  scene.add(newGroup);
  currentMoleculeGroup = newGroup;

  controls.reset();
  updateCameraPosition();

  fadeInGroup(newGroup, 800);

  eventBus.emit('molecule:loaded', molecule);
}

function handleResize(): void {
  const container = document.getElementById('scene-container');
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function handleDoubleClick(event: MouseEvent): void {
  const container = document.getElementById('scene-container');
  if (!container) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const atomsGroup = currentMoleculeGroup?.getObjectByName('atoms');
  if (!atomsGroup) return;

  const intersects = raycaster.intersectObjects(atomsGroup.children, false);

  if (intersects.length > 0) {
    const mesh = intersects[0].object as THREE.Mesh;
    const userData = mesh.userData as { atom: Atom };
    if (userData.atom) {
      showAtomInfo(userData.atom);
      eventBus.emit('atom:doubleClick', userData.atom);
    }
  }
}

function showAtomInfo(atom: Atom): void {
  let infoCard = document.getElementById('atom-info-card');
  if (!infoCard) {
    infoCard = document.createElement('div');
    infoCard.id = 'atom-info-card';
    infoCard.className = 'atom-info-card';
    document.body.appendChild(infoCard);
  }

  infoCard.style.opacity = '1';
  infoCard.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">原子信息</div>
    <div>元素: ${atom.elementName}(${atom.element})</div>
    <div>序号: ${atom.atomicNumber}</div>
    <div>坐标: (${atom.position[0].toFixed(2)}, ${atom.position[1].toFixed(2)}, ${atom.position[2].toFixed(2)})</div>
  `;
  infoCard.classList.remove('fade-out');

  if (infoCardTimeout) {
    clearTimeout(infoCardTimeout);
  }

  infoCardTimeout = window.setTimeout(() => {
    infoCard?.classList.add('fade-out');
    infoCardTimeout = window.setTimeout(() => {
      if (infoCard) {
        infoCard.style.opacity = '0';
      }
    }, 2000);
  }, 100);
}

function animate(): void {
  requestAnimationFrame(animate);

  if (isAnimatingBackground) {
    const elapsed = performance.now() - backgroundAnimationStart;
    const progress = Math.min(elapsed / BACKGROUND_ANIMATION_DURATION, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const currentColor = backgroundColorStart.clone().lerp(backgroundColorTarget, easeProgress);
    scene.background = currentColor;

    if (progress >= 1) {
      isAnimatingBackground = false;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', initScene);
