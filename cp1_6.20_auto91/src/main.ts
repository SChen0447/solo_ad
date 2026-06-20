import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateCity, BuildingData, CityGroup } from './cityGenerator';
import { WeatherController } from './weatherController';
import { ParticleSystem } from './particleSystem';

import './style.css';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let cityGroup: CityGroup;
let weatherController: WeatherController;
let particleSystem: ParticleSystem;
let ambientLight: THREE.AmbientLight;
let directionalLight: THREE.DirectionalLight;
let clock: THREE.Clock;

const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
const sceneContainer = document.querySelector('.scene-container') as HTMLElement;

function init(): void {
  scene = new THREE.Scene();
  clock = new THREE.Clock();

  const width = sceneContainer.clientWidth;
  const height = sceneContainer.clientHeight;

  camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(25, 25, 25);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 10;
  controls.maxDistance = 80;
  controls.target.set(0, 2, 0);
  controls.update();

  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(15, 30, 15);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -30;
  directionalLight.shadow.camera.right = 30;
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  scene.add(directionalLight);

  cityGroup = generateCity();
  scene.add(cityGroup.group);

  const bounds = { x: 25, z: 25, height: 20 };
  particleSystem = new ParticleSystem(scene, bounds);

  weatherController = new WeatherController(
    scene,
    cityGroup.buildings,
    particleSystem,
    ambientLight,
    directionalLight
  );

  window.addEventListener('resize', onWindowResize);

  animate();
}

function onWindowResize(): void {
  const width = sceneContainer.clientWidth;
  const height = sceneContainer.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  controls.update();
  weatherController.update(deltaTime);

  renderer.render(scene, camera);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
