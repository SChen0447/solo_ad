import * as THREE from 'three';
import type { PollutionSourceConfig } from './PollutionSource';

const MAX_PARTICLES = 5000;
const PARTICLE_LIFETIME = 8.0;
const INITIAL_SIZE = 0.8;
const FINAL_SIZE = 0.2;
const INITIAL_OPACITY = 0.9;
const BROWNIAN_RANGE = 0.3;

const DEFAULT_WIND = new THREE.Vector3(-0.5, 0.1, 0);

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  sourceId: string;
  active: boolean;
}

export class ParticleSystem {
  private particles: ParticleData[] = [];
  private activeCount: number = 0;
  private nextFreeIndex: number = 0;

  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private points!: THREE.Points;

  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;

  private sourceEmissionTimers: Map<string, number> = new Map();
  private sources: Map<string, PollutionSourceConfig> = new Map();

  private windVector: THREE.Vector3 = DEFAULT_WIND.clone();
  private globalWindMultiplier: number = 1.0;

  private colorStart = new THREE.Color('#ff3333');
  private colorEnd = new THREE.Color('#33ff33');
  private tempColor = new THREE.Color();

  constructor() {
    this.initParticles();
    this.initGeometry();
  }

  private initParticles(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: 0,
        lifetime: PARTICLE_LIFETIME,
        sourceId: '',
        active: false
      });
    }
  }

  private initGeometry(): void {
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.colors[i * 3] = 1.0;
      this.colors[i * 3 + 1] = 0.2;
      this.colors[i * 3 + 2] = 0.2;
      this.sizes[i] = 0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1.0,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  public getPoints(): THREE.Points {
    return this.points;
  }

  public registerSource(source: PollutionSourceConfig): void {
    this.sources.set(source.id, source);
    if (!this.sourceEmissionTimers.has(source.id)) {
      this.sourceEmissionTimers.set(source.id, 0);
    }
  }

  public updateSource(source: PollutionSourceConfig): void {
    this.sources.set(source.id, source);
  }

  public unregisterSource(sourceId: string): void {
    this.sources.delete(sourceId);
    this.sourceEmissionTimers.delete(sourceId);
  }

  public setWindVector(x: number, y: number, z: number): void {
    this.windVector.set(x, y, z);
  }

  public getWindVector(): THREE.Vector3 {
    return this.windVector.clone();
  }

  public setGlobalWindMultiplier(multiplier: number): void {
    this.globalWindMultiplier = Math.max(0.5, Math.min(3.0, multiplier));
  }

  public getGlobalWindMultiplier(): number {
    return this.globalWindMultiplier;
  }

  public setColorGradient(startHex: string, endHex: string): void {
    this.colorStart.set(startHex);
    this.colorEnd.set(endHex);
  }

  public update(deltaTime: number): void {
    for (const [sourceId, source] of this.sources.entries()) {
      this.emitFromSource(sourceId, source, deltaTime);
    }

    this.updateParticles(deltaTime);
    this.updateBuffers();
  }

  private emitFromSource(
    sourceId: string,
    source: PollutionSourceConfig,
    deltaTime: number
  ): void {
    const interval = 1.0 / source.emissionRate;
    let timer = this.sourceEmissionTimers.get(sourceId) ?? 0;
    timer += deltaTime;

    while (timer >= interval) {
      timer -= interval;
      this.emitParticle(source);
    }

    this.sourceEmissionTimers.set(sourceId, timer);
  }

  private emitParticle(source: PollutionSourceConfig): void {
    const idx = this.findFreeIndex();
    if (idx === -1) {
      this.recycleOldest();
      return;
    }

    const particle = this.particles[idx];
    particle.position.set(
      source.position.x + (Math.random() - 0.5) * 2,
      source.position.y + (Math.random() - 0.5) * 2,
      source.position.z + (Math.random() - 0.5) * 2
    );
    particle.velocity.set(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 0.3 + 0.1,
      (Math.random() - 0.5) * 0.5
    );
    particle.age = 0;
    particle.lifetime = PARTICLE_LIFETIME;
    particle.sourceId = source.id;
    particle.active = true;

    this.activeCount++;
  }

  private findFreeIndex(): number {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const idx = (this.nextFreeIndex + i) % MAX_PARTICLES;
      if (!this.particles[idx].active) {
        this.nextFreeIndex = (idx + 1) % MAX_PARTICLES;
        return idx;
      }
    }
    return -1;
  }

  private recycleOldest(): void {
    let oldestIdx = -1;
    let oldestAge = -1;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (this.particles[i].active && this.particles[i].age > oldestAge) {
        oldestAge = this.particles[i].age;
        oldestIdx = i;
      }
    }

    if (oldestIdx !== -1) {
      this.particles[oldestIdx].active = false;
      this.activeCount--;
    }
  }

  private updateParticles(deltaTime: number): void {
    const wind = this.windVector.clone().multiplyScalar(this.globalWindMultiplier);
    const dt = Math.min(deltaTime, 0.05);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.age += dt;

      if (p.age >= p.lifetime) {
        p.active = false;
        this.activeCount--;
        continue;
      }

      const source = this.sources.get(p.sourceId);
      const windMult = source?.windMultiplier ?? 1.0;

      p.position.x += wind.x * windMult * dt;
      p.position.y += wind.y * windMult * dt;
      p.position.z += wind.z * windMult * dt;

      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;

      p.position.x += (Math.random() - 0.5) * BROWNIAN_RANGE * (dt * 60);
      p.position.y += (Math.random() - 0.5) * BROWNIAN_RANGE * (dt * 60);
      p.position.z += (Math.random() - 0.5) * BROWNIAN_RANGE * (dt * 60);

      p.velocity.multiplyScalar(0.98);
    }
  }

  private updateBuffers(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      const i3 = i * 3;

      if (p.active) {
        this.positions[i3] = p.position.x;
        this.positions[i3 + 1] = p.position.y;
        this.positions[i3 + 2] = p.position.z;

        const t = p.age / p.lifetime;

        this.tempColor.copy(this.colorStart).lerp(this.colorEnd, t);
        this.colors[i3] = this.tempColor.r;
        this.colors[i3 + 1] = this.tempColor.g;
        this.colors[i3 + 2] = this.tempColor.b;

        const opacity = INITIAL_OPACITY * (1 - t);
        this.material.opacity = Math.max(this.material.opacity, opacity);

        this.sizes[i] = INITIAL_SIZE + (FINAL_SIZE - INITIAL_SIZE) * t;
      } else {
        this.sizes[i] = 0;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public reset(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
      this.sizes[i] = 0;
    }
    this.activeCount = 0;
    this.nextFreeIndex = 0;

    for (const sourceId of this.sourceEmissionTimers.keys()) {
      this.sourceEmissionTimers.set(sourceId, 0);
    }

    this.material.opacity = 0.9;

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
