import * as THREE from 'three';
import { MazeData } from './mazeGenerator';

export class PlayerController {
  camera: THREE.PerspectiveCamera;
  private maze: MazeData;
  private cellSize: number;
  private moveSpeed: number;
  private rotSpeed: number;
  private playerRadius: number;
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;
  private keys: Record<string, boolean> = {};
  private mouseX: number = 0;
  private isPointerLocked: boolean = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    maze: MazeData,
    cellSize: number,
    startX: number,
    startZ: number
  ) {
    this.camera = camera;
    this.maze = maze;
    this.cellSize = cellSize;
    this.moveSpeed = 4.0;
    this.rotSpeed = 2.0;
    this.playerRadius = 0.25;

    this.camera.position.set(startX, 1.6, startZ);
    this.camera.rotation.order = 'YXZ';

    this.setupInput();
  }

  private setupInput(): void {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseX += e.movementX;
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement !== null;
    });
  }

  requestPointerLock(): void {
    document.body.requestPointerLock();
  }

  update(delta: number): void {
    if (!this.isPointerLocked) return;

    const rotation = -this.mouseX * 0.002;
    this.mouseX = 0;
    this.camera.rotation.y += rotation;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

    let moveX = 0;
    let moveZ = 0;
    let isMoving = false;

    if (this.keys['KeyW']) {
      moveX += forward.x;
      moveZ += forward.z;
      isMoving = true;
    }
    if (this.keys['KeyS']) {
      moveX -= forward.x;
      moveZ -= forward.z;
      isMoving = true;
    }
    if (this.keys['KeyA']) {
      moveX -= right.x;
      moveZ -= right.z;
      isMoving = true;
    }
    if (this.keys['KeyD']) {
      moveX += right.x;
      moveZ += right.z;
      isMoving = true;
    }

    if (isMoving) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (len > 0) {
        moveX /= len;
        moveZ /= len;
      }

      const speed = this.moveSpeed * delta;
      const newX = this.camera.position.x + moveX * speed;
      const newZ = this.camera.position.z + moveZ * speed;

      const canMoveX = !this.checkCollision(newX, this.camera.position.z);
      const canMoveZ = !this.checkCollision(this.camera.position.x, newZ);

      if (canMoveX) {
        this.camera.position.x = newX;
      }
      if (canMoveZ) {
        this.camera.position.z = newZ;
      }

      this.shakeIntensity = 0.015;
    }

    if (this.shakeIntensity > 0.001) {
      this.camera.position.y = 1.6 + (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.camera.position.y = 1.6;
      this.shakeIntensity = 0;
    }
  }

  private checkCollision(x: number, z: number): boolean {
    const r = this.playerRadius;
    const checks = [
      { x: x - r, z: z - r },
      { x: x + r, z: z - r },
      { x: x - r, z: z + r },
      { x: x + r, z: z + r },
      { x: x, z: z - r },
      { x: x, z: z + r },
      { x: x - r, z: z },
      { x: x + r, z: z },
    ];

    for (const pt of checks) {
      const col = Math.round(pt.x / this.cellSize);
      const row = Math.round(pt.z / this.cellSize);
      if (
        row < 0 ||
        row >= this.maze.length ||
        col < 0 ||
        col >= this.maze[0].length
      ) {
        return true;
      }
      if (this.maze[row][col] === 1) {
        return true;
      }
    }
    return false;
  }

  getPosition(): { x: number; z: number } {
    return {
      x: this.camera.position.x,
      z: this.camera.position.z,
    };
  }

  getRotationY(): number {
    return this.camera.rotation.y;
  }

  getGridPosition(): { row: number; col: number } {
    return {
      row: Math.round(this.camera.position.z / this.cellSize),
      col: Math.round(this.camera.position.x / this.cellSize),
    };
  }
}
