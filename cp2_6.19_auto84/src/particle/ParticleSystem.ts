import * as THREE from 'three';
import { WindField } from './WindField';

export interface ControlParams {
  density: number;
  windSpeed: number;
  windDirection: number;
  turbulence: number;
}

export class ParticleSystem {
  private static readonly MAX_PARTICLES = 60000;
  private static readonly MIN_PARTICLES = 10000;
  private static readonly DEFAULT_PARTICLES = 30000;
  private static readonly BOUNDS = { x: 80, y: 20, z: 80 };
  private static readonly TRANSITION_DURATION = 0.5;

  private windField: WindField;

  private positionsA: Float32Array;
  private positionsB: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private lifetimes: Float32Array;
  private floatOffsets: Float32Array;
  private visibilities: Float32Array;

  private readPositions: Float32Array;
  private writePositions: Float32Array;

  private currentParticleCount: number;
  private targetParticleCount: number;
  private transitionProgress: number = 1;
  private transitionStartCount: number;

  private terrainHeights: Float32Array | null = null;
  private particleInLowArea: boolean[] = [];
  private lowAreaSpawnTimer: number = 0;
  private baseParticleCount: number;

  private params: ControlParams = {
    density: 1.0,
    windSpeed: 8,
    windDirection: 45,
    turbulence: 0.3
  };

  private time: number = 0;

  constructor(windField: WindField) {
    this.windField = windField;

    const maxCount = ParticleSystem.MAX_PARTICLES;

    this.positionsA = new Float32Array(maxCount * 3);
    this.positionsB = new Float32Array(maxCount * 3);
    this.velocities = new Float32Array(maxCount * 3);
    this.colors = new Float32Array(maxCount * 3);
    this.sizes = new Float32Array(maxCount);
    this.lifetimes = new Float32Array(maxCount);
    this.floatOffsets = new Float32Array(maxCount);
    this.visibilities = new Float32Array(maxCount);

    this.readPositions = this.positionsA;
    this.writePositions = this.positionsB;

    this.currentParticleCount = ParticleSystem.DEFAULT_PARTICLES;
    this.targetParticleCount = ParticleSystem.DEFAULT_PARTICLES;
    this.transitionStartCount = ParticleSystem.DEFAULT_PARTICLES;
    this.baseParticleCount = ParticleSystem.DEFAULT_PARTICLES;
    this.particleInLowArea = new Array(maxCount).fill(false);

    this.initializeParticles();
  }

  private initializeParticles(): void {
    const maxCount = ParticleSystem.MAX_PARTICLES;

    for (let i = 0; i < maxCount; i++) {
      this.initSingleParticle(i, i < this.currentParticleCount);
    }
  }

  private initSingleParticle(index: number, visible: boolean): void {
    const bounds = ParticleSystem.BOUNDS;

    const x = (Math.random() - 0.5) * bounds.x;
    const y = Math.random() * bounds.y;
    const z = (Math.random() - 0.5) * bounds.z;

    this.positionsA[index * 3] = x;
    this.positionsA[index * 3 + 1] = y;
    this.positionsA[index * 3 + 2] = z;

    this.positionsB[index * 3] = x;
    this.positionsB[index * 3 + 1] = y;
    this.positionsB[index * 3 + 2] = z;

    this.velocities[index * 3] = (Math.random() - 0.5) * 2;
    this.velocities[index * 3 + 1] = (Math.random() - 0.5) * 2;
    this.velocities[index * 3 + 2] = (Math.random() - 0.5) * 2;

    const colorT = Math.random();
    const r = this.lerp(1, 1, colorT);
    const g = this.lerp(0.84, 0.55, colorT);
    const b = this.lerp(0, 0, colorT);

    this.colors[index * 3] = r;
    this.colors[index * 3 + 1] = g;
    this.colors[index * 3 + 2] = b;

    this.sizes[index] = 2 + Math.random() * 2;
    this.lifetimes[index] = Math.random() * 10;
    this.floatOffsets[index] = Math.random() * Math.PI * 2;
    this.visibilities[index] = visible ? 1 : 0;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private getTerrainHeight(x: number, z: number): number {
    if (!this.terrainHeights) return 0;

    const gridSize = 20;
    const halfBounds = ParticleSystem.BOUNDS.x / 2;

    const gx = this.clamp(((x + halfBounds) / ParticleSystem.BOUNDS.x) * (gridSize - 1), 0, gridSize - 1);
    const gz = this.clamp(((z + halfBounds) / ParticleSystem.BOUNDS.z) * (gridSize - 1), 0, gridSize - 1);

    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;

    const idx = (row: number, col: number) => row * gridSize + col;

    const h00 = this.terrainHeights[idx(iz, ix)];
    const h10 = this.terrainHeights[idx(iz, Math.min(ix + 1, gridSize - 1))];
    const h01 = this.terrainHeights[idx(Math.min(iz + 1, gridSize - 1), ix)];
    const h11 = this.terrainHeights[idx(Math.min(iz + 1, gridSize - 1), Math.min(ix + 1, gridSize - 1))];

    const h0 = this.lerp(h00, h10, fx);
    const h1 = this.lerp(h01, h11, fx);

    return this.lerp(h0, h1, fz);
  }

  public setTerrainHeights(heights: Float32Array): void {
    this.terrainHeights = heights;
  }

  public setParams(params: Partial<ControlParams>): void {
    const oldDensity = this.params.density;
    Object.assign(this.params, params);

    if (params.density !== undefined && params.density !== oldDensity) {
      this.updateTargetParticleCount(params.density);
      this.baseParticleCount = this.targetParticleCount;
    }

    this.windField.setWindSpeed(this.params.windSpeed);
    this.windField.setWindDirection(this.params.windDirection);
    this.windField.setTurbulence(this.params.turbulence);
  }

  private updateTargetParticleCount(density: number): void {
    const min = ParticleSystem.MIN_PARTICLES;
    const max = ParticleSystem.MAX_PARTICLES;
    const t = (density - 0.5) / (2.0 - 0.5);
    this.targetParticleCount = Math.round(this.lerp(min, max, t));
    this.transitionStartCount = this.currentParticleCount;
    this.transitionProgress = 0;
  }

  public getPositions(): Float32Array {
    return this.readPositions;
  }

  public getColors(): Float32Array {
    return this.colors;
  }

  public getSizes(): Float32Array {
    return this.sizes;
  }

  public getVisibilities(): Float32Array {
    return this.visibilities;
  }

  public getActiveCount(): number {
    return this.currentParticleCount;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.windField.update(deltaTime);

    const windSpeed = this.params.windSpeed;
    const isLowWind = windSpeed < 3;
    const isStrongWind = windSpeed > 15;

    let effectiveMaxCount = this.baseParticleCount;
    if (isLowWind) {
      effectiveMaxCount = Math.min(
        ParticleSystem.MAX_PARTICLES,
        Math.round(this.baseParticleCount * 1.3)
      );
    }

    if (this.transitionProgress < 1) {
      this.transitionProgress += deltaTime / ParticleSystem.TRANSITION_DURATION;
      if (this.transitionProgress > 1) this.transitionProgress = 1;

      const densityTarget = Math.round(
        this.lerp(this.transitionStartCount, this.targetParticleCount, this.transitionProgress)
      );
      const newCount = isLowWind ? Math.min(ParticleSystem.MAX_PARTICLES, Math.round(densityTarget * 1.3)) : densityTarget;

      if (newCount !== this.currentParticleCount) {
        if (newCount > this.currentParticleCount) {
          for (let i = this.currentParticleCount; i < newCount; i++) {
            if (isLowWind && this.terrainHeights) {
              this.spawnParticleInLowArea(i);
            } else {
              this.initSingleParticle(i, true);
            }
            this.visibilities[i] = Math.min(1, this.transitionProgress * 2);
          }
        } else {
          for (let i = newCount; i < this.currentParticleCount; i++) {
            this.visibilities[i] = Math.max(0, 1 - (this.transitionProgress * 2));
          }
        }
        this.currentParticleCount = newCount;
      }
    } else if (isLowWind && this.currentParticleCount < effectiveMaxCount) {
      this.lowAreaSpawnTimer += deltaTime;
      if (this.lowAreaSpawnTimer >= 0.05) {
        this.lowAreaSpawnTimer = 0;
        if (this.currentParticleCount < effectiveMaxCount) {
          this.spawnParticleInLowArea(this.currentParticleCount);
          this.visibilities[this.currentParticleCount] = 0;
          this.currentParticleCount++;
        }
      }
    } else if (!isLowWind && this.currentParticleCount > this.targetParticleCount) {
      this.lowAreaSpawnTimer += deltaTime;
      if (this.lowAreaSpawnTimer >= 0.05) {
        this.lowAreaSpawnTimer = 0;
        if (this.currentParticleCount > this.targetParticleCount) {
          this.currentParticleCount--;
          this.visibilities[this.currentParticleCount] = 0;
        }
      }
    }

    for (let i = 0; i < this.currentParticleCount; i++) {
      const i3 = i * 3;

      const x = this.readPositions[i3];
      const y = this.readPositions[i3 + 1];
      const z = this.readPositions[i3 + 2];

      const wind = this.windField.getWindAt(x, y, z);
      const terrainHeight = this.getTerrainHeight(x, z);
      const isLowArea = terrainHeight < 1;
      const isDeposition = isLowWind && isLowArea;

      this.particleInLowArea[i] = isLowArea;

      const floatAmplitude = this.lerp(0.5, 1.5, Math.random());
      const floatSpeed = 0.8;
      const floatOffset = this.floatOffsets[i];
      const floatMotion = Math.sin(this.time * floatSpeed + floatOffset) * floatAmplitude * deltaTime;

      let vx = this.velocities[i3];
      let vy = this.velocities[i3 + 1];
      let vz = this.velocities[i3 + 2];

      vx += wind.x * deltaTime * 0.3;
      vy += wind.y * deltaTime * 0.3 + floatMotion;
      vz += wind.z * deltaTime * 0.3;

      if (isStrongWind) {
        vy += 8 * deltaTime;
        vx *= 1.02;
        vz *= 1.02;
      }

      if (isDeposition) {
        vx *= 0.92;
        vz *= 0.92;
        vy *= 0.85;
        vy -= 2 * deltaTime;
      }

      vx *= 0.98;
      vy *= 0.98;
      vz *= 0.98;

      let newX = x + vx * deltaTime;
      let newY = y + vy * deltaTime;
      let newZ = z + vz * deltaTime;

      const bounds = ParticleSystem.BOUNDS;
      const halfX = bounds.x / 2;
      const halfZ = bounds.z / 2;

      if (newX < -halfX || newX > halfX) {
        newX = this.clamp(newX, -halfX, halfX);
        vx *= -0.5;
        vx += (Math.random() - 0.5) * 2;
      }

      if (newY < 0 || newY > bounds.y) {
        newY = this.clamp(newY, 0, bounds.y);
        vy *= -0.5;
        vy += (Math.random() - 0.5) * 2;
      }

      if (newZ < -halfZ || newZ > halfZ) {
        newZ = this.clamp(newZ, -halfZ, halfZ);
        vz *= -0.5;
        vz += (Math.random() - 0.5) * 2;
      }

      if (newY < terrainHeight + 0.1) {
        newY = terrainHeight + 0.1;
        vy *= -0.3;
        if (isDeposition) {
          vy = Math.min(vy, -0.5);
        }
      }

      this.writePositions[i3] = newX;
      this.writePositions[i3 + 1] = newY;
      this.writePositions[i3 + 2] = newZ;

      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = vz;

      if (isDeposition) {
        const r = 0xCD / 255;
        const g = 0x85 / 255;
        const b = 0x3F / 255;
        this.colors[i3] = this.lerp(this.colors[i3], r, 0.1);
        this.colors[i3 + 1] = this.lerp(this.colors[i3 + 1], g, 0.1);
        this.colors[i3 + 2] = this.lerp(this.colors[i3 + 2], b, 0.1);
      } else if (isStrongWind) {
        const brightT = this.clamp((windSpeed - 15) / 5, 0, 1);
        const targetR = this.lerp(1, 1, brightT);
        const targetG = this.lerp(0.55, 1, brightT);
        const targetB = this.lerp(0, 1, brightT);
        this.colors[i3] = this.lerp(this.colors[i3], targetR, 0.08);
        this.colors[i3 + 1] = this.lerp(this.colors[i3 + 1], targetG, 0.08);
        this.colors[i3 + 2] = this.lerp(this.colors[i3 + 2], targetB, 0.08);
      } else {
        const colorT = Math.random() * 0.3 + (y / bounds.y) * 0.7;
        const targetR = 1;
        const targetG = this.lerp(0.84, 0.55, colorT);
        const targetB = this.lerp(0.3, 0, colorT * 0.5);
        this.colors[i3] = this.lerp(this.colors[i3], targetR, 0.05);
        this.colors[i3 + 1] = this.lerp(this.colors[i3 + 1], targetG, 0.05);
        this.colors[i3 + 2] = this.lerp(this.colors[i3 + 2], targetB, 0.05);
      }

      this.lifetimes[i] += deltaTime;
      if (this.lifetimes[i] > 15) {
        this.lifetimes[i] = 0;
        if (isLowWind && this.terrainHeights) {
          this.spawnParticleInLowArea(i);
        } else {
          this.initSingleParticle(i, true);
        }
      }

      if (this.visibilities[i] < 1) {
        this.visibilities[i] = Math.min(1, this.visibilities[i] + deltaTime * 2);
      }
    }

    [this.readPositions, this.writePositions] = [this.writePositions, this.readPositions];
  }

  private spawnParticleInLowArea(index: number): void {
    if (!this.terrainHeights) {
      this.initSingleParticle(index, true);
      return;
    }

    const bounds = ParticleSystem.BOUNDS;
    const gridSize = 20;
    const halfBounds = bounds.x / 2;

    let x: number, z: number, terrainHeight: number;
    let attempts = 0;
    do {
      const col = Math.floor(Math.random() * gridSize);
      const row = Math.floor(Math.random() * gridSize);
      terrainHeight = this.terrainHeights[row * gridSize + col];
      x = (col / (gridSize - 1)) * bounds.x - halfBounds;
      z = (row / (gridSize - 1)) * bounds.z - halfBounds;
      attempts++;
    } while (terrainHeight >= 1 && attempts < 20);

    const y = terrainHeight + 0.5 + Math.random() * 3;

    this.positionsA[index * 3] = x;
    this.positionsA[index * 3 + 1] = y;
    this.positionsA[index * 3 + 2] = z;

    this.positionsB[index * 3] = x;
    this.positionsB[index * 3 + 1] = y;
    this.positionsB[index * 3 + 2] = z;

    this.velocities[index * 3] = (Math.random() - 0.5) * 1;
    this.velocities[index * 3 + 1] = (Math.random() - 0.5) * 1;
    this.velocities[index * 3 + 2] = (Math.random() - 0.5) * 1;

    const r = 0xCD / 255;
    const g = 0x85 / 255;
    const b = 0x3F / 255;
    this.colors[index * 3] = r;
    this.colors[index * 3 + 1] = g;
    this.colors[index * 3 + 2] = b;

    this.sizes[index] = 2 + Math.random() * 2;
    this.lifetimes[index] = Math.random() * 10;
    this.floatOffsets[index] = Math.random() * Math.PI * 2;
    this.visibilities[index] = 1;
    this.particleInLowArea[index] = true;
  }
}
