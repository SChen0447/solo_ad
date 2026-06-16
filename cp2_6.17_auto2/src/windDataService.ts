import * as THREE from 'three';
import { stateManager, type MonthKey } from './stateManager';
import windDataRaw from './windData.json';

interface WindVector {
  u: number;
  v: number;
}

interface WindDataset {
  month: string;
  latMin: number;
  latMax: number;
  latStep: number;
  lonMin: number;
  lonMax: number;
  lonStep: number;
  data: WindVector[][];
}

export interface WindParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  lat: number;
  lon: number;
}

const EARTH_RADIUS = 100;
const PARTICLE_COUNT = 5000;
const MAX_LIFE = 80;
const MIN_LIFE = 30;

const COLOR_MIN = new THREE.Color(0x00bfff);
const COLOR_MAX = new THREE.Color(0xff4500);
const SPEED_MIN = 0;
const SPEED_MAX = 50;

class WindDataService {
  private datasets: Map<MonthKey, WindDataset> = new Map();
  private particles: WindParticle[] = [];
  private currentMonth: MonthKey = 'january';
  private transitionAlpha: number = 1;
  private transitionDirection: number = 0;
  private pendingMonth: MonthKey | null = null;

  constructor() {
    this.loadData();
    this.initParticles();
    this.setupStateListener();
  }

  private loadData(): void {
    const raw = windDataRaw as {
      datasets: {
        january: WindDataset;
        july: WindDataset;
      };
    };
    this.datasets.set('january', raw.datasets.january);
    this.datasets.set('july', raw.datasets.july);
  }

  private setupStateListener(): void {
    stateManager.subscribe((state) => {
      if (state.currentMonth !== this.currentMonth && !state.isTransitioning) {
        this.startTransition(state.currentMonth);
      }
    });
  }

  private startTransition(targetMonth: MonthKey): void {
    if (targetMonth === this.currentMonth) return;
    this.pendingMonth = targetMonth;
    this.transitionDirection = -1;
    stateManager.set('isTransitioning', true);
  }

  private getWindVector(lat: number, lon: number, month: MonthKey): WindVector {
    const dataset = this.datasets.get(month);
    if (!dataset) return { u: 0, v: 0 };

    const latNorm = ((lat - dataset.latMin) / (dataset.latMax - dataset.latMin)) * (dataset.data.length - 1);
    const lonNorm = ((lon - dataset.lonMin) / (dataset.lonMax - dataset.lonMin)) * (dataset.data[0].length - 1);

    const latIdx0 = Math.floor(Math.max(0, Math.min(dataset.data.length - 2, latNorm)));
    const lonIdx0 = Math.floor(Math.max(0, Math.min(dataset.data[0].length - 2, lonNorm)));
    const latIdx1 = latIdx0 + 1;
    const lonIdx1 = lonIdx0 + 1;

    const latFrac = latNorm - latIdx0;
    const lonFrac = lonNorm - lonIdx0;

    const v00 = dataset.data[latIdx0][lonIdx0];
    const v01 = dataset.data[latIdx0][lonIdx1];
    const v10 = dataset.data[latIdx1][lonIdx0];
    const v11 = dataset.data[latIdx1][lonIdx1];

    const u = this.bilerp(v00.u, v01.u, v10.u, v11.u, latFrac, lonFrac);
    const v = this.bilerp(v00.v, v01.v, v10.v, v11.v, latFrac, lonFrac);

    return { u, v };
  }

  private bilerp(v00: number, v01: number, v10: number, v11: number, tLat: number, tLon: number): number {
    const v0 = v00 + (v01 - v00) * tLon;
    const v1 = v10 + (v11 - v10) * tLon;
    return v0 + (v1 - v0) * tLat;
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(startLife?: number): WindParticle {
    const lat = (Math.random() - 0.5) * 180;
    const lon = (Math.random() - 0.5) * 360;
    const position = this.latLonToVec3(lat, lon);
    const wind = this.getWindVector(lat, lon, this.currentMonth);
    const speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);
    const velocity = this.windToVelocity(lat, lon, wind.u, wind.v);
    const maxLife = MIN_LIFE + Math.random() * (MAX_LIFE - MIN_LIFE);
    const life = startLife !== undefined ? startLife : Math.random() * maxLife;
    const size = 1.5 + Math.random() * 2.5;
    const color = this.getColorForSpeed(speed);

    return {
      position,
      velocity,
      speed,
      life,
      maxLife,
      size,
      color,
      lat,
      lon,
    };
  }

  private latLonToVec3(lat: number, lon: number): THREE.Vector3 {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    return new THREE.Vector3(
      -EARTH_RADIUS * Math.sin(phi) * Math.cos(theta),
      EARTH_RADIUS * Math.cos(phi),
      EARTH_RADIUS * Math.sin(phi) * Math.sin(theta)
    );
  }

  private windToVelocity(lat: number, lon: number, u: number, v: number): THREE.Vector3 {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    const east = new THREE.Vector3(
      -Math.sin(lonRad),
      0,
      Math.cos(lonRad)
    );

    const north = new THREE.Vector3(
      -Math.sin(latRad) * Math.cos(lonRad),
      Math.cos(latRad),
      -Math.sin(latRad) * Math.sin(lonRad)
    );

    const velocity = new THREE.Vector3();
    velocity.addScaledVector(east, u * 0.05);
    velocity.addScaledVector(north, v * 0.05);

    return velocity;
  }

  private getColorForSpeed(speed: number): THREE.Color {
    const t = Math.max(0, Math.min(1, (speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)));
    return COLOR_MIN.clone().lerp(COLOR_MAX, t);
  }

  update(deltaTime: number, speedMultiplier: number): void {
    if (this.transitionDirection !== 0) {
      this.transitionAlpha += this.transitionDirection * deltaTime * 2;
      if (this.transitionDirection < 0 && this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionDirection = 1;
        if (this.pendingMonth) {
          this.currentMonth = this.pendingMonth;
          this.pendingMonth = null;
          this.resetAllParticles();
        }
      } else if (this.transitionDirection > 0 && this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        this.transitionDirection = 0;
        stateManager.set('isTransitioning', false);
      }
    }

    const dt = deltaTime * 60 * speedMultiplier;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.particles[i] = this.createParticle(0);
        continue;
      }

      p.position.addScaledVector(p.velocity, dt);
      p.position.normalize().multiplyScalar(EARTH_RADIUS);

      const { lat, lon } = this.vec3ToLatLon(p.position);
      p.lat = lat;
      p.lon = lon;

      const wind = this.getWindVector(lat, lon, this.currentMonth);
      p.speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);
      p.velocity = this.windToVelocity(lat, lon, wind.u, wind.v);
      p.color = this.getColorForSpeed(p.speed);
    }
  }

  private vec3ToLatLon(vec: THREE.Vector3): { lat: number; lon: number } {
    const normalized = vec.clone().normalize();
    const lat = 90 - Math.acos(normalized.y) * (180 / Math.PI);
    let lon = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI) - 180;
    if (lon < -180) lon += 360;
    if (lon > 180) lon -= 360;
    return { lat, lon };
  }

  private resetAllParticles(): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i] = this.createParticle();
    }
  }

  getParticles(): WindParticle[] {
    return this.particles;
  }

  getTransitionAlpha(): number {
    return this.transitionAlpha;
  }

  analyzeRegion(centerLat: number, centerLon: number, radiusKm: number): {
    avgSpeed: number;
    dominantDirection: string;
    particleCount: number;
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  } {
    const earthCircumference = 40075;
    const degPerKm = 360 / earthCircumference;
    const radiusDeg = radiusKm * degPerKm;

    let totalSpeed = 0;
    let count = 0;
    let uSum = 0;
    let vSum = 0;
    let minLat = 90;
    let maxLat = -90;
    let minLon = 180;
    let maxLon = -180;

    const dataset = this.datasets.get(this.currentMonth);
    if (!dataset) {
      return { avgSpeed: 0, dominantDirection: 'N/A', particleCount: 0, minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 };
    }

    const latStart = Math.max(0, Math.floor(((centerLat - radiusDeg) - dataset.latMin) / dataset.latStep));
    const latEnd = Math.min(dataset.data.length - 1, Math.ceil(((centerLat + radiusDeg) - dataset.latMin) / dataset.latStep));

    for (let latIdx = latStart; latIdx <= latEnd; latIdx++) {
      const lat = dataset.latMin + latIdx * dataset.latStep;
      const lonRadius = radiusDeg / Math.cos((lat * Math.PI) / 180);

      const lonStart = Math.floor(((centerLon - lonRadius) - dataset.lonMin) / dataset.lonStep);
      const lonEnd = Math.ceil(((centerLon + lonRadius) - dataset.lonMin) / dataset.lonStep);

      for (let lonIdx = lonStart; lonIdx <= lonEnd; lonIdx++) {
        let wrappedLonIdx = lonIdx;
        const rowLength = dataset.data[0].length;
        if (wrappedLonIdx < 0) wrappedLonIdx += rowLength;
        if (wrappedLonIdx >= rowLength) wrappedLonIdx -= rowLength;

        const lon = dataset.lonMin + lonIdx * dataset.lonStep;
        const dLat = lat - centerLat;
        const dLon = (lon - centerLon) * Math.cos((lat * Math.PI) / 180);
        const distDeg = Math.sqrt(dLat * dLat + dLon * dLon);

        if (distDeg <= radiusDeg) {
          const wind = dataset.data[latIdx][wrappedLonIdx];
          const speed = Math.sqrt(wind.u * wind.u + wind.v * wind.v);
          totalSpeed += speed;
          uSum += wind.u;
          vSum += wind.v;
          count++;

          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
        }
      }
    }

    const avgSpeed = count > 0 ? totalSpeed / count : 0;
    const avgU = count > 0 ? uSum / count : 0;
    const avgV = count > 0 ? vSum / count : 0;
    const dominantDirection = this.getDirectionName(avgU, avgV);

    return {
      avgSpeed,
      dominantDirection,
      particleCount: count,
      minLat,
      maxLat,
      minLon,
      maxLon,
    };
  }

  private getDirectionName(u: number, v: number): string {
    if (u === 0 && v === 0) return 'Calm';

    const angle = Math.atan2(u, v) * (180 / Math.PI);
    let normalizedAngle = angle;
    if (normalizedAngle < 0) normalizedAngle += 360;

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(normalizedAngle / 45) % 8;
    return directions[index];
  }

  getEarthRadius(): number {
    return EARTH_RADIUS;
  }
}

export const windDataService = new WindDataService();
