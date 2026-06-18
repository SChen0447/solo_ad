import * as THREE from 'three';
import { mazeGenerator, MazeData } from './mazeGenerator';
import { PlayerController } from './playerController';
import { EffectManager } from './effectManager';

export interface SceneCallbacks {
  onCollectKey: (index: number, total: number) => void;
  onEnterPortal: () => void;
  onMinimapUpdate: (data: {
    playerCell: { x: number; y: number };
    explored: boolean[][];
    keyPositions: { x: number; y: number; collected: boolean }[];
    portalPosition: { x: number; y: number } | null;
    mazeWidth: number;
    mazeHeight: number;
  }) => void;
}

const CELL_SIZE = 2;
const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.15;

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mazeData: MazeData | null;
  private mazeGroup: THREE.Group;
  private playerController: PlayerController;
  private playerMesh: THREE.Group | null;
  private effectManager: EffectManager;
  private callbacks: SceneCallbacks;
  private currentFloor: number;
  private collectedKeys: boolean[];
  private portalActive: boolean;
  private portalPosition: THREE.Vector3 | null;
  private exploredCells: boolean[][];
  private animationFrame: number;
  private generationProgress: number;
  private isGenerating: boolean;
  private wallMeshes: THREE.Mesh[];
  private floorMeshes: THREE.Mesh[];
  private keyMeshes: Map<number, THREE.Mesh>;
  private wallBoundingBoxes: THREE.Box3[];

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    callbacks: SceneCallbacks
  ) {
    this.scene = scene;
    this.camera = camera;
    this.callbacks = callbacks;
    this.mazeData = null;
    this.mazeGroup = new THREE.Group();
    this.scene.add(this.mazeGroup);
    this.playerMesh = null;
    this.effectManager = new EffectManager(scene);
    this.playerController = new PlayerController(canvas);
    this.currentFloor = 1;
    this.collectedKeys = [];
    this.portalActive = false;
    this.portalPosition = null;
    this.exploredCells = [];
    this.animationFrame = 0;
    this.generationProgress = 0;
    this.isGenerating = false;
    this.wallMeshes = [];
    this.floorMeshes = [];
    this.keyMeshes = new Map();
    this.wallBoundingBoxes = [];

    this.setupLights();
    this.setupBackground();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x3a2a5a, 0.7);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xa080ff, 0.5);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffa040, 0.3);
    fillLight.position.set(-10, 5, -10);
    this.scene.add(fillLight);
  }

  private setupBackground(): void {
    this.scene.background = new THREE.Color(0x1a1028);
    this.scene.fog = new THREE.Fog(0x1a1028, 8, 25);
  }

  public async generateFloor(floorNum: number): Promise<void> {
    this.currentFloor = floorNum;
    this.isGenerating = true;
    this.generationProgress = 0;
    this.clearMaze();

    this.mazeData = mazeGenerator.generate(20, 30);
    this.exploredCells = [];
    for (let y = 0; y < this.mazeData.height; y++) {
      this.exploredCells[y] = [];
      for (let x = 0; x < this.mazeData.width; x++) {
        this.exploredCells[y][x] = false;
      }
    }

    this.collectedKeys = new Array(5).fill(false);
    this.portalActive = false;
    this.portalPosition = null;

    const worldStart = this.cellToWorld(this.mazeData.startPosition.x, this.mazeData.startPosition.y);
    this.playerController.setPosition(worldStart.x, 0.5, worldStart.z);

    this.createPlayerMesh();

    await this.animateMazeGeneration();

    this.spawnKeys();
    this.markExplored(this.mazeData.startPosition.x, this.mazeData.startPosition.y);
    this.updateMinimap();

    this.isGenerating = false;
  }

  private createPlayerMesh(): void {
    if (this.playerMesh) {
      this.scene.remove(this.playerMesh);
    }
    this.playerMesh = this.effectManager.createPlayerGlow(new THREE.Vector3());
  }

  private clearMaze(): void {
    this.wallMeshes.forEach(m => {
      this.mazeGroup.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.floorMeshes.forEach(m => {
      this.mazeGroup.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.wallMeshes = [];
    this.floorMeshes = [];
    this.wallBoundingBoxes = [];
    this.keyMeshes.clear();
    this.effectManager.clearAll();
  }

  private async animateMazeGeneration(): Promise<void> {
    if (!this.mazeData) return;
    const { width, height, cells, generationOrder } = this.mazeData;
    const totalCells = generationOrder.length;

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      metalness: 0.2,
      roughness: 0.8,
      emissive: 0x0a0a18,
      emissiveIntensity: 0.2
    });
    const floorEdgeMat = new THREE.LineBasicMaterial({
      color: 0x5a4a8a,
      transparent: true,
      opacity: 0.5
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a4a,
      metalness: 0.3,
      roughness: 0.6,
      emissive: 0x0a1a3a,
      emissiveIntensity: 0.15
    });
    const wallEdgeMat = new THREE.LineBasicMaterial({
      color: 0x4a6aaa,
      transparent: true,
      opacity: 0.4
    });

    const batchSize = Math.max(1, Math.floor(totalCells / 60));
    let processed = 0;

    const processBatch = () => {
      const end = Math.min(processed + batchSize, totalCells);
      for (let i = processed; i < end; i++) {
        const cell = generationOrder[i];
        const cx = cell.x;
        const cy = cell.y;
        const world = this.cellToWorld(cx, cy);

        const floorGeo = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(world.x, 0, world.z);
        this.mazeGroup.add(floor);
        this.floorMeshes.push(floor);

        const floorEdges = new THREE.EdgesGeometry(floorGeo);
        const floorLine = new THREE.LineSegments(floorEdges, floorEdgeMat);
        floorLine.rotation.x = -Math.PI / 2;
        floorLine.position.set(world.x, 0.01, world.z);
        this.mazeGroup.add(floorLine);

        if (cells[cy][cx].walls.top) this.addWall(cx, cy, 'top', wallMat, wallEdgeMat);
        if (cells[cy][cx].walls.right) this.addWall(cx, cy, 'right', wallMat, wallEdgeMat);
        if (cells[cy][cx].walls.bottom) this.addWall(cx, cy, 'bottom', wallMat, wallEdgeMat);
        if (cells[cy][cx].walls.left) this.addWall(cx, cy, 'left', wallMat, wallEdgeMat);
      }
      processed = end;
      this.generationProgress = processed / totalCells;
    };

    return new Promise<void>((resolve) => {
      const animate = () => {
        processBatch();
        if (processed < totalCells) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      animate();
    });
  }

  private addWall(
    cx: number,
    cy: number,
    side: 'top' | 'right' | 'bottom' | 'left',
    material: THREE.MeshStandardMaterial,
    edgeMaterial: THREE.LineBasicMaterial
  ): void {
    let width: number, height: number, depth: number;
    let x: number, z: number;
    const world = this.cellToWorld(cx, cy);

    switch (side) {
      case 'top':
        width = CELL_SIZE;
        height = WALL_HEIGHT;
        depth = WALL_THICKNESS;
        x = world.x;
        z = world.z - CELL_SIZE / 2;
        break;
      case 'right':
        width = WALL_THICKNESS;
        height = WALL_HEIGHT;
        depth = CELL_SIZE;
        x = world.x + CELL_SIZE / 2;
        z = world.z;
        break;
      case 'bottom':
        width = CELL_SIZE;
        height = WALL_HEIGHT;
        depth = WALL_THICKNESS;
        x = world.x;
        z = world.z + CELL_SIZE / 2;
        break;
      case 'left':
        width = WALL_THICKNESS;
        height = WALL_HEIGHT;
        depth = CELL_SIZE;
        x = world.x - CELL_SIZE / 2;
        z = world.z;
        break;
    }

    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wall = new THREE.Mesh(wallGeo, material);
    wall.position.set(x, height / 2, z);
    this.mazeGroup.add(wall);
    this.wallMeshes.push(wall);

    const edges = new THREE.EdgesGeometry(wallGeo);
    const edgeLine = new THREE.LineSegments(edges, edgeMaterial);
    edgeLine.position.set(x, height / 2, z);
    this.mazeGroup.add(edgeLine);

    this.wallBoundingBoxes.push(new THREE.Box3().setFromObject(wall));
  }

  private spawnKeys(): void {
    if (!this.mazeData) return;
    this.mazeData.keyPositions.forEach((pos, index) => {
      const world = this.cellToWorld(pos.x, pos.y);
      const mesh = this.effectManager.createKeyFragment(
        new THREE.Vector3(world.x, 0.8, world.z),
        index
      );
      this.keyMeshes.set(index, mesh);
    });
  }

  public update(time: number, deltaTime: number): void {
    this.animationFrame++;
    this.effectManager.updatePortal(time);

    if (this.isGenerating || !this.mazeData) return;

    const { velocity, moved } = this.playerController.update(deltaTime);

    if (moved) {
      this.handleCollision(velocity);
    }

    const playerPos = this.playerController.position.clone();
    if (this.playerMesh) {
      this.playerMesh.position.copy(playerPos);
    }

    const camDir = this.playerController.getCameraDirection();
    this.camera.position.set(playerPos.x, playerPos.y + 0.3, playerPos.z);
    this.camera.lookAt(
      playerPos.x + camDir.x,
      playerPos.y + 0.3 + camDir.y,
      playerPos.z + camDir.z
    );

    this.effectManager.updatePlayerEffects(playerPos, time, deltaTime);

    const playerCell = this.worldToCell(playerPos.x, playerPos.z);
    if (playerCell.x >= 0 && playerCell.x < this.mazeData.width &&
        playerCell.y >= 0 && playerCell.y < this.mazeData.height) {
      if (!this.exploredCells[playerCell.y][playerCell.x]) {
        this.markExplored(playerCell.x, playerCell.y);
      }
      this.updateMinimap();
    }

    this.checkKeyInteraction(playerPos);
    this.checkPortalInteraction(playerPos);
  }

  private handleCollision(velocity: THREE.Vector3): void {
    const pos = this.playerController.position.clone();
    const radius = 0.35;

    const testPos = pos.clone();
    testPos.x += velocity.x;
    if (this.checkWallCollision(testPos, radius)) {
      velocity.x = 0;
      this.spawnCollisionRipple(pos, new THREE.Vector3(Math.sign(velocity.x), 0, 0));
    }

    testPos.copy(pos);
    testPos.z += velocity.z;
    if (this.checkWallCollision(testPos, radius)) {
      velocity.z = 0;
      this.spawnCollisionRipple(pos, new THREE.Vector3(0, 0, Math.sign(velocity.z)));
    }

    this.playerController.applyPosition(pos.clone().add(new THREE.Vector3(velocity.x, 0, velocity.z)));
  }

  private checkWallCollision(pos: THREE.Vector3, radius: number): boolean {
    for (const box of this.wallBoundingBoxes) {
      if (pos.x + radius > box.min.x && pos.x - radius < box.max.x &&
          pos.z + radius > box.min.z && pos.z - radius < box.max.z) {
        return true;
      }
    }
    return false;
  }

  private spawnCollisionRipple(pos: THREE.Vector3, dir: THREE.Vector3): void {
    const ripplePos = pos.clone().addScaledVector(dir, 0.45);
    ripplePos.y = WALL_HEIGHT / 2;
    const normal = dir.clone().normalize();
    this.effectManager.createWallRipple(ripplePos, normal);
  }

  private checkKeyInteraction(playerPos: THREE.Vector3): void {
    if (!this.mazeData) return;

    this.mazeData.keyPositions.forEach((keyPos, index) => {
      if (this.collectedKeys[index]) {
        this.effectManager.setKeyPulse(index, false, performance.now() / 1000);
        return;
      }
      const world = this.cellToWorld(keyPos.x, keyPos.y);
      const dx = playerPos.x - world.x;
      const dz = playerPos.z - world.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < CELL_SIZE * 3) {
        this.effectManager.setKeyPulse(index, true, performance.now() / 1000);
      } else {
        this.effectManager.setKeyPulse(index, false, performance.now() / 1000);
      }

      if (dist < 0.7) {
        this.collectKey(index);
      }
    });
  }

  private collectKey(index: number): void {
    this.collectedKeys[index] = true;
    this.effectManager.collectKey(index);
    this.effectManager.playPickupSound();
    const total = this.collectedKeys.filter(k => k).length;
    this.callbacks.onCollectKey(index, total);

    if (total === 5 && this.mazeData && !this.portalActive) {
      this.spawnPortal();
    }
  }

  private spawnPortal(): void {
    const playerPos = this.playerController.position.clone();
    const forward = this.playerController.getForwardVector();
    const portalPos = playerPos.clone().addScaledVector(forward, 2.5);
    portalPos.y = 1.0;

    this.effectManager.createPortal(portalPos, forward);
    this.effectManager.playPortalSound();
    this.portalActive = true;
    this.portalPosition = portalPos;
  }

  private checkPortalInteraction(playerPos: THREE.Vector3): void {
    if (!this.portalActive || !this.portalPosition) return;
    const dx = playerPos.x - this.portalPosition.x;
    const dz = playerPos.z - this.portalPosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 1.0) {
      this.callbacks.onEnterPortal();
      this.effectManager.removePortal();
      this.portalActive = false;
      this.portalPosition = null;
    }
  }

  private markExplored(cx: number, cy: number): void {
    if (!this.mazeData) return;
    const radius = 2;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < this.mazeData.width && ny >= 0 && ny < this.mazeData.height) {
          this.exploredCells[ny][nx] = true;
        }
      }
    }
  }

  private updateMinimap(): void {
    if (!this.mazeData) return;
    const playerCell = this.worldToCell(this.playerController.position.x, this.playerController.position.z);
    const keyInfo = this.mazeData.keyPositions.map((pos, i) => ({
      x: pos.x,
      y: pos.y,
      collected: this.collectedKeys[i]
    }));
    this.callbacks.onMinimapUpdate({
      playerCell,
      explored: this.exploredCells,
      keyPositions: keyInfo,
      portalPosition: this.portalActive ? this.mazeData.portalPosition : null,
      mazeWidth: this.mazeData.width,
      mazeHeight: this.mazeData.height
    });
  }

  private cellToWorld(cx: number, cy: number): THREE.Vector3 {
    if (!this.mazeData) return new THREE.Vector3(cx * CELL_SIZE, 0, cy * CELL_SIZE);
    const offsetX = -this.mazeData.width * CELL_SIZE / 2;
    const offsetZ = -this.mazeData.height * CELL_SIZE / 2;
    return new THREE.Vector3(
      cx * CELL_SIZE + CELL_SIZE / 2 + offsetX,
      0,
      cy * CELL_SIZE + CELL_SIZE / 2 + offsetZ
    );
  }

  private worldToCell(wx: number, wz: number): { x: number; y: number } {
    if (!this.mazeData) return { x: 0, y: 0 };
    const offsetX = -this.mazeData.width * CELL_SIZE / 2;
    const offsetZ = -this.mazeData.height * CELL_SIZE / 2;
    return {
      x: Math.floor((wx - offsetX) / CELL_SIZE),
      y: Math.floor((wz - offsetZ) / CELL_SIZE)
    };
  }

  public getCurrentFloor(): number {
    return this.currentFloor;
  }
}
