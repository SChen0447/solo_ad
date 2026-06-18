import * as THREE from 'three';

export class PlayerController {
  public position: THREE.Vector3;
  public yaw: number;
  public pitch: number;
  public moveSpeed: number = 6.0;
  public lookSpeed: number = 0.002;

  private keys: Set<string>;
  private canvas: HTMLCanvasElement;
  private pointerLocked: boolean;
  private velocity: THREE.Vector3;

  constructor(canvas: HTMLCanvasElement, startX: number = 0, startZ: number = 0) {
    this.canvas = canvas;
    this.position = new THREE.Vector3(startX, 0, startZ);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.pointerLocked = false;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    this.canvas.addEventListener('click', () => {
      if (!this.pointerLocked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.yaw -= e.movementX * this.lookSpeed;
      this.pitch -= e.movementY * this.lookSpeed;
      this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
    });
  }

  public update(deltaTime: number): { velocity: THREE.Vector3; moved: boolean } {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();

    if (this.keys.has('KeyW')) move.add(forward);
    if (this.keys.has('KeyS')) move.sub(forward);
    if (this.keys.has('KeyD')) move.add(right);
    if (this.keys.has('KeyA')) move.sub(right);

    const moved = move.lengthSq() > 0;
    if (moved) {
      move.normalize().multiplyScalar(this.moveSpeed * deltaTime);
    }

    this.velocity.copy(move);
    this.position.add(move);

    return { velocity: this.velocity.clone(), moved };
  }

  public applyPosition(pos: THREE.Vector3): void {
    this.position.copy(pos);
  }

  public getForwardVector(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  public getCameraDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
  }

  public setPosition(x: number, y: number, z: number): void {
    this.position.set(x, y, z);
  }

  public isPointerLocked(): boolean {
    return this.pointerLocked;
  }
}
