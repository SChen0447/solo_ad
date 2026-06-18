import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import Stats from 'stats.js';
import { AppController } from './AppController';

const sceneContainer = document.getElementById('scene-container')!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 1);
sceneContainer.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(40, 50, 40);
camera.lookAt(0, 0, 0);

scene.userData.canvas = renderer.domElement;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 20;
controls.maxDistance = 120;
controls.maxPolarAngle = Math.PI / 2.2;
controls.target.set(0, 0, 0);

const gui = new dat.GUI({ width: 220 });
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '20px';
gui.domElement.style.right = '20px';
gui.domElement.style.background = 'rgba(0, 0, 0, 0.7)';
gui.domElement.style.borderRadius = '8px';
gui.domElement.style.border = '1px solid rgba(255, 255, 255, 0.15)';
gui.domElement.style.backdropFilter = 'blur(10px)';

const stats = new Stats();
stats.showPanel(0);
stats.dom.style.position = 'absolute';
stats.dom.style.left = '20px';
stats.dom.style.bottom = '20px';
stats.dom.style.top = 'auto';
document.body.appendChild(stats.dom);

const trianglesPanel = stats.addPanel(new Stats.Panel('TRIS', '#ff8', '#221'));

const trianglesDisplay = document.createElement('div');
trianglesDisplay.id = 'triangles-display';
trianglesDisplay.style.cssText = `
  position: absolute;
  left: 100px;
  bottom: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: #ffff88;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 9px;
  font-weight: bold;
  padding: 2px 6px 3px 6px;
  line-height: 15px;
  border-radius: 3px;
  z-index: 10;
  pointer-events: none;
`;
trianglesDisplay.innerHTML = `
  <div style="color:#ffff88">TRIANGLES</div>
  <div id="triangles-count" style="font-size:14px">0</div>
`;
document.body.appendChild(trianglesDisplay);

const appController = new AppController(scene, camera, controls, gui);

const fpsWarning = document.getElementById('fps-warning')!;
let fpsFrames = 0;
let fpsLastTime = performance.now();

function countTriangles(object: THREE.Object3D): number {
  let count = 0;
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geometry = child.geometry;
      if (geometry.index) {
        count += geometry.index.count / 3;
      } else if (geometry.attributes.position) {
        count += geometry.attributes.position.count / 3;
      }
    }
  });
  return Math.round(count);
}

function animate() {
  requestAnimationFrame(animate);

  stats.begin();

  controls.update();
  appController.update();
  renderer.render(scene, camera);

  const triCount = countTriangles(scene);
  const triCountEl = document.getElementById('triangles-count');
  if (triCountEl) {
    triCountEl.textContent = triCount.toLocaleString();
  }
  trianglesPanel.update(triCount, 20000);

  stats.end();

  fpsFrames++;
  const now = performance.now();
  if (now - fpsLastTime >= 1000) {
    const fps = fpsFrames * 1000 / (now - fpsLastTime);
    fpsWarning.style.display = fps < 30 ? 'block' : 'none';
    fpsFrames = 0;
    fpsLastTime = now;
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  appController.onResize();
});

appController.init();
animate();
