import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { GUI } from 'dat.gui';
import type { PhysicsParams } from './particleEngine';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  gui: GUI;
  physicsParams: PhysicsParams;
}

export function createScene(container: HTMLElement): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b1a);
  scene.fog = new THREE.FogExp2(0x0b0b1a, 0.006);

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    2000
  );
  camera.position.set(0, 20, 120);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x0b0b1a, 1);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.minDistance = 2;
  controls.maxDistance = 500;
  controls.zoomSpeed = 0.8;
  controls.rotateSpeed = 0.6;
  controls.panSpeed = 0.5;
  controls.target.set(0, 0, 0);

  addAmbientElements(scene);

  const physicsParams: PhysicsParams = {
    gravity: 0.5,
    vortexStrength: 4.0,
    repulsionRadius: 8.0
  };

  const gui = createGUI(physicsParams);

  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  return { scene, camera, renderer, controls, gui, physicsParams };
}

function addAmbientElements(scene: THREE.Scene): void {
  const ambientLight = new THREE.AmbientLight(0x404080, 0.3);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x4466ff, 0.5, 300);
  pointLight1.position.set(80, 60, 80);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xff4466, 0.3, 300);
  pointLight2.position.set(-80, -40, -60);
  scene.add(pointLight2);

  const gridHelper = new THREE.GridHelper(200, 40, 0x222255, 0x111133);
  scene.add(gridHelper);

  const originGeom = new THREE.SphereGeometry(0.8, 16, 16);
  const originMat = new THREE.MeshBasicMaterial({
    color: 0x8888ff,
    transparent: true,
    opacity: 0.6
  });
  const originSphere = new THREE.Mesh(originGeom, originMat);
  scene.add(originSphere);
}

function createGUI(params: PhysicsParams): GUI {
  const gui = new GUI({ width: 300 } as any);
  gui.domElement.querySelector('.title') &&
    ((gui.domElement.querySelector('.title') as HTMLElement).textContent = '粒子力场控制');

  gui.domElement.style.position = 'fixed';
  gui.domElement.style.top = '16px';
  gui.domElement.style.left = '16px';
  gui.domElement.style.zIndex = '100';
  gui.domElement.style.borderRadius = '8px';
  gui.domElement.style.overflow = 'hidden';

  const physicsFolder = gui.addFolder('物理参数');
  physicsFolder.open();

  physicsFolder
    .add(params, 'gravity', -5, 5, 0.1)
    .name('重力强度')
    .listen();

  physicsFolder
    .add(params, 'vortexStrength', 0, 10, 0.1)
    .name('涡流强度')
    .listen();

  physicsFolder
    .add(params, 'repulsionRadius', 0, 20, 0.5)
    .name('排斥力半径')
    .listen();

  return gui;
}

export function disposeScene(ctx: SceneContext): void {
  ctx.renderer.dispose();
  ctx.controls.dispose();
  ctx.gui.destroy();
  if (ctx.renderer.domElement.parentNode) {
    ctx.renderer.domElement.parentNode.removeChild(ctx.renderer.domElement);
  }
}
