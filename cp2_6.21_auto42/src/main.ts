import * as THREE from 'three';
import { Player } from './player';
import { Level } from './level';
import { TimeRewind } from './timeRewind';
import { GameRenderer } from './renderer';
import { GameLoop } from './gameLoop';
import { Editor, LevelData } from './editor';
import { Menu, MenuAction } from './menu';

type GameMode = 'menu' | 'playing' | 'editor';

let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let player: Player;
let level: Level;
let timeRewind: TimeRewind;
let gameRenderer: GameRenderer;
let gameLoop: GameLoop;
let editor: Editor;
let menu: Menu;
let bgMesh: THREE.Mesh | null = null;

let currentMode: GameMode = 'menu';

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

  menu = new Menu(scene, camera, renderer);
  menu.resize(viewWidth, viewHeight);

  editor = new Editor(scene, camera, renderer);
  editor.resize(viewWidth, viewHeight);

  editor.setCallbacks(
    () => switchToMenu(),
    (data: LevelData) => switchToPlaying(data)
  );

  menu.enter((action: MenuAction, data?: LevelData) => {
    if (action === 'play') {
      switchToPlaying();
    } else if (action === 'editor') {
      switchToEditor();
    } else if (action === 'load' && data) {
      switchToPlaying(data);
    }
  });

  window.addEventListener('resize', onWindowResize);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (currentMode === 'playing') {
        e.preventDefault();
        switchToMenu();
      }
    }
  });

  animate();
}

function switchToMenu(): void {
  if (currentMode === 'playing') {
    cleanupGame();
  }
  if (currentMode === 'editor') {
    editor.exit();
  }

  currentMode = 'menu';
  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = GAME_HEIGHT;
  const viewWidth = viewHeight * aspect;
  menu.resize(viewWidth, viewHeight);

  menu.enter((action: MenuAction, data?: LevelData) => {
    if (action === 'play') {
      switchToPlaying();
    } else if (action === 'editor') {
      switchToEditor();
    } else if (action === 'load' && data) {
      switchToPlaying(data);
    }
  });
}

function switchToPlaying(levelData?: LevelData): void {
  if (currentMode === 'menu') {
    menu.exit();
  }
  if (currentMode === 'editor') {
    editor.exit();
  }

  currentMode = 'playing';

  cleanupGame();

  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = GAME_HEIGHT;
  const viewWidth = viewHeight * aspect;

  if (levelData) {
    level = Editor.buildLevelFromData(levelData, scene);
    player = new Player(levelData.spawnX, levelData.spawnY);
  } else {
    level = new Level();
    level.createLevel(scene);
    player = new Player(0, -150);
  }

  scene.add(player.mesh);

  timeRewind = new TimeRewind();

  gameRenderer = new GameRenderer(scene, camera, renderer, viewWidth, viewHeight);
  gameRenderer.resize(viewWidth, viewHeight);

  gameLoop = new GameLoop(scene, player, level, timeRewind, gameRenderer);
  gameLoop.start();
}

function switchToEditor(): void {
  if (currentMode === 'menu') {
    menu.exit();
  }
  if (currentMode === 'playing') {
    cleanupGame();
  }

  currentMode = 'editor';

  const aspect = window.innerWidth / window.innerHeight;
  const viewHeight = GAME_HEIGHT;
  const viewWidth = viewHeight * aspect;
  editor.resize(viewWidth, viewHeight);

  editor.enter();
}

function cleanupGame(): void {
  if (gameLoop) {
    gameLoop.stop();
    gameLoop.dispose();
    gameLoop = null as any;
  }

  if (level) {
    level.dispose(scene);
    level = null as any;
  }

  if (player) {
    player.clearAfterimages(scene);
    player.clearDustParticles(scene);
    scene.remove(player.mesh);
    player = null as any;
  }

  if (timeRewind) {
    timeRewind.reset();
    timeRewind = null as any;
  }

  if (gameRenderer) {
    gameRenderer.dispose();
    gameRenderer = null as any;
  }

  scene.children = scene.children.filter(child => {
    return child === bgMesh;
  });

  if (bgMesh) {
    scene.add(bgMesh);
  }
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

  bgMesh = new THREE.Mesh(geometry, material);
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

  if (currentMode === 'playing' && gameRenderer) {
    gameRenderer.resize(viewWidth, viewHeight);
  }
  if (currentMode === 'editor') {
    editor.resize(viewWidth, viewHeight);
  }
  if (currentMode === 'menu') {
    menu.resize(viewWidth, viewHeight);
  }
}

function animate(): void {
  requestAnimationFrame(animate);

  if (currentMode === 'editor' && editor.getIsActive()) {
    editor.update();
  }

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init);

export { player, level, timeRewind, gameLoop, scene, camera, renderer };
