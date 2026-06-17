import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  onFrame: (dt: number) => void;
}

export function initScene(container: HTMLElement): SceneContext {
  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0x0b0b1a);
  scene.fog = new THREE.FogExp2(0x0b0b1a, 0.003);

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(80, 60, 100);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 20;
  controls.maxDistance = 250;
  controls.maxPolarAngle = Math.PI / 2.05;
  controls.target.set(0, 5, 0);

  const ambientLight = new THREE.AmbientLight(0x303050, 0.6);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0x4466aa, 0x111122, 0.3);
  scene.add(hemisphereLight);

  const gridHelper = new THREE.GridHelper(160, 40, 0x1a1a3e, 0x12122a);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0e0e1e,
    roughness: 0.95,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const callbacks: Array<(dt: number) => void> = [];

  const onFrame = (dt: number) => {
    for (const cb of callbacks) cb(dt);
  };

  const ctx: SceneContext = {
    scene,
    camera,
    renderer,
    controls,
    onFrame,
  };

  const handleResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', handleResize);

  return ctx;
}
