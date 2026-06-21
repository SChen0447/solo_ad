import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Room, RoomConfig, WallReflectivity, WallName } from './room';
import { SoundSource } from './soundSource';
import { UIController } from './uiController';

interface AppState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  room: Room;
  source: SoundSource;
  ui: UIController;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  hoveredWall: WallName | null;
  fpsCounter: {
    lastTime: number;
    frames: number;
    fps: number;
  };
}

let state: AppState;
let animationId: number;
let domCanvas: HTMLElement;
let domPanel: HTMLElement;
let domFps: HTMLElement;
let domRayCount: HTMLElement;
let domReflectionCount: HTMLElement;

function init(): void {
  domCanvas = document.getElementById('canvas-container')!;
  domPanel = document.getElementById('panel-container')!;
  domFps = document.getElementById('fps')!;
  domRayCount = document.getElementById('ray-count')!;
  domReflectionCount = document.getElementById('reflection-count')!;

  const { clientWidth, clientHeight } = domCanvas;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1020, 0.035);

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d')!;
  const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#142040');
  gradient.addColorStop(0.5, '#0a1530');
  gradient.addColorStop(1, '#050812');
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, 2, 512);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  bgTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTexture;

  const camera = new THREE.PerspectiveCamera(55, clientWidth / clientHeight, 0.1, 500);
  camera.position.set(10, 7, 12);
  camera.lookAt(0, 1.5, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(clientWidth, clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  domCanvas.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.8;
  controls.screenSpacePanning = true;
  controls.minDistance = 2;
  controls.maxDistance = 60;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 1.5, 0);
  controls.update();

  const ambientLight = new THREE.AmbientLight(0x607090, 0.7);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xa0b0ff, 0x302015, 0.6);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(8, 15, 6);
  scene.add(dirLight);

  const room = new Room(scene);
  const source = new SoundSource(scene, room.data);
  source.setPosition(new THREE.Vector3(0, 1.5, 0));

  const raycaster = new THREE.Raycaster();
  raycaster.params.Mesh.threshold = 0.1;
  const mouse = new THREE.Vector2();

  state = {
    scene,
    camera,
    renderer,
    controls,
    room,
    source,
    ui: null as unknown as UIController,
    raycaster,
    mouse,
    hoveredWall: null,
    fpsCounter: {
      lastTime: performance.now(),
      frames: 0,
      fps: 0,
    },
  };

  state.ui = new UIController(domPanel, room, source, {
    onRoomChanged: handleRoomChanged,
    onSourcePositionChanged: handleSourcePositionChanged,
    onRayParamsChanged: handleRayParamsChanged,
    onReflectivityChanged: handleReflectivityChanged,
    onRecalculateRays: handleRecalculateRays,
  });

  setupEvents();
  handleRecalculateRays();
  updateStats();
  animate();
}

function handleRoomChanged(config: RoomConfig): void {
  state.room.create(config);
  state.source.updateRoom(state.room.data);
  state.source.setPosition(state.source.getPosition());
  state.ui.refreshControllers();
}

function handleSourcePositionChanged(position: THREE.Vector3): void {
  state.source.setPosition(position);
}

function handleRayParamsChanged(rayCount: number, maxReflections: number): void {
}

function handleReflectivityChanged(reflectivity: WallReflectivity): void {
  state.room.data.reflectivity = { ...reflectivity };
}

function handleRecalculateRays(): void {
  const params = state.ui.getParams();
  state.source.recalculateRays({
    rayCount: params.rayCount,
    maxReflections: params.maxReflections,
  });
  updateStats();
}

function setupEvents(): void {
  window.addEventListener('resize', onWindowResize);
  state.renderer.domElement.addEventListener('pointermove', onPointerMove);
  state.renderer.domElement.addEventListener('pointerleave', onPointerLeave);
}

function onWindowResize(): void {
  const { clientWidth, clientHeight } = domCanvas;
  state.camera.aspect = clientWidth / clientHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(clientWidth, clientHeight);
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function onPointerMove(event: PointerEvent): void {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerLeave(): void {
  if (state.hoveredWall !== null) {
    state.hoveredWall = null;
    state.room.highlightWall(null);
  }
}

function updateHoverPick(elapsed: number): void {
  const dampingFactor = 0.1 + 0.9 * (1 - Math.exp(-elapsed * 15));

  state.raycaster.setFromCamera(state.mouse, state.camera);
  const wallMeshes = state.room.data.walls.map((w) => w.mesh);
  const intersects = state.raycaster.intersectObjects(wallMeshes, false);

  let targetWall: WallName | null = null;
  if (intersects.length > 0) {
    targetWall = intersects[0].object.userData.wallName as WallName;
  }

  if (targetWall !== state.hoveredWall) {
    state.hoveredWall = targetWall;
    state.room.highlightWall(targetWall);
  }
}

function updateFps(elapsedMs: number): void {
  state.fpsCounter.frames++;
  const timeSince = elapsedMs - state.fpsCounter.lastTime;

  if (timeSince >= 500) {
    state.fpsCounter.fps = (state.fpsCounter.frames * 1000) / timeSince;
    state.fpsCounter.frames = 0;
    state.fpsCounter.lastTime = elapsedMs;

    domFps.textContent = state.fpsCounter.fps.toFixed(0);
  }
}

function updateStats(): void {
  domRayCount.textContent = state.source.getRayCount().toString();
  domReflectionCount.textContent = state.source.getTotalReflections().toString();
}

const _vTmpClock = new THREE.Clock();

function animate(): void {
  animationId = requestAnimationFrame(animate);

  const delta = _vTmpClock.getDelta();
  const elapsed = _vTmpClock.getElapsedTime();

  state.controls.update();
  state.source.updatePulse(elapsed);
  updateHoverPick(delta);
  updateFps(performance.now());

  state.renderer.render(state.scene, state.camera);
}

function cleanup(): void {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  window.removeEventListener('resize', onWindowResize);
  if (state?.renderer?.domElement) {
    state.renderer.domElement.removeEventListener('pointermove', onPointerMove);
    state.renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
  }

  if (state?.ui) state.ui.dispose();
  if (state?.source) state.source.dispose();
  if (state?.renderer) {
    state.renderer.dispose();
    if (state.renderer.domElement.parentElement) {
      state.renderer.domElement.parentElement.removeChild(state.renderer.domElement);
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', cleanup);
