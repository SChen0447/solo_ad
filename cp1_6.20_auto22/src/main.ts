import * as THREE from 'three';
import { generateMaze, findPassablePosition, MazeData } from './mazeGenerator';
import { PlayerController } from './playerController';
import { AudioEngine } from './audioEngine';
import { AIHunter } from './aiHunter';
import { GameUI } from './gameUI';

const MAZE_ROWS = 10;
const MAZE_COLS = 10;
const CELL_SIZE = 2;
const CATCH_DISTANCE = 2 * CELL_SIZE;
const EXIT_ROW_OFFSET = -1;
const EXIT_COL_OFFSET = -1;

enum GameState {
  MENU,
  PLAYING,
  WON,
  LOST,
}

class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;

  private maze!: MazeData;
  private player!: PlayerController;
  private hunter!: AIHunter;
  private audio!: AudioEngine;
  private ui!: GameUI;

  private state: GameState = GameState.MENU;
  private gameTime: number = 0;
  private exitRow: number = 0;
  private exitCol: number = 0;

  private flashlight!: THREE.SpotLight;
  private flashlightTarget!: THREE.Object3D;
  private ambientLight!: THREE.AmbientLight;
  private exitMarker!: THREE.Mesh;
  private exitLight!: THREE.PointLight;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;

    const container = document.getElementById('game-container')!;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 1, 18);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      50
    );

    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.initGame();
  }

  private initGame(): void {
    this.maze = generateMaze(MAZE_ROWS, MAZE_COLS);

    const gridRows = this.maze.length;
    const gridCols = this.maze[0].length;

    const playerStart = findPassablePosition(this.maze, 1, 1);
    this.exitRow = gridRows + EXIT_ROW_OFFSET;
    this.exitCol = gridCols + EXIT_COL_OFFSET;
    const exitPos = findPassablePosition(this.maze, this.exitRow, this.exitCol);
    this.exitRow = exitPos.row;
    this.exitCol = exitPos.col;

    let hunterRow: number;
    let hunterCol: number;
    do {
      const pos = findPassablePosition(this.maze, Math.floor(gridRows / 2), Math.floor(gridCols / 2));
      hunterRow = pos.row;
      hunterCol = pos.col;
    } while (
      Math.sqrt((hunterRow - playerStart.row) ** 2 + (hunterCol - playerStart.col) ** 2) < 6
    );

    this.buildMazeGeometry();
    this.buildFloor();
    this.buildExitMarker();

    this.ambientLight = new THREE.AmbientLight(0x111122, 0.15);
    this.scene.add(this.ambientLight);

    this.flashlight = new THREE.SpotLight(0xffffcc, 3, 20, Math.PI / 5, 0.4, 1.5);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 512;
    this.flashlight.shadow.mapSize.height = 512;
    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.camera.add(this.flashlight);
    this.flashlight.position.set(0, 0, 0);
    this.flashlightTarget.position.set(0, -0.5, -1);
    this.scene.add(this.camera);

    const playerX = playerStart.col * CELL_SIZE;
    const playerZ = playerStart.row * CELL_SIZE;
    this.player = new PlayerController(
      this.camera,
      this.maze,
      CELL_SIZE,
      playerX,
      playerZ
    );

    this.hunter = new AIHunter(
      this.maze,
      CELL_SIZE,
      hunterRow,
      hunterCol,
      this.player['moveSpeed'] || 4.0
    );
    this.scene.add(this.hunter.mesh);
    this.scene.add(this.hunter.light);

    this.audio = new AudioEngine(CELL_SIZE);

    this.ui = new GameUI(this.maze, CELL_SIZE);
    this.ui.onStart(() => {
      this.startGame();
    });

    document.addEventListener('pointerlockchange', () => {
      if (this.state === GameState.PLAYING) {
        if (document.pointerLockElement) {
          this.ui.hideClickHint();
        } else {
          this.ui.showClickHint();
        }
      }
    });

    this.renderer.domElement.addEventListener('click', () => {
      if (this.state === GameState.PLAYING && !document.pointerLockElement) {
        this.player.requestPointerLock();
      }
    });

    this.animate();
  }

  private buildMazeGeometry(): void {
    const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE * 1.5, CELL_SIZE);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.85,
      roughness: 0.9,
      metalness: 0.1,
    });

    const wallMesh = new THREE.InstancedMesh(
      wallGeometry,
      wallMaterial,
      this.maze.length * this.maze[0].length
    );
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let index = 0;

    for (let r = 0; r < this.maze.length; r++) {
      for (let c = 0; c < this.maze[0].length; c++) {
        if (this.maze[r][c] === 1) {
          dummy.position.set(
            c * CELL_SIZE,
            CELL_SIZE * 0.75,
            r * CELL_SIZE
          );
          dummy.updateMatrix();
          wallMesh.setMatrixAt(index, dummy.matrix);
          index++;
        }
      }
    }

    wallMesh.count = index;
    wallMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(wallMesh);
  }

  private buildFloor(): void {
    const gridRows = this.maze.length;
    const gridCols = this.maze[0].length;
    const width = gridCols * CELL_SIZE;
    const height = gridRows * CELL_SIZE;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#15152a';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let i = 0; i <= 512; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(gridCols / 2, gridRows / 2);

    const floorGeometry = new THREE.PlaneGeometry(width + CELL_SIZE, height + CELL_SIZE);
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.05,
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(
      (gridCols * CELL_SIZE) / 2,
      0,
      (gridRows * CELL_SIZE) / 2
    );
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceilingGeometry = new THREE.PlaneGeometry(width + CELL_SIZE, height + CELL_SIZE);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x050510,
      roughness: 1,
      metalness: 0,
    });

    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(
      (gridCols * CELL_SIZE) / 2,
      CELL_SIZE * 1.5,
      (gridRows * CELL_SIZE) / 2
    );
    this.scene.add(ceiling);
  }

  private buildExitMarker(): void {
    const exitX = this.exitCol * CELL_SIZE;
    const exitZ = this.exitRow * CELL_SIZE;

    const markerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x00ff41,
      transparent: true,
      opacity: 0.8,
    });
    this.exitMarker = new THREE.Mesh(markerGeo, markerMat);
    this.exitMarker.position.set(exitX, 0.05, exitZ);
    this.scene.add(this.exitMarker);

    this.exitLight = new THREE.PointLight(0x00ff41, 1, 5);
    this.exitLight.position.set(exitX, 1, exitZ);
    this.scene.add(this.exitLight);
  }

  private async startGame(): Promise<void> {
    this.state = GameState.PLAYING;
    this.gameTime = 0;
    this.ui.hideStartScreen();
    this.ui.showGameUI();

    await this.audio.init();
    this.audio.startGame();

    this.player.requestPointerLock();
    this.clock.start();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.state === GameState.PLAYING) {
      this.gameTime += delta;
      this.updateGame(delta);
    }

    if (this.exitMarker) {
      this.exitMarker.rotation.y += delta * 2;
      this.exitLight.intensity = 0.5 + Math.sin(this.gameTime * 3) * 0.5;
      const scale = 1 + Math.sin(this.gameTime * 2) * 0.2;
      this.exitMarker.scale.set(scale, 1, scale);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateGame(delta: number): void {
    this.player.update(delta);

    const playerPos = this.player.getPosition();
    const playerGrid = this.player.getGridPosition();

    this.hunter.update(delta, this.gameTime, playerGrid.row, playerGrid.col);

    const hunterPos = this.hunter.getWorldPosition();
    const hunterGrid = this.hunter.getGridPosition();

    this.audio.update({
      playerX: playerPos.x,
      playerZ: playerPos.z,
      playerRotY: this.player.getRotationY(),
      hunterX: hunterPos.x,
      hunterZ: hunterPos.z,
    });

    const distToWorld = this.hunter.getDistanceToPlayerWorld(
      playerPos.x,
      playerPos.z
    );
    const distInCells = distToWorld / CELL_SIZE;

    this.ui.updateScore(this.gameTime);
    this.ui.updateHint(distInCells);
    this.ui.updateMinimap(
      playerGrid.row,
      playerGrid.col,
      hunterGrid.row,
      hunterGrid.col,
      this.exitRow,
      this.exitCol
    );

    if (distToWorld < CATCH_DISTANCE) {
      this.endGame(false);
      return;
    }

    const dx = playerPos.x - this.exitCol * CELL_SIZE;
    const dz = playerPos.z - this.exitRow * CELL_SIZE;
    const exitDist = Math.sqrt(dx * dx + dz * dz);
    if (exitDist < CELL_SIZE) {
      this.endGame(true);
    }
  }

  private endGame(won: boolean): void {
    this.state = won ? GameState.WON : GameState.LOST;
    this.audio.stopGame();

    if (won) {
      this.audio.playVictory();
    } else {
      this.audio.playCaught();
    }

    this.ui.showEndScreen(won, this.gameTime);

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
}

new Game();
