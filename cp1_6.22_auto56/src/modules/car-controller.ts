import * as THREE from 'three';

const MAX_SPEED_KMH = 80;
const MAX_SPEED = (MAX_SPEED_KMH * 1000) / 3600;
const ACCELERATION = 10;
const BRAKE_FORCE = 15;
const TURN_SPEED = 2.0;
const TURN_SPEED_LOSS = 0.3;
const DRAG = 0.995;
const FIXED_DT = 0.016;

export interface CarState {
  position: THREE.Vector3;
  rotation: number;
  speed: number;
}

export class CarController {
  private position: THREE.Vector3;
  private rotation: number;
  private speed: number;
  private keys: Set<string>;
  private accumulator: number;

  constructor(startPosition: THREE.Vector3, startRotation: number) {
    this.position = startPosition.clone();
    this.rotation = startRotation;
    this.speed = 0;
    this.keys = new Set();
    this.accumulator = 0;
    this.setupInputListeners();
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  reset(startPosition: THREE.Vector3, startRotation: number): void {
    this.position.copy(startPosition);
    this.rotation = startRotation;
    this.speed = 0;
    this.accumulator = 0;
  }

  private isPressed(key: string): boolean {
    return this.keys.has(key);
  }

  private step(): void {
    if (this.isPressed('w') || this.isPressed('arrowup')) {
      this.speed += ACCELERATION * FIXED_DT;
    }
    if (this.isPressed('s') || this.isPressed('arrowdown')) {
      this.speed -= BRAKE_FORCE * FIXED_DT;
    }

    const isTurning =
      this.isPressed('a') || this.isPressed('arrowleft') || this.isPressed('d') || this.isPressed('arrowright');

    if (isTurning && Math.abs(this.speed) > 0.1) {
      const turnDirection = this.isPressed('a') || this.isPressed('arrowleft') ? -1 : 1;
      const turnFactor = Math.min(Math.abs(this.speed) / 10, 1);
      this.rotation += turnDirection * TURN_SPEED * turnFactor * FIXED_DT;
      this.speed *= 1 - TURN_SPEED_LOSS * FIXED_DT * 60;
    }

    this.speed *= DRAG;
    this.speed = Math.max(-MAX_SPEED * 0.3, Math.min(MAX_SPEED, this.speed));

    const forward = new THREE.Vector3(
      Math.sin(this.rotation),
      0,
      Math.cos(this.rotation)
    );
    this.position.addScaledVector(forward, this.speed * FIXED_DT);
    this.position.y = 0.5;
  }

  update(deltaTime: number): CarState {
    this.accumulator += deltaTime;
    while (this.accumulator >= FIXED_DT) {
      this.step();
      this.accumulator -= FIXED_DT;
    }

    return {
      position: this.position.clone(),
      rotation: this.rotation,
      speed: this.speed
    };
  }

  getState(): CarState {
    return {
      position: this.position.clone(),
      rotation: this.rotation,
      speed: this.speed
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', () => {});
    window.removeEventListener('keyup', () => {});
  }
}
