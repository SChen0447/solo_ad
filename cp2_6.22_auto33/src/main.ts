import * as THREE from 'three';
import { CityGenerator, BuildingData, CityParams } from '@/core/CityGenerator';
import { BuildingRenderer } from '@/core/BuildingRenderer';
import { SkylineEffect } from '@/core/SkylineEffect';
import { ParamPanel, PanelParams } from '@/ui/ParamPanel';
import { StatsPanel } from '@/ui/StatsPanel';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Container #app not found');
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x0A0A0A);
app.appendChild(renderer.domElement);

const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.6);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(100, 200, 100);
directionalLight.castShadow = true;
scene.add(directionalLight);

const groundGeometry = new THREE.PlaneGeometry(400, 400);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.set(200, 0, 200);
scene.add(ground);

const cityGenerator = new CityGenerator({ seed: 42 });
const buildingRenderer = new BuildingRenderer({ scene, camera, renderer });
const skylineEffect = new SkylineEffect({ scene });

let debounceTimer: number | null = null;

const handleParamsChange = (params: PanelParams) => {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer);
  }
  debounceTimer = window.setTimeout(() => {
    const buildings: BuildingData[] = cityGenerator.generate(params as CityParams);
    buildingRenderer.updateBuildings(buildings);
    skylineEffect.setTheme(params.theme);
    skylineEffect.updateBuildings(buildings);
    statsPanel.setTheme(params.theme);
    window.setTimeout(() => {
      statsPanel.update(buildings);
    }, 600);
  }, 100);
};

const paramPanel = new ParamPanel({
  containerId: 'app',
  onChange: handleParamsChange,
});
const statsPanel = new StatsPanel({
  containerId: 'app',
});

const initialParams: PanelParams = {
  density: 0.6,
  heightVariation: 1.0,
  theme: 'sunset',
};
paramPanel.setParams(initialParams);
handleParamsChange(initialParams);

const clock = new THREE.Clock();

const animate = () => {
  const delta = clock.getDelta();
  buildingRenderer.tick(delta);
  skylineEffect.tick(clock.getElapsedTime());
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
