import * as THREE from 'three';

export type CameraMode = 'first-person' | 'third-person';

export interface CameraState {
  mode: CameraMode;
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
}

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private domElement: HTMLElement;
  
  private mode: CameraMode = 'third-person';
  private yaw: number = 0;
  private pitch: number = -0.3;
  
  private playerHeight: number = 1.7;
  private playerRadius: number = 0.4;
  private moveSpeed: number = 8.0;
  private lookSensitivity: number = 0.002;
  
  private keys: Record<string, boolean> = {};
  private isPointerLocked: boolean = false;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  
  private velocityY: number = 0;
  private gravity: number = 25.0;
  private isGrounded: boolean = true;
  
  private collisionBoxes: THREE.Box3[] = [];
  private floorHeights: Map<number, number> = new Map();
  
  private bobTime: number = 0;
  private bobAmplitude: number = 0.05;
  private shakeAmplitude: number = 0;
  private shakeDecay: number = 0.92;
  
  private thirdPersonDistance: number = 6;
  private thirdPersonHeight: number = 2;
  
  private currentFloor: number = 1;
  private currentRoom: string = '';
  
  private onCollisionCallback?: () => void;
  private onPositionChangeCallback?: (position: THREE.Vector3, floor: number) => void;
  
  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene, domElement: HTMLElement) {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    
    this.setupEventListeners();
    this.camera.position.set(20, 10, 20);
    this.camera.lookAt(0, 2, 0);
  }
  
  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
    
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });
    
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        
        this.yaw -= deltaX * this.lookSensitivity;
        this.pitch -= deltaY * this.lookSensitivity;
        
        this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });
    
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        this.setMode('first-person');
      } else {
        this.setMode('third-person');
      }
    }, { passive: false });
  }
  
  setCollisionBoxes(boxes: THREE.Box3[]): void {
    this.collisionBoxes = boxes;
  }
  
  setFloorHeights(heights: Map<number, number>): void {
    this.floorHeights = heights;
  }
  
  setMode(mode: CameraMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
  }
  
  getMode(): CameraMode {
    return this.mode;
  }
  
  toggleMode(): CameraMode {
    this.setMode(this.mode === 'first-person' ? 'third-person' : 'first-person');
    return this.mode;
  }
  
  setPosition(position: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.velocityY = 0;
    this.updateCurrentFloor();
  }
  
  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }
  
  setYawPitch(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
  }
  
  getCurrentFloor(): number {
    return this.currentFloor;
  }
  
  getCurrentRoom(): string {
    return this.currentRoom;
  }
  
  setOnCollisionCallback(callback: () => void): void {
    this.onCollisionCallback = callback;
  }
  
  setOnPositionChangeCallback(callback: (position: THREE.Vector3, floor: number) => void): void {
    this.onPositionChangeCallback = callback;
  }
  
  update(deltaTime: number): void {
    const moveDir = new THREE.Vector3();
    
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    );
    
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    
    if (this.keys['KeyW']) moveDir.add(forward);
    if (this.keys['KeyS']) moveDir.sub(forward);
    if (this.keys['KeyA']) moveDir.sub(right);
    if (this.keys['KeyD']) moveDir.add(right);
    
    if (moveDir.length() > 0) {
      moveDir.normalize();
      
      const moveSpeed = this.mode === 'first-person' ? this.moveSpeed : this.moveSpeed * 0.7;
      const deltaMove = moveDir.multiplyScalar(moveSpeed * deltaTime);
      
      const newPos = this.camera.position.clone().add(deltaMove);
      
      if (!this.checkCollision(newPos)) {
        this.camera.position.copy(newPos);
        this.bobTime += deltaTime * 8;
        this.shakeAmplitude = Math.min(this.shakeAmplitude + 0.02, 0.08);
      } else {
        if (this.onCollisionCallback) {
          this.onCollisionCallback();
        }
        this.shakeAmplitude = Math.min(this.shakeAmplitude + 0.1, 0.15);
      }
      
      this.updateCurrentFloor();
      
      if (this.onPositionChangeCallback) {
        this.onPositionChangeCallback(this.camera.position, this.currentFloor);
      }
    }
    
    if (!this.isGrounded) {
      this.velocityY -= this.gravity * deltaTime;
      this.camera.position.y += this.velocityY * deltaTime;
      
      const floorY = this.getFloorAtPosition(this.camera.position.x, this.camera.position.z) + this.playerHeight;
      if (this.camera.position.y <= floorY) {
        this.camera.position.y = floorY;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    }
    
    this.shakeAmplitude *= this.shakeDecay;
    
    this.updateCameraPosition();
  }
  
  private checkCollision(position: THREE.Vector3): boolean {
    const playerBox = new THREE.Box3(
      new THREE.Vector3(
        position.x - this.playerRadius,
        position.y - this.playerHeight,
        position.z - this.playerRadius
      ),
      new THREE.Vector3(
        position.x + this.playerRadius,
        position.y + 0.2,
        position.z + this.playerRadius
      )
    );
    
    for (const box of this.collisionBoxes) {
      if (playerBox.intersectsBox(box)) {
        return true;
      }
    }
    
    return false;
  }
  
  private getFloorAtPosition(x: number, z: number): number {
    let closestFloor = 0;
    let minDist = Infinity;
    
    for (const [floor, height] of this.floorHeights) {
      const dist = Math.abs((this.camera.position.y - this.playerHeight) - height);
      if (dist < minDist) {
        minDist = dist;
        closestFloor = floor;
      }
    }
    
    return this.floorHeights.get(closestFloor) || 0;
  }
  
  private updateCurrentFloor(): void {
    const playerBottomY = this.camera.position.y - this.playerHeight;
    let closestFloor = 1;
    let minDist = Infinity;
    
    for (const [floor, height] of this.floorHeights) {
      const dist = Math.abs(playerBottomY - height);
      if (dist < minDist) {
        minDist = dist;
        closestFloor = floor;
      }
    }
    
    if (closestFloor !== this.currentFloor) {
      this.currentFloor = closestFloor;
    }
  }
  
  private updateCameraPosition(): void {
    if (this.mode === 'first-person') {
      const bobOffset = Math.sin(this.bobTime) * this.bobAmplitude;
      const shakeX = (Math.random() - 0.5) * this.shakeAmplitude;
      const shakeY = (Math.random() - 0.5) * this.shakeAmplitude;
      
      const lookDir = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      );
      
      const eyePos = this.camera.position.clone();
      eyePos.y += bobOffset + shakeY;
      eyePos.x += shakeX;
      
      this.camera.position.copy(eyePos);
      this.camera.lookAt(eyePos.clone().add(lookDir));
      
    } else {
      const target = this.camera.position.clone();
      target.y -= this.playerHeight * 0.3;
      
      const offset = new THREE.Vector3(
        Math.sin(this.yaw) * this.thirdPersonDistance,
        this.thirdPersonHeight,
        Math.cos(this.yaw) * this.thirdPersonDistance
      );
      
      const camPos = target.clone().add(offset);
      this.camera.position.copy(camPos);
      this.camera.lookAt(target);
    }
  }
  
  playIntroAnimation(buildingCenter: THREE.Vector3, buildingHeight: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const duration = 4000;
      const radius = 25;
      const height = buildingHeight + 8;
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const angle = eased * Math.PI * 2 - Math.PI / 2;
        const x = buildingCenter.x + Math.cos(angle) * radius;
        const z = buildingCenter.z + Math.sin(angle) * radius;
        const y = buildingCenter.y + height * (0.5 + eased * 0.5);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(buildingCenter.x, buildingCenter.y + buildingHeight * 0.3, buildingCenter.z);
        
        this.yaw = -angle + Math.PI;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.camera.position.set(0, this.floorHeights.get(1) || 0 + this.playerHeight, -12);
          this.yaw = 0;
          this.pitch = -0.1;
          resolve();
        }
      };
      
      animate();
    });
  }
  
  moveToPosition(targetPos: THREE.Vector3, duration: number = 1200): Promise<void> {
    return new Promise((resolve) => {
      const startPos = this.camera.position.clone();
      const startTime = performance.now();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        this.camera.position.lerpVectors(startPos, targetPos, eased);
        this.updateCurrentFloor();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.velocityY = 0;
          this.isGrounded = true;
          if (this.onPositionChangeCallback) {
            this.onPositionChangeCallback(this.camera.position, this.currentFloor);
          }
          resolve();
        }
      };
      
      animate();
    });
  }
  
  teleportTo(position: THREE.Vector3, duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      const overlay = document.getElementById('teleport-overlay');
      if (overlay) {
        overlay.style.opacity = '1';
        overlay.style.transition = `opacity ${duration / 2}ms ease-in-out`;
      }
      
      setTimeout(() => {
        this.camera.position.copy(position);
        this.velocityY = 0;
        this.isGrounded = true;
        this.updateCurrentFloor();
        
        if (this.onPositionChangeCallback) {
          this.onPositionChangeCallback(this.camera.position, this.currentFloor);
        }
        
        if (overlay) {
          overlay.style.opacity = '0';
        }
        
        setTimeout(resolve, duration / 2);
      }, duration / 2);
    });
  }
}
