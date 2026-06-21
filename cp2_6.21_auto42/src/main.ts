import * as THREE from 'three';
import { Player } from './player';
import { Level } from './level';
import { TimeRewind } from './timeRewind';
import { GameRenderer } from './renderer';
import { GameLoop } from './gameLoop';

let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let player: Player;
let level: Level;
let timeRewind: TimeRewind;
let gameRenderer: GameRenderer;
let gameLoop: GameLoop;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

function init(): void {
  scene = new THREE.Scene();

  setupBackground();

  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = GAME_HEIGHT;
  const viewWidth = viewHeight * aspect;

  camera = new THREE.OrthographicCamera(
    -viewWidth / 2,
    viewWidth / 2,
    viewHeight / 2,
    -viewHeight / 2,
    0.1,
    1000
  );
  camera.position.z = 100;

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x1A1A2E, 1);
  document.body.appendChild(renderer.domElement);

  level = new Level();
  level.createLevel(scene);

  player = new Player(0, -150);
  scene.add(player.mesh);

  timeRewind = new TimeRewind();

  gameRenderer = new GameRenderer(
    scene,
    camera,
    renderer,
    viewWidth,
    viewHeight
  );
  gameRenderer.resize(viewWidth, viewHeight);

  gameLoop = new GameLoop(scene, player, level, timeRewind, gameRenderer);
  gameLoop.start();

  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupBackground(): void {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#1A1A2E');
  gradient.addColorStop(1, '#16213E');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const geometry = new THREE.PlaneGeometry(2000, 1500);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });

  const bgMesh = new THREE.Mesh(geometry, material);
  bgMesh.position.z = -10;
  scene.add(bgMesh);
}

function onWindowResize(): void {
  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = GAME_HEIGHT;
  const viewWidth = viewHeight * aspect;

  camera.left = -viewWidth / 2;
  camera.right = viewWidth / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  if (gameRenderer) {
    gameRenderer.resize(viewWidth, viewHeight);
  }
}

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init);

export { player, level, timeRewind, gameLoop, scene, camera, renderer };
