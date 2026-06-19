import * as THREE from 'three';

const MAX_PARTICLES = 5000;

export class RainSystem {
  private scene: THREE.Scene;
  private particleSystem!: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private sizes: Float32Array;
  private rainIntensity: number = 0;
  private areaSize: number = 50;
  private heightRange: number = 30;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.velocities = new Float32Array(MAX_PARTICLES);
    this.sizes = new Float32Array(MAX_PARTICLES);

    this.initParticles();
    this.createParticleSystem();
  }

  private initParticles(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.resetParticle(i);
      this.positions[i * 3 + 1] = Math.random() * this.heightRange;
    }
  }

  private resetParticle(i: number): void {
    this.positions[i * 3] = (Math.random() - 0.5) * this.areaSize;
    this.positions[i * 3 + 1] = this.heightRange + Math.random() * 5;
    this.positions[i * 3 + 2] = (Math.random() - 0.5) * this.areaSize;
    this.velocities[i] = 0.3 + Math.random() * 0.4;
    this.sizes[i] = 0.05 + Math.random() * 0.1;
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
    this.rainIntensity = value;
  }

  update(delta: number): void {
    const intensityFactor = this.rainIntensity / 200;
    const activeCount = Math.floor(MAX_PARTICLES * intensityFactor);
    const speedMultiplier = 0.5 + intensityFactor * 1.5;

    const posAttr = this.particleSystem.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i >= activeCount) {
        this.positions[i * 3 + 1] = -1000;
        continue;
      }

      this.positions[i * 3 + 1] -= this.velocities[i] * speedMultiplier * delta * 60;

      if (this.positions[i * 3 + 1] < -1) {
        this.resetParticle(i);
      }
    }

    posAttr.needsUpdate = true;

    const mat = this.particleSystem.material as THREE.PointsMaterial;
    mat.opacity = 0.3 + intensityFactor * 0.5;
    mat.size = 0.08 + intensityFactor * 0.12;
  }
}
