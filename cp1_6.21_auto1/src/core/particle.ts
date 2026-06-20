import * as THREE from 'three';

export interface ParticleData {
  positions: Float32Array;
  velocities: Float32Array;
  lives: Float32Array;
  maxLives: Float32Array;
  colors: Float32Array;
  count: number;
}

export class ParticleSystem {
  data: ParticleData;
  currentSpeed: number;
  bounds: THREE.Vector3;
  private tempVec = new THREE.Vector3();
  private flowDir = new THREE.Vector3();

  constructor(count: number, currentSpeed: number, bounds: THREE.Vector3) {
    this.currentSpeed = currentSpeed;
    this.bounds = bounds;
    this.data = this.createParticles(count);
  }

  private createParticles(count: number): ParticleData {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lives = new Float32Array(count);
    const maxLives = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const halfX = this.bounds.x * 0.5;
    const halfY = this.bounds.y * 0.5;
    const halfZ = this.bounds.z * 0.5;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * this.bounds.x;
      positions[i3 + 1] = (Math.random() - 0.5) * this.bounds.y;
      positions[i3 + 2] = (Math.random() - 0.5) * this.bounds.z;

      this.computeFlowField(positions[i3], positions[i3 + 1], positions[i3 + 2], this.tempVec);
      velocities[i3] = this.tempVec.x * this.currentSpeed;
      velocities[i3 + 1] = this.tempVec.y * this.currentSpeed;
      velocities[i3 + 2] = this.tempVec.z * this.currentSpeed;

      maxLives[i] = 3 + Math.random() * 5;
      lives[i] = Math.random() * maxLives[i];

      this.updateColor(colors, i, lives[i] / maxLives[i]);
    }

    return { positions, velocities, lives, maxLives, colors, count };
  }

  private computeFlowField(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
    const t = Date.now() * 0.0003;
    const fx = Math.sin(y * 0.15 + t) * Math.cos(z * 0.12 + t * 0.7) + 0.5;
    const fy = Math.cos(x * 0.1 + t * 0.5) * 0.3;
    const fz = Math.sin(x * 0.13 + t * 0.8) * Math.cos(y * 0.11 + t * 0.6) + 0.3;
    out.set(fx, fy, fz).normalize();
    return out;
  }

  private updateColor(colors: Float32Array, index: number, lifeRatio: number) {
    const i3 = index * 3;
    const t = lifeRatio;
    colors[i3] = 0.0 + t * 0.0;
    colors[i3 + 1] = 0.4 + t * 0.5;
    colors[i3 + 2] = 0.8 - t * 0.4;
  }

  setCurrentSpeed(speed: number) {
    this.currentSpeed = speed;
  }

  update(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    const d = this.data;
    const halfX = this.bounds.x * 0.5;
    const halfY = this.bounds.y * 0.5;
    const halfZ = this.bounds.z * 0.5;

    for (let i = 0; i < d.count; i++) {
      const i3 = i * 3;

      d.lives[i] -= clampedDt;

      if (d.lives[i] <= 0) {
        d.positions[i3] = (Math.random() - 0.5) * this.bounds.x;
        d.positions[i3 + 1] = (Math.random() - 0.5) * this.bounds.y;
        d.positions[i3 + 2] = (Math.random() - 0.5) * this.bounds.z;
        d.maxLives[i] = 3 + Math.random() * 5;
        d.lives[i] = d.maxLives[i];
      }

      this.computeFlowField(d.positions[i3], d.positions[i3 + 1], d.positions[i3 + 2], this.flowDir);

      d.velocities[i3] += this.flowDir.x * this.currentSpeed * clampedDt * 2;
      d.velocities[i3 + 1] += this.flowDir.y * this.currentSpeed * clampedDt * 2;
      d.velocities[i3 + 2] += this.flowDir.z * this.currentSpeed * clampedDt * 2;

      const speed = Math.sqrt(d.velocities[i3] ** 2 + d.velocities[i3 + 1] ** 2 + d.velocities[i3 + 2] ** 2);
      const maxParticleSpeed = this.currentSpeed * 3;
      if (speed > maxParticleSpeed) {
        const scale = maxParticleSpeed / speed;
        d.velocities[i3] *= scale;
        d.velocities[i3 + 1] *= scale;
        d.velocities[i3 + 2] *= scale;
      }

      d.positions[i3] += d.velocities[i3] * clampedDt;
      d.positions[i3 + 1] += d.velocities[i3 + 1] * clampedDt;
      d.positions[i3 + 2] += d.velocities[i3 + 2] * clampedDt;

      if (d.positions[i3] > halfX) { d.positions[i3] = -halfX; d.lives[i] = d.maxLives[i] * 0.5; }
      if (d.positions[i3] < -halfX) { d.positions[i3] = halfX; d.lives[i] = d.maxLives[i] * 0.5; }
      if (d.positions[i3 + 1] > halfY) { d.positions[i3 + 1] = -halfY; d.lives[i] = d.maxLives[i] * 0.5; }
      if (d.positions[i3 + 1] < -halfY) { d.positions[i3 + 1] = halfY; d.lives[i] = d.maxLives[i] * 0.5; }
      if (d.positions[i3 + 2] > halfZ) { d.positions[i3 + 2] = -halfZ; d.lives[i] = d.maxLives[i] * 0.5; }
      if (d.positions[i3 + 2] < -halfZ) { d.positions[i3 + 2] = halfZ; d.lives[i] = d.maxLives[i] * 0.5; }

      const lifeRatio = d.lives[i] / d.maxLives[i];
      this.updateColor(d.colors, i, lifeRatio);
    }
  }

  reset() {
    this.currentSpeed = 1.0;
    this.data = this.createParticles(this.data.count);
  }
}
