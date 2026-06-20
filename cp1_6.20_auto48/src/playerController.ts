import * as THREE from 'three';
import { GameState } from './gameState';

export type PlayerState = 'idle' | 'jumping' | 'movingLeft' | 'movingRight' | 'crouching';
export type LanePosition = 'left' | 'center' | 'right';

export interface PlayerCollisionInfo {
  position: THREE.Vector3;
  boundingBox: THREE.Box3;
  state: PlayerState;
}

export class PlayerController {
  private mesh: THREE.Group;
  private state: PlayerState = 'idle';
  private lane: LanePosition = 'center';
  private targetLane: LanePosition = 'center';
  private velocityY: number = 0;
  private isGrounded: boolean = true;
  private jumpVelocity: number = 12;
  private gravity: number = -28;
  private groundY: number = 1;
  private laneWidth: number = 2.5;
  private moveSpeed: number = 12;
  private crouchScale: number = 0.5;
  private normalScale: number = 1;
  private currentScale: number = 1;
  private targetScale: number = 1;
  private scaleSpeed: number = 8;
  private boundingBox: THREE.Box3 = new THREE.Box3();
  private keys: Set<string> = new Set();
  private gameState: GameState;
  private listeners: Map<string, Set<(data?: unknown) => void>> = new Map();
  private jumpStartTime: number = 0;
  private moveStartTime: number = 0;
  private basePosition: THREE.Vector3 = new THREE.Vector3(0, 1, 5);
  private trailParticles: THREE.Points | null = null;
  private trailPositions: Float32Array | null = null;
  private maxTrailLength: number = 50;
  private currentTrailIndex: number = 0;

  constructor(scene: THREE.Scene) {
    this.gameState = GameState.getInstance();
    this.mesh = this.createPlayerMesh();
    this.mesh.position.copy(this.basePosition);
    scene.add(this.mesh);
    
    this.createTrail(scene);
    this.setupEventListeners();
  }

  on(event: string, callback: (data?: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data?: unknown) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  private createPlayerMesh(): THREE.Group {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 1);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x00ffff,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      emissive: 0x004444,
      emissiveIntensity: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    body.castShadow = true;
    group.add(body);

    const edges = new THREE.EdgesGeometry(bodyGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.y = 0.75;
    group.add(edgeLines);

    const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.75;
    group.add(glow);

    const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.2, 1, 0.45);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.2, 1, 0.45);
    group.add(rightEye);

    return group;
  }

  private createTrail(scene: THREE.Scene): void {
    const geometry = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(this.maxTrailLength * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));

    const colors = new Float32Array(this.maxTrailLength * 3);
    for (let i = 0; i < this.maxTrailLength; i++) {
      const alpha = 1 - i / this.maxTrailLength;
      colors[i * 3] = 0 * alpha;
      colors[i * 3 + 1] = 1 * alpha;
      colors[i * 3 + 2] = 1 * alpha;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const sizes = new Float32Array(this.maxTrailLength);
    for (let i = 0; i < this.maxTrailLength; i++) {
      sizes[i] = (1 - i / this.maxTrailLength) * 0.3 + 0.05;
    }
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });

    this.trailParticles = new THREE.Points(geometry, material);
    scene.add(this.trailParticles);
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.gameState.getStatus() !== 'playing') return;

    this.keys.add(e.code);

    if (e.code === 'Space' && this.isGrounded && this.state !== 'jumping') {
      this.jump();
    }

    if (e.code === 'KeyA' && this.lane !== 'left' && this.state !== 'movingLeft') {
      this.moveLeft();
    }

    if (e.code === 'KeyD' && this.lane !== 'right' && this.state !== 'movingRight') {
      this.moveRight();
    }

    if (e.code === 'KeyS' && this.isGrounded && this.state !== 'crouching') {
      this.crouch();
    }

    if (e.code === 'Escape') {
      this.emit('pause');
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);

    if (e.code === 'KeyS' && this.state === 'crouching') {
      this.standUp();
    }
  }

  private jump(): void {
    this.state = 'jumping';
    this.isGrounded = false;
    this.velocityY = this.jumpVelocity;
    this.jumpStartTime = performance.now();
    this.emit('jump');

    this.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhysicalMaterial) {
        child.material.emissiveIntensity = 1;
        setTimeout(() => {
          child.material.emissiveIntensity = 0.5;
        }, 200);
      }
    });
  }

  private moveLeft(): void {
    if (this.lane === 'center') {
      this.targetLane = 'left';
    } else if (this.lane === 'right') {
      this.targetLane = 'center';
    }
    this.state = 'movingLeft';
    this.moveStartTime = performance.now();
    this.emit('moveLeft');
  }

  private moveRight(): void {
    if (this.lane === 'center') {
      this.targetLane = 'right';
    } else if (this.lane === 'left') {
      this.targetLane = 'center';
    }
    this.state = 'movingRight';
    this.moveStartTime = performance.now();
    this.emit('moveRight');
  }

  private crouch(): void {
    this.state = 'crouching';
    this.targetScale = this.crouchScale;
    this.groundY = 0.5;
    this.emit('crouch');
  }

  private standUp(): void {
    this.state = 'idle';
    this.targetScale = this.normalScale;
    this.groundY = 1;
    this.emit('standUp');
  }

  update(deltaTime: number, gameSpeed: number): void {
    if (this.gameState.getStatus() !== 'playing') return;

    const speedMultiplier = 1 + (gameSpeed - 1) * 0.3;

    if (this.state === 'jumping' || !this.isGrounded) {
      this.velocityY += this.gravity * deltaTime;
      this.mesh.position.y += this.velocityY * deltaTime;

      if (this.mesh.position.y <= this.groundY) {
        this.mesh.position.y = this.groundY;
        this.velocityY = 0;
        this.isGrounded = true;
        if (this.state === 'jumping') {
          if (this.keys.has('KeyS')) {
            this.crouch();
          } else {
            this.state = 'idle';
          }
        }
        this.emit('land');
      }
    }

    if (this.state === 'movingLeft' || this.state === 'movingRight') {
      const targetX = this.getLaneX(this.targetLane);
      const moveDirection = this.state === 'movingLeft' ? -1 : 1;
      
      this.mesh.position.x += moveDirection * this.moveSpeed * deltaTime * speedMultiplier;

      const reachedTarget = moveDirection > 0 
        ? this.mesh.position.x >= targetX 
        : this.mesh.position.x <= targetX;

      if (reachedTarget) {
        this.mesh.position.x = targetX;
        this.lane = this.targetLane;
        if (this.keys.has('KeyS') && this.isGrounded) {
          this.crouch();
        } else if (!this.isGrounded) {
          this.state = 'jumping';
        } else {
          this.state = 'idle';
        }
      }
    }

    if (this.currentScale !== this.targetScale) {
      const scaleDiff = this.targetScale - this.currentScale;
      this.currentScale += scaleDiff * this.scaleSpeed * deltaTime;
      
      if (Math.abs(this.targetScale - this.currentScale) < 0.01) {
        this.currentScale = this.targetScale;
      }
      
      this.mesh.scale.y = this.currentScale;
      this.mesh.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.position.y = 0.75 * this.currentScale;
        }
      });
    }

    if (this.isGrounded && this.state === 'idle') {
      const bobOffset = Math.sin(performance.now() * 0.005) * 0.05;
      this.mesh.position.y = this.groundY + bobOffset;
    }

    const rotationAmount = this.state === 'movingLeft' ? -0.15 : 
                           this.state === 'movingRight' ? 0.15 : 0;
    this.mesh.rotation.z += (rotationAmount - this.mesh.rotation.z) * 5 * deltaTime;

    const jumpRotation = this.state === 'jumping' ? (performance.now() - this.jumpStartTime) * 0.01 : 0;
    this.mesh.rotation.x = jumpRotation * 0.3;

    this.updateBoundingBox();
    this.updateTrail();
  }

  private getLaneX(lane: LanePosition): number {
    switch (lane) {
      case 'left': return -this.laneWidth;
      case 'center': return 0;
      case 'right': return this.laneWidth;
    }
  }

  private updateBoundingBox(): void {
    const scale = this.currentScale;
    const halfWidth = 0.5;
    const halfHeight = 0.75 * scale;
    const halfDepth = 0.5;

    this.boundingBox.min.set(
      this.mesh.position.x - halfWidth,
      this.mesh.position.y - 0.75 * scale,
      this.mesh.position.z - halfDepth
    );
    this.boundingBox.max.set(
      this.mesh.position.x + halfWidth,
      this.mesh.position.y + halfHeight,
      this.mesh.position.z + halfDepth
    );
  }

  private updateTrail(): void {
    if (!this.trailPositions || !this.trailParticles) return;

    const positionAttribute = this.trailParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    
    for (let i = this.maxTrailLength - 1; i > 0; i--) {
      this.trailPositions[i * 3] = this.trailPositions[(i - 1) * 3];
      this.trailPositions[i * 3 + 1] = this.trailPositions[(i - 1) * 3 + 1];
      this.trailPositions[i * 3 + 2] = this.trailPositions[(i - 1) * 3 + 2];
    }

    this.trailPositions[0] = this.mesh.position.x;
    this.trailPositions[1] = this.mesh.position.y - 0.5 * this.currentScale;
    this.trailPositions[2] = this.mesh.position.z;

    positionAttribute.needsUpdate = true;
    this.currentTrailIndex = (this.currentTrailIndex + 1) % this.maxTrailLength;
  }

  getCollisionInfo(): PlayerCollisionInfo {
    return {
      position: this.mesh.position.clone(),
      boundingBox: this.boundingBox.clone(),
      state: this.state
    };
  }

  getMesh(): THREE.Group {
    return this.mesh;
  }

  getState(): PlayerState {
    return this.state;
  }

  getLane(): LanePosition {
    return this.lane;
  }

  reset(): void {
    this.mesh.position.copy(this.basePosition);
    this.lane = 'center';
    this.targetLane = 'center';
    this.state = 'idle';
    this.velocityY = 0;
    this.isGrounded = true;
    this.currentScale = 1;
    this.targetScale = 1;
    this.mesh.scale.y = 1;
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.position.y = 0.75;
      }
    });
    this.keys.clear();
    this.updateBoundingBox();

    if (this.trailPositions) {
      for (let i = 0; i < this.trailPositions.length; i++) {
        this.trailPositions[i] = 0;
      }
      const positionAttribute = this.trailParticles?.geometry.getAttribute('position') as THREE.BufferAttribute;
      if (positionAttribute) {
        positionAttribute.needsUpdate = true;
      }
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }

  setColor(color: number): void {
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshPhysicalMaterial) {
          child.material.color.setHex(color);
          child.material.emissive.setHex(color);
        }
        if (child.material instanceof THREE.LineBasicMaterial) {
          child.material.color.setHex(color);
        }
        if (child.material instanceof THREE.MeshBasicMaterial && child.geometry instanceof THREE.SphereGeometry) {
          if (child.geometry.parameters.radius === 0.8) {
            child.material.color.setHex(color);
          }
        }
      }
    });
  }
}
