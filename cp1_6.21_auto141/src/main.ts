import * as THREE from 'three';
import GUI from 'lil-gui';
import { Forest } from './forest';
import { Environment } from './environment';
import { InteractionManager } from './interaction';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let forest: Forest;
let environment: Environment;
let interaction: InteractionManager;
let clock: THREE.Clock;
let gui: GUI;
let currentMonth: number = 1;

const fpsCounter = document.getElementById('fps-counter') as HTMLDivElement;
let frameCount = 0;
let fpsTime = 0;

function init(): void {
  const container = document.getElementById('canvas-container') as HTMLElement;
  const width = window.innerWidth;
  const height = window.innerHeight;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
  camera.position.set(18, 16, 18);
  camera.lookAt(0, 2.5, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  environment = new Environment(scene, renderer);
  forest = new Forest(scene);

  interaction = new InteractionManager({
    scene,
    camera,
    renderer,
    forest,
    container,
    onMonthChange: (m: number) => {
      currentMonth = m;
      forest.setMonth(m);
      environment.setMonth(m);
    }
  });

  clock = new THREE.Clock();
  setupGUI();
  window.addEventListener('resize', onResize);
  animate();
}

function setupGUI(): void {
  gui = new GUI({ title: '控制面板', width: 220 });

  const params = {
    自动循环季节: false,
    重置视角: () => interaction.resetCamera()
  };

  gui.add(params, '自动循环季节').onChange((v: boolean) => {
    interaction.setAutoPlay(v);
  });

  gui.add(params, '重置视角');

  gui.add({ '月份': 1 }, '月份', 1, 12, 0.01)
    .onChange((v: number) => {
      if (!interaction.isAutoPlaying()) {
        currentMonth = v;
        forest.setMonth(v);
        environment.setMonth(v);
        interaction.setMonthValue(v);
      }
    })
    .listen()
    .name('时间轴调试');
}

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  forest.update(delta);
  environment.update(delta);
  interaction.update(delta);

  for (const c of gui.controllers) {
    if (c._name === '时间轴调试') {
      c.setValue(currentMonth);
      c.updateDisplay();
      break;
    }
  }

  frameCount++;
  fpsTime += delta;
  if (fpsTime >= 0.5) {
    const fps = Math.round(frameCount / fpsTime);
    fpsCounter.textContent = `FPS: ${fps}`;
    frameCount = 0;
    fpsTime = 0;
  }

  renderer.render(scene, camera);
}

init();
