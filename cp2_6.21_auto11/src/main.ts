import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import { Flame, DEFAULT_PARAMS, FlameParams } from './flame';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3, 7);
camera.lookAt(0, 2, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.update();

const flame = new Flame(scene);

const gui = new GUI({ width: 300 });
gui.domElement.style.marginTop = '10px';
gui.domElement.style.marginRight = '10px';

const params = {
  particleCount: DEFAULT_PARAMS.particleCount,
  particleSize: DEFAULT_PARAMS.particleSize,
  riseSpeed: DEFAULT_PARAMS.riseSpeed,
  driftAmplitude: DEFAULT_PARAMS.driftAmplitude,
  colorScheme: DEFAULT_PARAMS.colorScheme,
  emitInterval: DEFAULT_PARAMS.emitInterval,
  flameWidth: DEFAULT_PARAMS.flameWidth,
  reset: () => {
    params.particleCount = DEFAULT_PARAMS.particleCount;
    params.particleSize = DEFAULT_PARAMS.particleSize;
    params.riseSpeed = DEFAULT_PARAMS.riseSpeed;
    params.driftAmplitude = DEFAULT_PARAMS.driftAmplitude;
    params.colorScheme = DEFAULT_PARAMS.colorScheme;
    params.emitInterval = DEFAULT_PARAMS.emitInterval;
    params.flameWidth = DEFAULT_PARAMS.flameWidth;
    flame.resetParams();
    updateGUI();
  },
};

function updateGUI() {
  for (const controller of gui.__controllers) {
    controller.updateDisplay();
  }
  for (const folder of Object.values(gui.__folders)) {
    for (const controller of folder.__controllers) {
      controller.updateDisplay();
    }
  }
}

gui.add(params, 'particleCount', 500, 3000, 100).name('粒子数量').onChange((v: number) => {
  flame.setParams({ particleCount: v });
});
gui.add(params, 'particleSize', 0.05, 0.3, 0.01).name('粒子大小').onChange((v: number) => {
  flame.setParams({ particleSize: v });
});
gui.add(params, 'riseSpeed', 0.2, 5.0, 0.1).name('上浮速度').onChange((v: number) => {
  flame.setParams({ riseSpeed: v });
});
gui.add(params, 'driftAmplitude', 0.0, 1.0, 0.05).name('水平漂移幅度').onChange((v: number) => {
  flame.setParams({ driftAmplitude: v });
});
gui.add(params, 'colorScheme', ['橙黄渐变', '蓝紫渐变', '红绿渐变']).name('颜色基色').onChange((v: string) => {
  flame.setParams({ colorScheme: v });
});
gui.add(params, 'emitInterval', 0.1, 2.0, 0.1).name('粒子发射频率').onChange((v: number) => {
  flame.setParams({ emitInterval: v });
});
gui.add(params, 'flameWidth', 1.0, 3.0, 0.1).name('火焰宽度').onChange((v: number) => {
  flame.setParams({ flameWidth: v });
});
gui.add(params, 'reset').name('重置');

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function updateMouseHover(event: MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const origin = raycaster.ray.origin;
  const dir = raycaster.ray.direction;

  const flameBase = new THREE.Vector3(0, -0.5, 0);
  const toOrigin = new THREE.Vector3().subVectors(origin, flameBase);

  const axisDir = new THREE.Vector3(0, 1, 0);
  const proj = toOrigin.dot(axisDir);
  const dirProj = dir.dot(axisDir);

  if (Math.abs(dirProj) < 0.001) {
    flame.setMouseWorld(null);
    return;
  }

  const tClosest = -proj / dirProj;
  if (tClosest < 0) {
    flame.setMouseWorld(null);
    return;
  }

  const closestPoint = new THREE.Vector3(
    origin.x + dir.x * tClosest,
    origin.y + dir.y * tClosest,
    origin.z + dir.z * tClosest
  );

  if (closestPoint.y < -1.5 || closestPoint.y > 8) {
    flame.setMouseWorld(null);
    return;
  }

  const horizDist = Math.sqrt(closestPoint.x * closestPoint.x + closestPoint.z * closestPoint.z);
  const baseWidth = flame.getParams().flameWidth;
  const maxR = baseWidth * (1 - Math.max(0, Math.min(1, (closestPoint.y + 1) / 7)) * (1 - 0.5 / 1.5));
  const threshold = Math.max(1.5, maxR + 0.5);

  if (horizDist < threshold) {
    flame.setMouseWorld(closestPoint);
  } else {
    flame.setMouseWorld(null);
  }
}

renderer.domElement.addEventListener('mousemove', (event: MouseEvent) => {
  updateMouseHover(event);
});

renderer.domElement.addEventListener('mouseleave', () => {
  flame.setMouseWorld(null);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  flame.update(delta);
  controls.update();

  renderer.render(scene, camera);
}

animate();
