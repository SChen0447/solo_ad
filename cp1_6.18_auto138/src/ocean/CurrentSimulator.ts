import * as THREE from 'three';
import { OceanCurrentData } from '../data/CurrentDataLoader';

const EARTH_RADIUS = 5;
const TRAIL_LENGTH = 30;

interface Particle {
  currentId: string;
  currentIdx: number;
  progress: number;
  speed: number;
  offset: THREE.Vector3;
  alive: boolean;
  trail: THREE.Vector3[];
}

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export class CurrentSimulator {
  private currents: OceanCurrentData[];
  private particles: Particle[] = [];
  private particleCount: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private trailIndices: Float32Array;
  private speedMultiplier: number = 1.0;
  private isPlaying: boolean = false;

  constructor(currents: OceanCurrentData[], particleCount: number) {
    this.currents = currents;
    this.particleCount = particleCount;
    this.positions = new Float32Array(particleCount * 3);
    this.colors = new Float32Array(particleCount * 3);
    this.trailPositions = new Float32Array(particleCount * TRAIL_LENGTH * 3);
    this.trailColors = new Float32Array(particleCount * TRAIL_LENGTH * 4);
    this.trailIndices = new Float32Array(particleCount);

    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    const perCurrent = Math.floor(this.particleCount / this.currents.length);
    const remainder = this.particleCount - perCurrent * this.currents.length;

    for (let c = 0; c < this.currents.length; c++) {
      const count = c < this.currents.length - 1 ? perCurrent : perCurrent + remainder;
      const current = this.currents[c];

      for (let i = 0; i < count; i++) {
        const progress = Math.random();
        const speed = current.speed * (0.7 + Math.random() * 0.6);
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15
        );

        const pos = this.getPositionOnCurrent(current, progress);
        const trail: THREE.Vector3[] = [];
        const steps = Math.min(Math.floor(progress * TRAIL_LENGTH), TRAIL_LENGTH);
        for (let t = 0; t < steps; t++) {
          const tp = progress - (t / TRAIL_LENGTH) * progress;
          trail.push(this.getPositionOnCurrent(current, Math.max(0, tp)));
        }

        this.particles.push({
          currentId: current.id,
          currentIdx: c,
          progress,
          speed,
          offset,
          alive: true,
          trail,
        });
      }
    }
  }

  private getPositionOnCurrent(current: OceanCurrentData, progress: number): THREE.Vector3 {
    const wps = current.waypoints;
    const totalSegments = wps.length - 1;
    const segProgress = progress * totalSegments;
    const segIdx = Math.min(Math.floor(segProgress), totalSegments - 1);
    const t = segProgress - segIdx;

    const from = wps[segIdx];
    const to = wps[Math.min(segIdx + 1, wps.length - 1)];

    const lat = from.lat + (to.lat - from.lat) * t;
    const lng = from.lng + (to.lng - from.lng) * t;

    return latLngToVec3(lat, lng, EARTH_RADIUS + 0.02);
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  setPlaying(playing: boolean): void {
    this.isPlaying = playing;
  }

  reset(particleCount: number): void {
    this.particleCount = particleCount;
    this.positions = new Float32Array(particleCount * 3);
    this.colors = new Float32Array(particleCount * 3);
    this.trailPositions = new Float32Array(particleCount * TRAIL_LENGTH * 3);
    this.trailColors = new Float32Array(particleCount * TRAIL_LENGTH * 4);
    this.trailIndices = new Float32Array(particleCount);
    this.initParticles();
  }

  update(delta: number): void {
    if (!this.isPlaying) return;

    const dt = delta * this.speedMultiplier;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const current = this.currents[p.currentIdx];

      p.progress += (p.speed * dt * 0.02);

      if (p.progress >= 1.0) {
        p.progress = 0;
        p.trail = [];
        p.offset.set(
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.15
        );
        p.speed = current.speed * (0.7 + Math.random() * 0.6);
      }

      const pos = this.getPositionOnCurrent(current, p.progress);
      const finalPos = pos.clone().add(p.offset);
      const surfaceDir = finalPos.clone().normalize();
      finalPos.copy(surfaceDir.multiplyScalar(EARTH_RADIUS + 0.03));

      this.positions[i * 3] = finalPos.x;
      this.positions[i * 3 + 1] = finalPos.y;
      this.positions[i * 3 + 2] = finalPos.z;

      const speedRatio = p.speed / 3.0;
      let r: number, g: number, b: number;
      if (speedRatio < 0.5) {
        r = 0.3;
        g = 0.6 + speedRatio * 0.8;
        b = 1.0;
      } else {
        r = 0.3 + (speedRatio - 0.5) * 1.4;
        g = 0.9 + (speedRatio - 0.5) * 0.2;
        b = 1.0;
      }
      this.colors[i * 3] = r;
      this.colors[i * 3 + 1] = g;
      this.colors[i * 3 + 2] = b;

      p.trail.unshift(finalPos.clone());
      if (p.trail.length > TRAIL_LENGTH) {
        p.trail.length = TRAIL_LENGTH;
      }

      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const baseIdx = (i * TRAIL_LENGTH + t) * 3;
        if (t < p.trail.length) {
          this.trailPositions[baseIdx] = p.trail[t].x;
          this.trailPositions[baseIdx + 1] = p.trail[t].y;
          this.trailPositions[baseIdx + 2] = p.trail[t].z;
        } else {
          this.trailPositions[baseIdx] = finalPos.x;
          this.trailPositions[baseIdx + 1] = finalPos.y;
          this.trailPositions[baseIdx + 2] = finalPos.z;
        }
      }

      this.trailIndices[i] = p.trail.length;
    }
  }

  getPositions(): Float32Array {
    return this.positions;
  }

  getColors(): Float32Array {
    return this.colors;
  }

  getTrailPositions(): Float32Array {
    return this.trailPositions;
  }

  getTrailColors(): Float32Array {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const speedRatio = p.speed / 3.0;
      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const baseIdx = (i * TRAIL_LENGTH + t) * 4;
        const alpha = t < p.trail.length ? Math.max(0, 1.0 - t / TRAIL_LENGTH) : 0;
        if (speedRatio < 0.5) {
          this.trailColors[baseIdx] = 0.2;
          this.trailColors[baseIdx + 1] = 0.5 + speedRatio * 0.6;
          this.trailColors[baseIdx + 2] = 1.0;
        } else {
          this.trailColors[baseIdx] = 0.2 + (speedRatio - 0.5) * 1.0;
          this.trailColors[baseIdx + 1] = 0.8 + (speedRatio - 0.5) * 0.4;
          this.trailColors[baseIdx + 2] = 1.0;
        }
        this.trailColors[baseIdx + 3] = alpha * 0.7;
      }
    }
    return this.trailColors;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getCurrents(): OceanCurrentData[] {
    return this.currents;
  }
}

export { EARTH_RADIUS, TRAIL_LENGTH, latLngToVec3 };
