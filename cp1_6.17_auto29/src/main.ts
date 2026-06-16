import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GalaxyGenerator, DEFAULT_PARAMETERS } from './GalaxyGenerator';
import { ControlPanel } from './ControlPanel';

const container = document.getElementById('canvas-container')!;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x0b0c10, 1);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 5, 15);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
camera.position.copy(DEFAULT_CAMERA_POS);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(DEFAULT_CAMERA_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 40;
controls.update();

const galaxy = new GalaxyGenerator(scene, DEFAULT_PARAMETERS);

const controlPanel = new ControlPanel(
  {
    onParamsChange: (params) => {
      galaxy.updateParams(params);
    },
    onResetCamera: () => {
      camera.position.copy(DEFAULT_CAMERA_POS);
      controls.target.copy(DEFAULT_CAMERA_TARGET);
      controls.update();
    },
    onExportPNG: () => {
      renderer.render(scene, camera);
      const link = document.createElement('a');
      link.download = `galaxy-${Date.now()}.png`;
      link.href = renderer.domElement.toDataURL('image/png');
      link.click();
    },
  },
  DEFAULT_PARAMETERS
);

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

const clock = new THREE.Clock();
let frameCount = 0;
let fpsAccumulator = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  galaxy.update(delta);
  controls.update();
  renderer.render(scene, camera);

  frameCount++;
  fpsAccumulator += delta;
  if (fpsAccumulator >= 0.5) {
    const fps = frameCount / fpsAccumulator;
    controlPanel.updateFPS(fps);
    frameCount = 0;
    fpsAccumulator = 0;
  }
}

animate();
