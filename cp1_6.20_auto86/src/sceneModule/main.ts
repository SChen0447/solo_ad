import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus } from '../eventBus';

interface BuildingMesh extends THREE.Mesh {
  buildingInfo?: {
    name: string;
    material: string;
    floor: number;
  };
}

const BUILDING_WIDTH = 40;
const BUILDING_DEPTH = 30;
const FLOOR_HEIGHT = 30;
const WALL_THICKNESS = 1;
const TOTAL_HEIGHT = FLOOR_HEIGHT * 3;

const COLORS = {
  wall: 0xa8d8ea,
  floor: 0xb0b0b0,
  door: 0x8b5a2b,
  stair: 0x7f8c8d,
  background: 0xf0f0f0,
  cutPlane: 0x3498db,
  highlight: 0x3498db
};

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let buildingMeshes: BuildingMesh[] = [];
let cutPlaneMesh: THREE.Mesh;
let highlightMesh: BuildingMesh | null = null;
let originalMaterial: THREE.Material | THREE.Material[] | null = null;
let currentCutHeight = 10;
let currentFloor = 1;
let animationId: number;
let tooltipEl: HTMLElement;

function init() {
  const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  tooltipEl = document.getElementById('info-tooltip') as HTMLElement;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);

  const container = document.getElementById('left-panel') as HTMLElement;
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(70, 60, 70);
  camera.lookAt(0, TOTAL_HEIGHT / 2, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.target.set(0, TOTAL_HEIGHT / 2, 0);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 80, 50);
  scene.add(dirLight);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
  dirLight2.position.set(-50, 30, -50);
  scene.add(dirLight2);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  createBuilding();
  createCutPlane();

  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  window.addEventListener('resize', onWindowResize);

  eventBus.on('cutHeightChanged', (height: number) => {
    currentCutHeight = height;
    updateCutPlane(height);
  });

  eventBus.on('floorSwitched', (floor: number) => {
    currentFloor = floor;
    animateToFloorView(floor);
  });

  animate();
}

function createBuilding() {
  createWalls();
  createFloors();
  createDoorsAndWindows();
  createStairs();
}

function createWalls() {
  const wallMat = new THREE.MeshStandardMaterial({
    color: COLORS.wall,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  for (let floor = 0; floor < 3; floor++) {
    const yBase = floor * FLOOR_HEIGHT;

    const positions = [
      { x: 0, z: BUILDING_DEPTH / 2, w: BUILDING_WIDTH, d: WALL_THICKNESS, ry: 0, name: '外墙(南)' },
      { x: 0, z: -BUILDING_DEPTH / 2, w: BUILDING_WIDTH, d: WALL_THICKNESS, ry: 0, name: '外墙(北)' },
      { x: BUILDING_WIDTH / 2, z: 0, w: WALL_THICKNESS, d: BUILDING_DEPTH, ry: 0, name: '外墙(东)' },
      { x: -BUILDING_WIDTH / 2, z: 0, w: WALL_THICKNESS, d: BUILDING_DEPTH, ry: 0, name: '外墙(西)' },
      { x: -5, z: 0, w: WALL_THICKNESS, d: BUILDING_DEPTH - 4, ry: 0, name: '内墙(隔墙1)' },
      { x: 5, z: 5, w: BUILDING_WIDTH - 15, d: WALL_THICKNESS, ry: 0, name: '内墙(隔墙2)' }
    ];

    positions.forEach(pos => {
      const geo = new THREE.BoxGeometry(pos.w, FLOOR_HEIGHT, pos.d);
      const mesh = createBuildingMesh(geo, wallMat, pos.name, '半透明浅蓝色外墙', floor + 1);
      mesh.position.set(pos.x, yBase + FLOOR_HEIGHT / 2, pos.z);
      scene.add(mesh);
    });
  }
}

function createFloors() {
  const floorMat = new THREE.MeshStandardMaterial({
    color: COLORS.floor,
    side: THREE.DoubleSide
  });

  for (let i = 0; i <= 3; i++) {
    const y = i * FLOOR_HEIGHT;
    const geo = new THREE.BoxGeometry(BUILDING_WIDTH, 0.5, BUILDING_DEPTH);
    const name = i === 0 ? '基础底板' : i === 3 ? '屋顶板' : `${i}层楼板`;
    const mesh = createBuildingMesh(geo, floorMat, name, '灰色楼板', i === 0 ? 1 : i);
    mesh.position.set(0, y, 0);
    scene.add(mesh);
  }
}

function createDoorsAndWindows() {
  const doorMat = new THREE.MeshStandardMaterial({
    color: COLORS.door,
    side: THREE.DoubleSide
  });

  const doorGeo = new THREE.BoxGeometry(3, 8, WALL_THICKNESS + 0.1);
  const doorMesh1 = createBuildingMesh(doorGeo, doorMat, '1层大门', '深木色门', 1);
  doorMesh1.position.set(0, 4, BUILDING_DEPTH / 2);
  scene.add(doorMesh1);

  const doorMesh2 = createBuildingMesh(doorGeo, doorMat, '2层室内门', '深木色门', 2);
  doorMesh2.position.set(-5, FLOOR_HEIGHT + 4, BUILDING_DEPTH / 2 - 5);
  scene.add(doorMesh2);

  const doorMesh3 = createBuildingMesh(doorGeo, doorMat, '3层室内门', '深木色门', 3);
  doorMesh3.position.set(-5, FLOOR_HEIGHT * 2 + 4, BUILDING_DEPTH / 2 - 5);
  scene.add(doorMesh3);

  const windowGeo = new THREE.BoxGeometry(4, 5, WALL_THICKNESS + 0.1);
  const windowPositions = [
    { x: -12, y: 15, z: BUILDING_DEPTH / 2, floor: 1, name: '1层南窗1' },
    { x: 12, y: 15, z: BUILDING_DEPTH / 2, floor: 1, name: '1层南窗2' },
    { x: 0, y: 15, z: -BUILDING_DEPTH / 2, floor: 1, name: '1层北窗' },
    { x: BUILDING_WIDTH / 2, y: 15, z: 0, floor: 1, name: '1层东窗' },
    { x: -12, y: FLOOR_HEIGHT + 15, z: BUILDING_DEPTH / 2, floor: 2, name: '2层南窗1' },
    { x: 12, y: FLOOR_HEIGHT + 15, z: BUILDING_DEPTH / 2, floor: 2, name: '2层南窗2' },
    { x: 0, y: FLOOR_HEIGHT + 15, z: -BUILDING_DEPTH / 2, floor: 2, name: '2层北窗' },
    { x: -BUILDING_WIDTH / 2, y: FLOOR_HEIGHT + 15, z: 0, floor: 2, name: '2层西窗' },
    { x: -12, y: FLOOR_HEIGHT * 2 + 15, z: BUILDING_DEPTH / 2, floor: 3, name: '3层南窗1' },
    { x: 12, y: FLOOR_HEIGHT * 2 + 15, z: BUILDING_DEPTH / 2, floor: 3, name: '3层南窗2' },
    { x: 0, y: FLOOR_HEIGHT * 2 + 15, z: -BUILDING_DEPTH / 2, floor: 3, name: '3层北窗' }
  ];

  windowPositions.forEach(pos => {
    const mesh = createBuildingMesh(windowGeo, doorMat, pos.name, '深木色窗框', pos.floor);
    mesh.position.set(pos.x, pos.y, pos.z);
    scene.add(mesh);
  });
}

function createStairs() {
  const stairMat = new THREE.MeshStandardMaterial({
    color: COLORS.stair,
    metalness: 0.6,
    roughness: 0.3
  });

  const stairWidth = 6;
  const stepHeight = FLOOR_HEIGHT / 15;
  const stepDepth = 1.2;

  for (let floor = 0; floor < 3; floor++) {
    for (let step = 0; step < 15; step++) {
      const stepGeo = new THREE.BoxGeometry(stairWidth, stepHeight, stepDepth);
      const mesh = createBuildingMesh(
        stepGeo,
        stairMat,
        `${floor + 1}层楼梯(第${step + 1}阶)`,
        '金属色楼梯',
        floor + 1
      );
      mesh.position.set(
        BUILDING_WIDTH / 2 - stairWidth / 2 - 3,
        floor * FLOOR_HEIGHT + stepHeight / 2 + step * stepHeight,
        -BUILDING_DEPTH / 2 + stepDepth / 2 + step * stepDepth + 2
      );
      scene.add(mesh);
    }
  }
}

function createBuildingMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  materialDesc: string,
  floor: number
): BuildingMesh {
  const mesh: BuildingMesh = new THREE.Mesh(geometry, material);
  mesh.buildingInfo = { name, material: materialDesc, floor };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  buildingMeshes.push(mesh);
  return mesh;
}

function createCutPlane() {
  const planeGeo = new THREE.PlaneGeometry(BUILDING_WIDTH * 1.5, BUILDING_DEPTH * 1.5);
  const planeMat = new THREE.MeshBasicMaterial({
    color: COLORS.cutPlane,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  cutPlaneMesh = new THREE.Mesh(planeGeo, planeMat);
  cutPlaneMesh.rotation.x = -Math.PI / 2;
  cutPlaneMesh.position.y = currentCutHeight;
  scene.add(cutPlaneMesh);
}

function updateCutPlane(height: number) {
  cutPlaneMesh.position.y = height;
}

function onCanvasClick(event: MouseEvent) {
  const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(buildingMeshes, false);

  if (highlightMesh && originalMaterial) {
    highlightMesh.material = originalMaterial;
    highlightMesh = null;
    originalMaterial = null;
  }

  if (intersects.length > 0) {
    const mesh = intersects[0].object as BuildingMesh;
    if (mesh.buildingInfo) {
      highlightMesh = mesh;
      originalMaterial = mesh.material;
      const highlightMat = new THREE.MeshStandardMaterial({
        color: COLORS.highlight,
        transparent: true,
        opacity: 0.9,
        emissive: COLORS.highlight,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide
      });
      mesh.material = highlightMat;

      showTooltip(event.clientX, event.clientY, mesh.buildingInfo.name, mesh.buildingInfo.material);
    }
  } else {
    hideTooltip();
  }
}

function onCanvasMouseMove(event: MouseEvent) {
  if (highlightMesh && highlightMesh.buildingInfo) {
    showTooltip(event.clientX, event.clientY, highlightMesh.buildingInfo.name, highlightMesh.buildingInfo.material);
  }
}

function showTooltip(x: number, y: number, name: string, material: string) {
  const leftPanel = document.getElementById('left-panel') as HTMLElement;
  const rect = leftPanel.getBoundingClientRect();
  tooltipEl.style.left = `${x - rect.left + 15}px`;
  tooltipEl.style.top = `${y - rect.top + 15}px`;
  tooltipEl.querySelector('.name')!.textContent = name;
  tooltipEl.querySelector('.material')!.textContent = `材质: ${material}`;
  tooltipEl.classList.add('visible');
}

function hideTooltip() {
  tooltipEl.classList.remove('visible');
}

function onWindowResize() {
  const container = document.getElementById('left-panel') as HTMLElement;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateToFloorView(floor: number) {
  const targetHeight = (floor - 0.5) * FLOOR_HEIGHT;
  const sliderVal = Math.round((targetHeight / TOTAL_HEIGHT) * 100);

  const slider = document.getElementById('cut-slider') as HTMLInputElement;
  const sliderValEl = document.getElementById('slider-value') as HTMLElement;
  slider.value = String(sliderVal);
  sliderValEl.textContent = String(sliderVal);
  currentCutHeight = (sliderVal / 100) * TOTAL_HEIGHT;
  updateCutPlane(currentCutHeight);
  eventBus.emit('cutHeightChanged', currentCutHeight);

  const startTarget = controls.target.clone();
  const endTarget = new THREE.Vector3(0, targetHeight, 0);
  const startPos = camera.position.clone();
  const radius = 80;
  const endPos = new THREE.Vector3(0, targetHeight + radius * 0.7, radius * 0.7);

  const duration = 800;
  const startTime = performance.now();

  function animateStep() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeInOutQuad(t);

    controls.target.lerpVectors(startTarget, endTarget, eased);
    camera.position.lerpVectors(startPos, endPos, eased);

    if (t < 1) {
      requestAnimationFrame(animateStep);
    }
  }
  animateStep();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
