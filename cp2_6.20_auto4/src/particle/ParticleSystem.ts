import { WindField } from './WindField';
import * as THREE from 'three';

export interface ParticleParams {
  density: number;
  windSpeed: number;
  windDirection: number;
  turbulence: number;
}

export class ParticleSystem {
  private params: ParticleParams;
  private windField: WindField;
  private particleCount: number;
  private particleTransitionStartTime: number = 0;
  private isTransitioning: boolean = false;
  private initialCount: number;
  private targetCount: number;

  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private lifetimes: Float32Array;
  private floatOffsets: Float32Array;
  private floatSpeeds: Float32Array;
  private driftOffsets: Float32Array;

  private positionsBuffer: Float32Array;
  private colorsBuffer: Float32Array;

  private terrainHeights: Float32Array | null = null;
  private terrainSize: number = 80;
  private terrainSegments: number = 20;
  private lowAreaParticles: Set<number> = new Set();
  private lowAreaBoostFactor: number = 1.3;
  private colorTransitionSpeed: number = 0.05;

  private time: number = 0;

  private readonly MAX_PARTICLES = 60000;
  private readonly MIN_PARTICLES = 10000;
  private readonly DEFAULT_PARTICLES = 30000;
  private readonly TRANSITION_DURATION = 0.5;

  constructor(params: ParticleParams) {
    this.params = { ...params };
    this.windField = new WindField({
      windSpeed: params.windSpeed,
      windDirection: params.windDirection,
      turbulence: params.turbulence
    });

    this.particleCount = this.DEFAULT_PARTICLES;
    this.initialCount = this.DEFAULT_PARTICLES;
    this.targetCount = this.DEFAULT_PARTICLES;

    this.positions = new Float32Array(this.MAX_PARTICLES * 3);
    this.velocities = new Float32Array(this.MAX_PARTICLES * 3);
    this.colors = new Float32Array(this.MAX_PARTICLES * 3);
    this.sizes = new Float32Array(this.MAX_PARTICLES);
    this.lifetimes = new Float32Array(this.MAX_PARTICLES);
    this.floatOffsets = new Float32Array(this.MAX_PARTICLES);
    this.floatSpeeds = new Float32Array(this.MAX_PARTICLES);
    this.driftOffsets = new Float32Array(this.MAX_PARTICLES);

    this.positionsBuffer = new Float32Array(this.MAX_PARTICLES * 3);
    this.colorsBuffer = new Float32Array(this.MAX_PARTICLES * 3);

    this.generateTerrainHeights();
    this.initializeParticles(this.DEFAULT_PARTICLES);
  }

  private generateTerrainHeights(): void {
    const gridSize = this.terrainSegments + 1;
    this.terrainHeights = new Float32Array(gridSize * gridSize);

    for (let i = 0; i < gridSize * gridSize; i++) {
      this.terrainHeights[i] = Math.random() * 5;
    }
  }

  private getTerrainHeight(x: number, z: number): number {
    if (!this.terrainHeights) return 0;

    const gridSize = this.terrainSegments + 1;
    const halfSize = this.terrainSize / 2;

    const gx = ((x + halfSize) / this.terrainSize) * this.terrainSegments;
    const gz = ((z + halfSize) / this.terrainSize) * this.terrainSegments;

    const x0 = Math.max(0, Math.min(gridSize - 2, Math.floor(gx)));
    const z0 = Math.max(0, Math.min(gridSize - 2, Math.floor(gz)));
    const x1 = x0 + 1;
    const z1 = z0 + 1;

    const fx = gx - x0;
    const fz = gz - z0;

    const h00 = this.terrainHeights[z0 * gridSize + x0];
    const h10 = this.terrainHeights[z0 * gridSize + x1];
    const h01 = this.terrainHeights[z1 * gridSize + x0];
    const h11 = this.terrainHeights[z1 * gridSize + x1];

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz;
  }

  private initializeParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      this.initSingleParticle(i);
    }
  }

  private initSingleParticle(index: number, nearBottom: boolean = false): void {
    const i3 = index * 3;

    this.positions[i3] = (Math.random() - 0.5) * 80;
    this.positions[i3 + 2] = (Math.random() - 0.5) * 80;

    const terrainHeight = this.getTerrainHeight(this.positions[i3], this.positions[i3 + 2]);
    
    if (nearBottom) {
      this.positions[i3 + 1] = terrainHeight + Math.random() * 2;
    } else {
      this.positions[i3 + 1] = terrainHeight + Math.random() * (20 - terrainHeight);
    }

    this.velocities[i3] = 0;
    this.velocities[i3 + 1] = 0;
    this.velocities[i3 + 2] = 0;

    this.sizes[index] = 2 + Math.random() * 2;
    this.lifetimes[index] = Math.random() * 10;
    this.floatOffsets[index] = Math.random() * Math.PI * 2;
    this.floatSpeeds[index] = 0.5 + Math.random() * 1.0;
    this.driftOffsets[index] = Math.random() * Math.PI * 2;

    const t = Math.random();
    const color = new THREE.Color();
    color.setHSL(0.08 + t * 0.05, 0.8, 0.5 + t * 0.2);
    this.colors[i3] = color.r;
    this.colors[i3 + 1] = color.g;
    this.colors[i3 + 2] = color.b;
  }

  public setParams(params: Partial<ParticleParams>): void {
    const oldDensity = this.params.density;
    Object.assign(this.params, params);

    this.windField.setParams({
      windSpeed: this.params.windSpeed,
      windDirection: this.params.windDirection,
      turbulence: this.params.turbulence
    });

    if (params.density !== undefined && params.density !== oldDensity) {
      this.updateParticleCount(params.density);
    }
  }

  private updateParticleCount(density: number): void {
    const minCount = this.MIN_PARTICLES;
    const maxCount = this.MAX_PARTICLES;
    const t = (density - 0.5) / 1.5;
    const newCount = Math.round(minCount + t * (maxCount - minCount));

    if (newCount !== this.particleCount) {
      this.initialCount = this.particleCount;
      this.targetCount = newCount;
      this.particleTransitionStartTime = this.time;
      this.isTransitioning = true;
    }
  }

  public update(delta: number): void {
    this.time += delta;
    this.windField.update(delta);

    if (this.isTransitioning) {
      const elapsed = this.time - this.particleTransitionStartTime;
      const t = Math.min(1, elapsed / this.TRANSITION_DURATION);
      const easedT = this.easeInOutQuad(t);
      this.particleCount = Math.round(this.initialCount + (this.targetCount - this.initialCount) * easedT);

      if (t >= 1) {
        this.isTransitioning = false;
        this.particleCount = this.targetCount;
      }
    }

    const { windSpeed } = this.params;
    const isDeposition = windSpeed < 3;
    const isStrongWind = windSpeed > 15;

    if (isDeposition) {
      this.manageLowAreaDensity();
    } else {
      this.lowAreaParticles.clear();
    }

    for (let i = 0; i < this.particleCount; i++) {
      this.updateParticle(i, delta, isDeposition, isStrongWind);
    }

    this.positionsBuffer.set(this.positions.subarray(0, this.particleCount * 3));
    this.colorsBuffer.set(this.colors.subarray(0, this.particleCount * 3));
  }

  private manageLowAreaDensity(): void {
    const lowAreaCount = this.lowAreaParticles.size;
    const targetLowAreaCount = Math.floor(this.particleCount * 0.3 * this.lowAreaBoostFactor);

    if (lowAreaCount < targetLowAreaCount) {
      const toAdd = Math.min(50, targetLowAreaCount - lowAreaCount);
      let added = 0;
      let attempts = 0;

      while (added < toAdd && attempts < 1000) {
        const idx = Math.floor(Math.random() * this.particleCount);
        attempts++;

        if (!this.lowAreaParticles.has(idx)) {
          const i3 = idx * 3;
          const x = this.positions[i3];
          const z = this.positions[i3 + 2];
          const terrainHeight = this.getTerrainHeight(x, z);

          if (terrainHeight < 1) {
            this.lowAreaParticles.add(idx);
            this.initSingleParticle(idx, true);
            added++;
          }
        }
      }
    }
  }

  private updateParticle(
    index: number,
    delta: number,
    isDeposition: boolean,
    isStrongWind: boolean
  ): void {
    const i3 = index * 3;
    let x = this.positions[i3];
    let y = this.positions[i3 + 1];
    let z = this.positions[i3 + 2];

    const terrainHeight = this.getTerrainHeight(x, z);
    const windVel = this.windField.getWindVelocity(x, y, z);

    const floatAmplitude = 0.5 + (this.floatSpeeds[index] - 0.5) * 2;
    const floatY = Math.sin(this.time * this.floatSpeeds[index] + this.floatOffsets[index]) * floatAmplitude * 0.5;

    const driftSpeed = this.params.windSpeed * 0.1;
    const driftX = Math.sin(this.time * 0.3 + this.driftOffsets[index]) * driftSpeed;
    const driftZ = Math.cos(this.time * 0.4 + this.driftOffsets[index]) * driftSpeed;

    let velX = windVel.x * 0.1 + driftX;
    let velY = windVel.y * 0.1 + floatY;
    let velZ = windVel.z * 0.1 + driftZ;

    if (isStrongWind) {
      velY += this.params.windSpeed * 0.02;
    }

    if (isDeposition) {
      if (terrainHeight < 1) {
        velY -= 0.8 * delta;
        velX *= 0.7;
        velZ *= 0.7;

        if (this.lowAreaParticles.has(index)) {
          velY -= 0.5 * delta;
        }
      }
    }

    x += velX * delta;
    y += velY * delta;
    z += velZ * delta;

    const minY = terrainHeight;
    const maxY = 20;

    if (y < minY) {
      y = minY;
      velY = Math.abs(velY) * 0.3;
      velX += (Math.random() - 0.5) * 0.5;
      velZ += (Math.random() - 0.5) * 0.5;
    }

    if (y > maxY) {
      y = maxY;
      velY = -Math.abs(velY) * 0.3;
    }

    const halfSize = 40;
    if (x > halfSize) x = -halfSize;
    if (x < -halfSize) x = halfSize;
    if (z > halfSize) z = -halfSize;
    if (z < -halfSize) z = halfSize;

    this.positions[i3] = x;
    this.positions[i3 + 1] = y;
    this.positions[i3 + 2] = z;

    this.updateParticleColor(index, isDeposition, isStrongWind, y, terrainHeight);
  }

  private updateParticleColor(
    index: number,
    isDeposition: boolean,
    isStrongWind: boolean,
    y: number,
    terrainHeight: number
  ): void {
    const i3 = index * 3;
    const targetColor = new THREE.Color();

    if (isStrongWind) {
      const t = Math.min(1, (this.params.windSpeed - 15) / 5);
      const easeT = this.easeOutQuad(t);
      const baseColor = new THREE.Color(0xffa500);
      const whiteColor = new THREE.Color(0xffffff);
      targetColor.copy(baseColor).lerp(whiteColor, easeT);
    } else if (isDeposition && (y - terrainHeight) < 3 && terrainHeight < 1) {
      const heightFactor = Math.min(1, (3 - (y - terrainHeight)) / 3);
      const isLowAreaParticle = this.lowAreaParticles.has(index);
      const depositFactor = isLowAreaParticle ? 0.8 : 0.5;
      const t = heightFactor * depositFactor;
      const baseColor = new THREE.Color(0xdaa520);
      const depositColor = new THREE.Color(0xcd853f);
      targetColor.copy(baseColor).lerp(depositColor, t);
    } else {
      const heightT = y / 20;
      targetColor.setHSL(0.08 + heightT * 0.03, 0.8, 0.5 + heightT * 0.15);
    }

    const currentColor = new THREE.Color(
      this.colors[i3],
      this.colors[i3 + 1],
      this.colors[i3 + 2]
    );

    currentColor.lerp(targetColor, this.colorTransitionSpeed);

    this.colors[i3] = currentColor.r;
    this.colors[i3 + 1] = currentColor.g;
    this.colors[i3 + 2] = currentColor.b;
  }

  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public getPositions(): Float32Array {
    return this.positionsBuffer.subarray(0, this.particleCount * 3);
  }

  public getColors(): Float32Array {
    return this.colorsBuffer.subarray(0, this.particleCount * 3);
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public getParams(): ParticleParams {
    return { ...this.params };
  }

  public getWindField(): WindField {
    return this.windField;
  }
}

export default ParticleSystem;
