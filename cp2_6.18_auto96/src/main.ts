import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AppController } from './AppController';
import Stats from 'stats.js';

const container = document.getElementById('scene-container')!;
const tooltip = document.getElementById('tooltip')!;
const fpsWarning = document.getElementById('fps-warning')!;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedValue = document.getElementById('speed-value')!;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 1);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(30, 50, 30);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 20;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI / 2.1;
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN,
};

const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

const stats = new Stats();
stats.showPanel(0);
stats.dom.style.position = 'absolute';
stats.dom.style.left = '0px';
stats.dom.style.bottom = '0px';
stats.dom.style.top = '';
const statsPanel = document.getElementById('stats-panel')!;
statsPanel.appendChild(stats.dom);

let speedMultiplier = 1.0;
speedSlider.addEventListener('input', () => {
  speedMultiplier = parseFloat(speedSlider.value);
  speedValue.textContent = speedMultiplier.toFixed(1) + 'x';
});

const appController = new AppController(scene, camera, renderer, tooltip);

let frameCount = 0;
let fpsAccum = 0;
let lastFpsCheck = performance.now();

function animate() {
  requestAnimationFrame(animate);

  stats.begin();

  const delta = 1 / 60;
  appController.update(delta, speedMultiplier, camera);

  controls.update();
  renderer.render(scene, camera);

  stats.end();

  frameCount++;
  const now = performance.now();
  if (now - lastFpsCheck >= 500) {
    const fps = (frameCount * 1000) / (now - lastFpsCheck);
    fpsAccum = fps;
    frameCount = 0;
    lastFpsCheck = now;

    if (fps < 30) {
      fpsWarning.style.display = 'block';
    } else {
      fpsWarning.style.display = 'none';
    }
  }
}

appController.start();
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
