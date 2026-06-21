import * as THREE from 'three';

export class PlayerController {
  public camera: THREE.PerspectiveCamera;
  public moveSpeed: number = 3;
  public mouseSensitivity: number = 0.002;
  public playerHeight: number = 1.6;
  public roomSize: number = 10;
  
  private keys: Record<string, boolean> = {};
  private yaw: number = 0;
  private pitch: number = 0;
  private pitchMin: number = -Math.PI / 6;
  private pitchMax: number = Math.PI / 6;
  private isPointerLocked: boolean = false;
  
  private euler: THREE.Euler;
  private velocity: THREE.Vector3;
  
  public onViewChange: (() => void) | null = null;
  public lastMoveTime: number = 0;
  
  private headBobTime: number = 0;
  private headBobAmplitude: number = 0.001;
  private isWalking: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, container: HTMLElement) {
    this.camera = camera;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.velocity = new THREE.Vector3();

    this.setupEventListeners(container);
  }

  private setupEventListeners(container: HTMLElement): void {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      this.lastMoveTime = performance.now();
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    container.addEventListener('click', () => {
      container.requestPointerLock?.();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === container;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;
      
      this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch));
      
      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y = this.yaw;
      this.euler.x = this.pitch;
      this.camera.quaternion.setFromEuler(this.euler);
    });
  }

  public update(deltaTime: number): void {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW']) moveZ -= 1;
    if (this.keys['KeyS']) moveZ += 1;
    if (this.keys['KeyA']) moveX -= 1;
    if (this.keys['KeyD']) moveX += 1;

    this.isWalking = moveX !== 0 || moveZ !== 0;

    if (this.isWalking) {
      this.lastMoveTime = performance.now();
      
      this.velocity.set(0, 0, 0);
      this.velocity.addScaledVector(forward, -moveZ * this.moveSpeed * deltaTime);
      this.velocity.addScaledVector(right, moveX * this.moveSpeed * deltaTime);

      const newPos = this.camera.position.clone().add(this.velocity);
      
      const halfRoom = this.roomSize / 2 - 0.5;
      newPos.x = Math.max(-halfRoom, Math.min(halfRoom, newPos.x));
      newPos.z = Math.max(-halfRoom, Math.min(halfRoom, newPos.z));
      
      this.camera.position.copy(newPos);
      this.camera.position.y = this.playerHeight;

      this.headBobTime += deltaTime * 8;
      const bobOffset = Math.sin(this.headBobTime) * this.headBobAmplitude;
      this.camera.position.y += bobOffset;
    }
  }

  public isMoving(): boolean {
    return this.isWalking;
  }

  public getYaw(): number {
    return this.yaw;
  }

  public setYaw(yaw: number): void {
    this.yaw = yaw;
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(this.euler);
  }

  public getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  public getForwardDirection(): THREE.Vector3 {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    return forward;
  }
}
