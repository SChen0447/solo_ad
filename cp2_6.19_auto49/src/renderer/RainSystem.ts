import * as THREE from 'three';

const MAX_PARTICLES = 5000;

export class RainSystem {
  private scene: THREE.Scene;
  private particleSystem!: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private sizes: Float32Array;
  private rainIntensity: number = 0;
  private targetIntensityFactor: number = 0;
  private currentIntensityFactor: number = 0;
  private areaSize: number = 50;
  private heightRange: number = 30;
  private currentActiveCount: number = 0;
  private lastActiveCount: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    if (MAX_PARTICLES < 5000) {
      console.warn('[RainSystem] MAX_PARTICLES below 5000, forcing 5000');
      (this as any).MAX_PARTICLES = 5000;
    }
    const safeMax = Math.max(5000, MAX_PARTICLES);
    this.positions = new Float32Array(safeMax * 3);
    this.velocities = new Float32Array(safeMax);
    this.sizes = new Float32Array(safeMax);

    if (this.positions.length < safeMax * 3) {
      console.error('[RainSystem] positions buffer too small, resizing');
      this.positions = new Float32Array(safeMax * 3);
    }
    if (this.velocities.length < safeMax) {
      this.velocities = new Float32Array(safeMax);
    }
    if (this.sizes.length < safeMax) {
      this.sizes = new Float32Array(safeMax);
    }

    this.initParticles();
    this.createParticleSystem();
  }

  private initParticles(): void {
    const safeMax = this.positions.length / 3;
    for (let i = 0; i < safeMax; i++) {
      this.resetParticle(i);
      this.positions[i * 3 + 1] = -1000;
    }
    const seedCount = Math.min(100, safeMax);
    for (let i = 0; i < seedCount; i++) {
      this.positions[i * 3 + 1] = Math.random() * this.heightRange;
    }
  }

  private resetParticle(i: number): void {
    const safeMax = this.positions.length / 3;
    const idx = Math.max(0, Math.min(safeMax - 1, i));
    this.positions[idx * 3] = (Math.random() - 0.5) * this.areaSize;
    this.positions[idx * 3 + 1] = this.heightRange + Math.random() * 5;
    this.positions[idx * 3 + 2] = (Math.random() - 0.5) * this.areaSize;
    this.velocities[idx] = 0.3 + Math.random() * 0.4;
    this.sizes[idx] = 0.05 + Math.random() * 0.1;
  }

  private createParticleSystem(): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  setRainIntensity(value: number): void {
    const clampedValue = Math.max(0, Math.min(200, value));
    this.rainIntensity = clampedValue;
    this.targetIntensityFactor = clampedValue / 200;
  }

  update(delta: number): void {
    const safeMax = this.positions.length / 3;
    const responseSpeed = 0.15;
    this.currentIntensityFactor += (this.targetIntensityFactor - this.currentIntensityFactor) * responseSpeed;

    const factor = this.currentIntensityFactor;
    const activeCount = Math.max(0, Math.min(safeMax, Math.floor(safeMax * factor)));
    const speedMultiplier = 0.5 + factor * 1.5;
    const posAttr = this.particleSystem.geometry.attributes.position as THREE.BufferAttribute;

    const start = Math.max(0, Math.min(safeMax, this.lastActiveCount));
    const end = Math.max(0, Math.min(safeMax, activeCount));
    for (let i = start; i < end; i++) {
      const pi = Math.max(0, Math.min(safeMax - 1, i));
      this.positions[pi * 3] = (Math.random() - 0.5) * this.areaSize;
      this.positions[pi * 3 + 1] = Math.random() * this.heightRange;
      this.positions[pi * 3 + 2] = (Math.random() - 0.5) * this.areaSize;
    }
    this.lastActiveCount = activeCount;
    this.currentActiveCount = activeCount;

    const safeActive = Math.min(activeCount, safeMax);

    for (let i = 0; i < safeActive; i++) {
      this.positions[i * 3 + 1] -= this.velocities[i] * speedMultiplier * delta * 60;

      if (this.positions[i * 3 + 1] < -1) {
        this.resetParticle(i);
      }
    }

    for (let i = safeActive; i < safeMax; i++) {
      if (this.positions[i * 3 + 1] > -999) {
        this.positions[i * 3 + 1] = -1000;
      }
    }

    posAttr.needsUpdate = true;

    const mat = this.particleSystem.material as THREE.PointsMaterial;
    const targetOpacity = 0.25 + factor * 0.55;
    const targetSize = 0.08 + factor * 0.14;
    mat.opacity += (targetOpacity - mat.opacity) * 0.2;
    mat.size += (targetSize - mat.size) * 0.2;
  }
}
