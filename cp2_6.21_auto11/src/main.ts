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
let isMouseOnCanvas = false;

renderer.domElement.addEventListener('mousemove', (event: MouseEvent) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  isMouseOnCanvas = true;

  raycaster.setFromCamera(mouse, camera);
  const direction = raycaster.ray.direction;
  const origin = raycaster.ray.origin;

  const t = (2 - origin.y) / direction.y;
  if (t > 0) {
    const hitPoint = new THREE.Vector3(
      origin.x + direction.x * t,
      origin.y + direction.y * t,
      origin.z + direction.z * t
    );
    const dist = Math.sqrt(hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z);
    if (dist < 3 && hitPoint.y > -1 && hitPoint.y < 8) {
      flame.setMouseWorld(hitPoint);
    } else {
      flame.setMouseWorld(null);
    }
  } else {
    flame.setMouseWorld(null);
  }
});

renderer.domElement.addEventListener('mouseleave', () => {
  isMouseOnCanvas = false;
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
