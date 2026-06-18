import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AppController } from './AppController';
import { CAMERA_MIN_DISTANCE, CAMERA_MAX_DISTANCE } from './types';

let appController: AppController | null = null;

function init(): void {
  const container = document.getElementById('scene-container');
  if (!container) {
    console.error('Scene container not found');
    return;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 80, 150);

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(42, 42, 42);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;
  controls.minDistance = CAMERA_MIN_DISTANCE;
  controls.maxDistance = CAMERA_MAX_DISTANCE;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minPolarAngle = Math.PI / 6;
  controls.enablePan = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  const gridHelper = new THREE.GridHelper(200, 100, 0x222222, 0x111111);
  gridHelper.position.y = -0.1;
  scene.add(gridHelper);

  appController = new AppController(scene, camera, renderer, controls, container);
  appController.start();

  window.addEventListener('beforeunload', () => {
    if (appController) {
      appController.dispose();
    }
    renderer.dispose();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
