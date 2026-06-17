import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { createBuilding } from './building';
import { createSunController, SunController } from './sunControl';
import { createShadowAnalyzer, ShadowAnalyzer } from './shadowAnalyzer';

const monthSunData: Record<number, { elevation: number; azimuth: number }> = {
  1: { elevation: 30, azimuth: 150 },
  2: { elevation: 38, azimuth: 140 },
  3: { elevation: 48, azimuth: 120 },
  4: { elevation: 58, azimuth: 100 },
  5: { elevation: 68, azimuth: 80 },
  6: { elevation: 72, azimuth: 65 },
  7: { elevation: 70, azimuth: 70 },
  8: { elevation: 62, azimuth: 90 },
  9: { elevation: 52, azimuth: 110 },
  10: { elevation: 42, azimuth: 130 },
  11: { elevation: 32, azimuth: 145 },
  12: { elevation: 27, azimuth: 155 }
};

const monthNames: Record<number, string> = {
  1: '一月',
  2: '二月',
  3: '三月',
  4: '四月',
  5: '五月',
  6: '六月',
  7: '七月',
  8: '八月',
  9: '九月',
  10: '十月',
  11: '十一月',
  12: '十二月'
};

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let directionalLight: THREE.DirectionalLight;
let ambientLight: THREE.AmbientLight;
let building: THREE.Group;
let sunController: SunController;
let shadowAnalyzer: ShadowAnalyzer;
let ground: THREE.Mesh;
let gui: GUI;

const params = {
  month: 6,
  showShadowGrid: true
};

let isAnimating = false;
let animStartTime = 0;
let animDuration = 500;
let animStartTheta = 0;
let animStartPhi = 0;
let animTargetTheta = 0;
let animTargetPhi = 0;

let lastShadowUpdateTime = 0;
const shadowUpdateInterval = 50;

function init(): void {
  const container = document.getElementById('app') as HTMLDivElement;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(18, 14, 18);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true
  });
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
  controls.minDistance = 5;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2 - 0.1;
  controls.target.set(0, 3, 0);

  ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -15;
  directionalLight.shadow.camera.right = 15;
  directionalLight.shadow.camera.top = 15;
  directionalLight.shadow.camera.bottom = -15;
  directionalLight.shadow.bias = -0.001;
  scene.add(directionalLight);
  scene.add(directionalLight.target);

  createGround();

  building = createBuilding();
  scene.add(building);

  sunController = createSunController(scene, camera, renderer.domElement, 15);

  shadowAnalyzer = createShadowAnalyzer(scene, 15, 15);

  setupGUI();

  const initialData = monthSunData[params.month];
  setSunByAngles(initialData.elevation, initialData.azimuth);

  window.addEventListener('resize', onWindowResize);

  const screenshotBtn = document.getElementById('screenshot-btn');
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', takeScreenshot);
  }

  animate();
}

function createGround(): void {
  const groundSize = 20;
  const divisions = 40;
  const geometry = new THREE.PlaneGeometry(groundSize, groundSize, divisions, divisions);
  geometry.rotateX(-Math.PI / 2);

  const colors = new Float32Array(geometry.attributes.position.count * 3);
  const baseColor = new THREE.Color(0x2d5a27);
  const darkColor = new THREE.Color(0x1e3d1a);

  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const x = geometry.attributes.position.getX(i);
    const z = geometry.attributes.position.getZ(i);
    const gridX = Math.floor((x + groundSize / 2) / (groundSize / divisions));
    const gridZ = Math.floor((z + groundSize / 2) / (groundSize / divisions));
    const isDark = (gridX + gridZ) % 2 === 0;
    const color = isDark ? darkColor : baseColor;
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.05
  });

  ground = new THREE.Mesh(geometry, material);
  ground.receiveShadow = true;
  scene.add(ground);
}

function setupGUI(): void {
  gui = new GUI({ title: '参数设置' });
  gui.domElement.style.position = 'absolute';
  gui.domElement.style.top = '60px';
  gui.domElement.style.left = '20px';
  gui.domElement.style.right = 'auto';

  const monthOptions: Record<string, number> = {};
  for (let i = 1; i <= 12; i++) {
    monthOptions[monthNames[i]] = i;
  }

  gui.add(params, 'month', monthOptions)
    .name('模拟月份')
    .onChange((value: number) => {
      startMonthAnimation(value);
    });

  gui.add(params, 'showShadowGrid')
    .name('显示阴影网格')
    .onChange((value: boolean) => {
      shadowAnalyzer.gridMesh.visible = value;
    });
}

function setSunByAngles(elevationDeg: number, azimuthDeg: number): void {
  const elevation = (elevationDeg * Math.PI) / 180;
  const azimuth = (azimuthDeg * Math.PI) / 180;
  const theta = azimuth;
  const phi = Math.PI / 2 - elevation;
  sunController.setSpherical(theta, phi);
}

function startMonthAnimation(month: number): void {
  const targetData = monthSunData[month];
  const elevation = (targetData.elevation * Math.PI) / 180;
  const azimuth = (targetData.azimuth * Math.PI) / 180;

  animTargetTheta = azimuth;
  animTargetPhi = Math.PI / 2 - elevation;

  const current = sunController.getSpherical();
  animStartTheta = current.theta;
  animStartPhi = current.phi;

  animStartTime = performance.now();
  animDuration = 500;
  isAnimating = true;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateAnimation(currentTime: number): void {
  if (!isAnimating) return;

  const elapsed = currentTime - animStartTime;
  const progress = Math.min(elapsed / animDuration, 1);
  const eased = easeInOutCubic(progress);

  const theta = animStartTheta + (animTargetTheta - animStartTheta) * eased;
  const phi = animStartPhi + (animTargetPhi - animStartPhi) * eased;

  sunController.setSpherical(theta, phi);

  if (progress >= 1) {
    isAnimating = false;
  }
}

function updateDirectionalLight(): void {
  const direction = sunController.getDirection();
  const distance = 20;
  directionalLight.position.copy(direction).multiplyScalar(-distance);
  directionalLight.target.position.set(0, 3, 0);
  directionalLight.target.updateMatrixWorld();
}

function updateShadowGrid(currentTime: number): void {
  if (!params.showShadowGrid) return;
  if (currentTime - lastShadowUpdateTime < shadowUpdateInterval) return;

  lastShadowUpdateTime = currentTime;
  const direction = sunController.getDirection();
  shadowAnalyzer.update(direction, building);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function getSunAngles(): { elevation: number; azimuth: number } {
  const { theta, phi } = sunController.getSpherical();
  const elevation = 90 - (phi * 180) / Math.PI;
  let azimuth = (theta * 180) / Math.PI;
  if (azimuth < 0) azimuth += 360;
  return { elevation, azimuth };
}

function takeScreenshot(): void {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  const pixelRatio = renderer.getPixelRatio();

  const screenshotSize = 2048;
  renderer.setSize(screenshotSize, screenshotSize, false);
  renderer.setPixelRatio(1);

  camera.aspect = 1;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  const gl = renderer.getContext();
  const pixels = new Uint8Array(screenshotSize * screenshotSize * 4);
  gl.readPixels(0, 0, screenshotSize, screenshotSize, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  const infoBarHeight = 200;
  const totalHeight = screenshotSize + infoBarHeight;

  const canvas = document.createElement('canvas');
  canvas.width = screenshotSize;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d')!;

  const imageData = ctx.createImageData(screenshotSize, screenshotSize);
  for (let y = 0; y < screenshotSize; y++) {
    for (let x = 0; x < screenshotSize; x++) {
      const srcIdx = ((screenshotSize - 1 - y) * screenshotSize + x) * 4;
      const dstIdx = (y * screenshotSize + x) * 4;
      imageData.data[dstIdx] = pixels[srcIdx];
      imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
      imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
      imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }
  ctx.putImageData(imageData, 0, 0);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, screenshotSize, screenshotSize, infoBarHeight);

  const angles = getSunAngles();
  const avgShadow = shadowAnalyzer.getAverageShadowFactor();
  const currentMonth = monthNames[params.month];

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'top';

  ctx.fillText(`日期：${currentMonth}`, 60, screenshotSize + 30);
  ctx.fillText(`太阳高度角：${angles.elevation.toFixed(1)}°`, 60, screenshotSize + 85);
  ctx.fillText(`太阳方位角：${angles.azimuth.toFixed(1)}°`, 60, screenshotSize + 140);

  const legendX = screenshotSize - 350;
  const legendY = screenshotSize + 30;
  const legendWidth = 280;
  const legendHeight = 140;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(legendX - 15, legendY - 10, legendWidth + 30, legendHeight + 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('阴影分析', legendX, legendY);

  const gradientBarX = legendX;
  const gradientBarY = legendY + 45;
  const gradientBarWidth = 220;
  const gradientBarHeight = 30;

  const gradient = ctx.createLinearGradient(gradientBarX, 0, gradientBarX + gradientBarWidth, 0);
  gradient.addColorStop(0, '#00ff00');
  gradient.addColorStop(0.5, '#ffff00');
  gradient.addColorStop(1, '#ff0000');

  ctx.fillStyle = gradient;
  ctx.fillRect(gradientBarX, gradientBarY, gradientBarWidth, gradientBarHeight);

  ctx.fillStyle = '#cccccc';
  ctx.font = '22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('0%', gradientBarX, gradientBarY + gradientBarHeight + 8);
  ctx.textAlign = 'center';
  ctx.fillText('50%', gradientBarX + gradientBarWidth / 2, gradientBarY + gradientBarHeight + 8);
  ctx.textAlign = 'right';
  ctx.fillText('100%', gradientBarX + gradientBarWidth, gradientBarY + gradientBarHeight + 8);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#ffffff';
  ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`平均阴影：${(avgShadow * 100).toFixed(1)}%`, legendX, gradientBarY + gradientBarHeight + 45);

  renderer.setSize(originalWidth, originalHeight, false);
  renderer.setPixelRatio(pixelRatio);
  camera.aspect = originalWidth / originalHeight;
  camera.updateProjectionMatrix();

  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `日照模拟_${currentMonth}_${dateStr}.png`;
  link.href = dataURL;
  link.click();
}

function animate(): void {
  requestAnimationFrame(animate);

  const currentTime = performance.now();

  updateAnimation(currentTime);
  updateDirectionalLight();
  updateShadowGrid(currentTime);

  controls.update();
  renderer.render(scene, camera);
}

init();
