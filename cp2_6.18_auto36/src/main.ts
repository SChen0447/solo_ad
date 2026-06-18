import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import Stats from 'stats.js';
import { ParticleCloud } from './particleCloud';
import { InteractionManager } from './interactions';
import { GUIControls } from './guiControls';
import { AQIDataPoint, loadCityData } from './dataLoader';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let labelRenderer: CSS2DRenderer;
let particleCloud: ParticleCloud;
let interactionManager: InteractionManager;
let guiControls: GUIControls;
let stats: Stats;
let clock: THREE.Clock;
let container: HTMLElement;
let animationFrameId: number;

function init(): void {
  container = document.getElementById('canvas-container')!;
  clock = new THREE.Clock();

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(7, 7, 7);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(10, 10, 10);
  scene.add(pointLight);

  particleCloud = new ParticleCloud(
    scene,
    labelRenderer,
    {
      particlesPerPoint: 30,
      rotationSpeed: 0.002,
      sizeScale: 1.0
    },
    {
      onParticleHover: handleParticleHover,
      onParticleClick: handleParticleClick
    }
  );

  interactionManager = new InteractionManager(
    camera,
    renderer,
    labelRenderer,
    container,
    particleCloud,
    {
      onParticleHover: handleParticleHover,
      onParticleClick: handleParticleClick
    }
  );

  interactionManager.setInitialCamera(
    new THREE.Vector3(7, 7, 7),
    new THREE.Vector3(0, 0, 0)
  );

  guiControls = new GUIControls(
    particleCloud,
    interactionManager,
    { initialCity: 'beijing' },
    {
      onCityChange: handleCityChange
    }
  );

  stats = new Stats();
  stats.showPanel(0);
  (stats.dom as HTMLElement).style.position = 'absolute';
  (stats.dom as HTMLElement).style.top = '20px';
  (stats.dom as HTMLElement).style.left = '50%';
  (stats.dom as HTMLElement).style.transform = 'translateX(-50%)';
  container.appendChild(stats.dom);

  interactionManager.createLegend(scene);

  loadInitialData();
  animate();
}

async function loadInitialData(): Promise<void> {
  try {
    const data = await loadCityData('beijing');
    await particleCloud.setData(data);
    guiControls.initialize();
  } catch (error) {
    console.error('Failed to load initial data:', error);
  }
}

function handleParticleHover(point: AQIDataPoint | null): void {
  if (guiControls) {
    guiControls.updateSelectedPoint(point);
  }
}

function handleParticleClick(point: AQIDataPoint): void {
  if (guiControls) {
    guiControls.updateSelectedPoint(point);
  }
}

function handleCityChange(cityName: string, data: AQIDataPoint[]): void {
  console.log(`Switched to city: ${cityName}, points: ${data.length}`);
}

function animate(): void {
  animationFrameId = requestAnimationFrame(animate);

  stats.begin();

  const deltaTime = clock.getDelta();

  if (particleCloud) {
    particleCloud.update(deltaTime);
  }

  if (interactionManager) {
    interactionManager.update(deltaTime);
  }

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);

  stats.end();
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function dispose(): void {
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', onWindowResize);

  if (particleCloud) particleCloud.dispose();
  if (interactionManager) interactionManager.dispose();
  if (guiControls) guiControls.dispose();

  if (renderer) {
    renderer.dispose();
    container.removeChild(renderer.domElement);
  }

  if (labelRenderer) {
    container.removeChild(labelRenderer.domElement);
  }
}

window.addEventListener('resize', onWindowResize);
window.addEventListener('beforeunload', dispose);

init();

export { renderer, scene, camera, particleCloud };
