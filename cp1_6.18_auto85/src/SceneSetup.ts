import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export let scene: THREE.Scene;
export let camera: THREE.PerspectiveCamera;
export let renderer: THREE.WebGLRenderer;
export let controls: OrbitControls;
export let buildings: THREE.Mesh[] = [];
export let buildingBoxes: THREE.Box3[] = [];

export const CITY_SIZE = 400;
export const GROUND_SIZE = 600;

export function initScene(container: HTMLElement) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);
  scene.fog = new THREE.Fog(0x0a0e1a, 400, 800);

  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 350, 350);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 150;
  controls.maxDistance = 600;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.minPolarAngle = Math.PI / 6;
  controls.target.set(0, 0, 0);

  setupLights();
  createGround();
  createBuildings();

  window.addEventListener('resize', onWindowResize);
}

function setupLights() {
  const ambientLight = new THREE.AmbientLight(0x4a5568, 0.6);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x1a2332, 0.4);
  scene.add(hemisphereLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 200, 100);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -300;
  directionalLight.shadow.camera.right = 300;
  directionalLight.shadow.camera.top = 300;
  directionalLight.shadow.camera.bottom = -300;
  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0x4fc3f7, 0.2);
  fillLight.position.set(-100, 100, -100);
  scene.add(fillLight);
}

function createGround() {
  const groundGeometry = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2332,
    transparent: true,
    opacity: 0.6,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(GROUND_SIZE, 60, 0x37474f, 0x263238);
  gridHelper.position.y = 0.1;
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.3;
  scene.add(gridHelper);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(GROUND_SIZE / 2 - 2, GROUND_SIZE / 2, 64),
    new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.2;
  scene.add(outerRing);
}

function createBuildings() {
  buildings = [];
  buildingBoxes = [];

  const gridSize = 40;
  const halfCity = CITY_SIZE / 2;

  for (let x = -halfCity + gridSize; x < halfCity - gridSize; x += gridSize) {
    for (let z = -halfCity + gridSize; z < halfCity - gridSize; z += gridSize) {
      if (Math.random() < 0.65) {
        const offsetX = (Math.random() - 0.5) * gridSize * 0.4;
        const offsetZ = (Math.random() - 0.5) * gridSize * 0.4;
        const width = 15 + Math.random() * 20;
        const depth = 15 + Math.random() * 20;
        const height = 25 + Math.random() * 55;

        const building = createBuilding(width, height, depth);
        building.position.set(x + offsetX, height / 2, z + offsetZ);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
        buildings.push(building);

        const box = new THREE.Box3().setFromObject(building);
        buildingBoxes.push(box);
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = CITY_SIZE * 0.35;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const width = 25 + Math.random() * 15;
    const depth = 25 + Math.random() * 15;
    const height = 50 + Math.random() * 30;

    const building = createBuilding(width, height, depth);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    buildings.push(building);

    const box = new THREE.Box3().setFromObject(building);
    buildingBoxes.push(box);
  }

  const centerBuilding = createBuilding(35, 80, 35);
  centerBuilding.position.set(0, 40, 0);
  centerBuilding.castShadow = true;
  centerBuilding.receiveShadow = true;
  scene.add(centerBuilding);
  buildings.push(centerBuilding);

  const centerBox = new THREE.Box3().setFromObject(centerBuilding);
  buildingBoxes.push(centerBox);
}

function createBuilding(width: number, height: number, depth: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);

  const baseHue = 0.55 + Math.random() * 0.1;
  const baseSat = 0.2 + Math.random() * 0.15;
  const baseLight = 0.35 + Math.random() * 0.15;

  const topColor = new THREE.Color().setHSL(baseHue, baseSat, baseLight + 0.1);
  const sideColor = new THREE.Color().setHSL(baseHue, baseSat, baseLight - 0.05);

  const materials = [
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.7, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.7, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.6, metalness: 0.2 }),
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.7, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.7, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.7, metalness: 0.15 }),
  ];

  const building = new THREE.Mesh(geometry, materials);

  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x546e7a,
    transparent: true,
    opacity: 0.3,
  });
  const wireframe = new THREE.LineSegments(edges, lineMaterial);
  building.add(wireframe);

  return building;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getGroundPlane() {
  return new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
}
