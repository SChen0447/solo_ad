import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { createBuilding } from './building';
import { createSunController, sunPathByMonth, SunController } from './sunControl';
import { createShadowAnalyzer, ShadowAnalyzer } from './shadowAnalyzer';
import { createSkyboxEnvironment, createGrassTexture, createGrassRoughnessMap } from './textures';
import { createLightIndicator, LightIndicator } from './lightIndicator';

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let controls: OrbitControls;
let directionalLight: THREE.DirectionalLight;
let ambientLight: THREE.AmbientLight;
let building: THREE.Group;
let sunController: SunController;
let shadowAnalyzer: ShadowAnalyzer;
let ground: THREE.Mesh;
let gui: GUI;
let clock: THREE.Clock;
let envMap: THREE.CubeTexture;
let lightIndicator: LightIndicator;

const monthNames = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月'
];

const params = {
  month: '6月',
  sunAltitude: 0,
  sunAzimuth: 0,
  showLightIndicator: true
};

function init(): void {
  const container = document.getElementById('app');
  if (!container) return;

  scene = new THREE.Scene();

  envMap = createSkyboxEnvironment();
  scene.environment = envMap;
  scene.background = envMap;

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(15, 10, 15);

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 50;

  ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.bias = -0.001;
  scene.add(directionalLight);

  createGround();

  building = createBuilding({ envMap });
  building.position.y = 0;
  building.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(building);

  lightIndicator = createLightIndicator(scene);

  sunController = createSunController(scene, camera, renderer, Math.PI / 4, Math.PI / 3);
  sunController.onDirectionChange((direction: THREE.Vector3) => {
    updateLightDirection(direction);
    shadowAnalyzer.update(direction, building);
    updateLightIndicator();
  });

  shadowAnalyzer = createShadowAnalyzer(scene);

  setupGUI();

  const initialPath = sunPathByMonth[5];
  params.sunAltitude = initialPath.altitude;
  params.sunAzimuth = initialPath.azimuth;
  sunController.setSunAngles(initialPath.altitude, initialPath.azimuth, false);

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);

  const screenshotBtn = document.getElementById('screenshot-btn');
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', takeScreenshot);
  }

  animate();
}

function createGround(): void {
  const groundSize = 20;
  const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
  groundGeometry.rotateX(-Math.PI / 2);

  const grassTexture = createGrassTexture();
  const grassRoughness = createGrassRoughnessMap();
  grassTexture.repeat.set(6, 6);
  grassRoughness.repeat.set(6, 6);

  const groundMaterial = new THREE.MeshStandardMaterial({
    map: grassTexture,
    roughnessMap: grassRoughness,
    roughness: 0.95,
    metalness: 0.0
  });

  ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.receiveShadow = true;
  scene.add(ground);
}

function updateLightDirection(direction: THREE.Vector3): void {
  const lightDistance = 20;
  directionalLight.position.copy(direction).multiplyScalar(-lightDistance);
  directionalLight.target.position.set(0, 0, 0);
  directionalLight.target.updateMatrixWorld();
}

function updateLightIndicator(): void {
  if (lightIndicator && sunController) {
    const buildingCenter = new THREE.Vector3(0, 2.5, 0);
    lightIndicator.update(sunController.sunMesh.position, buildingCenter);
  }
}

function setupGUI(): void {
  gui = new GUI({ title: '参数面板' });
  gui.domElement.style.position = 'absolute';
  gui.domElement.style.top = '70px';
  gui.domElement.style.left = '20px';
  gui.domElement.style.borderRadius = '4px';
  gui.domElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';

  gui.add(params, 'month', monthNames)
    .name('模拟月份')
    .onChange((value: string) => {
      const monthIndex = monthNames.indexOf(value);
      if (monthIndex >= 0) {
        const path = sunPathByMonth[monthIndex];
        params.sunAltitude = path.altitude;
        params.sunAzimuth = path.azimuth;
        sunController.setSunAngles(path.altitude, path.azimuth, true);
        updateSunAngleControllers();
      }
    });

  const sunFolder = gui.addFolder('太阳角度');
  const altController = sunFolder.add(params, 'sunAltitude', 0.1, Math.PI / 2 - 0.05, 0.01)
    .name('高度角')
    .onChange((value: number) => {
      sunController.setSunAngles(value, params.sunAzimuth, false);
    });

  const aziController = sunFolder.add(params, 'sunAzimuth', 0, Math.PI, 0.01)
    .name('方位角')
    .onChange((value: number) => {
      sunController.setSunAngles(params.sunAltitude, value, false);
    });

  gui.add(params, 'showLightIndicator')
    .name('显示光照方向')
    .onChange((value: boolean) => {
      if (lightIndicator) {
        lightIndicator.setVisible(value);
      }
    });

  (window as any).__sunAngleControllers = { altController, aziController };
}

function updateSunAngleControllers(): void {
  const ctrls = (window as any).__sunAngleControllers;
  if (ctrls) {
    ctrls.altController.updateDisplay();
    ctrls.aziController.updateDisplay();
  }
}

function takeScreenshot(): void {
  const originalSize = {
    width: renderer.domElement.width,
    height: renderer.domElement.height
  };

  const screenshotSize = 2048;
  renderer.setSize(screenshotSize, screenshotSize, false);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  const dataURL = renderer.domElement.toDataURL('image/png');

  const canvas = document.createElement('canvas');
  const infoHeight = 120;
  canvas.width = screenshotSize;
  canvas.height = screenshotSize + infoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, screenshotSize, screenshotSize);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, screenshotSize, screenshotSize, infoHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('日照模拟与分析 - 截图', 40, screenshotSize + 50);

    const altitudeDeg = (params.sunAltitude * 180 / Math.PI).toFixed(1);
    const azimuthDeg = (params.sunAzimuth * 180 / Math.PI).toFixed(1);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`日期: ${params.month}`, 40, screenshotSize + 90);
    ctx.fillText(`太阳高度角: ${altitudeDeg}°`, 300, screenshotSize + 90);
    ctx.fillText(`太阳方位角: ${azimuthDeg}°`, 550, screenshotSize + 90);
    ctx.fillText('阴影分析: 开启', 800, screenshotSize + 90);

    const legendX = canvas.width - 300;
    const legendY = screenshotSize + 30;
    const legendWidth = 200;
    const legendHeight = 60;

    const gradient = ctx.createLinearGradient(legendX, 0, legendX + legendWidth, 0);
    gradient.addColorStop(0, '#00ff00');
    gradient.addColorStop(0.5, '#ffff00');
    gradient.addColorStop(1, '#ff0000');

    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('阴影比例图例', legendX + legendWidth / 2, legendY - 10);
    ctx.textAlign = 'left';
    ctx.fillText('0%', legendX - 5, legendY + legendHeight + 25);
    ctx.textAlign = 'right';
    ctx.fillText('100%', legendX + legendWidth + 5, legendY + legendHeight + 25);

    const finalDataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `sunlight-simulation-${Date.now()}.png`;
    link.href = finalDataURL;
    link.click();

    renderer.setSize(originalSize.width / renderer.getPixelRatio(), originalSize.height / renderer.getPixelRatio(), false);
    camera.updateProjectionMatrix();
  };
  img.src = dataURL;
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  sunController.update(delta);
  controls.update();

  if (params.showLightIndicator && lightIndicator) {
    updateLightIndicator();
  }

  renderer.render(scene, camera);
}

init();
