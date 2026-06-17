import * as THREE from 'three';
import rawWindData from './windData.json';
import { stateManager, MonthKey, SelectedRegion } from './stateManager';

export interface WindGridPoint {
  u: number;
  v: number;
}

export interface WindFieldData {
  lats: number[];
  lons: number[];
  latStep: number;
  lonStep: number;
  grid: WindGridPoint[][];
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

export interface ParticleData {
  index: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  baseSpeed: number;
  size: number;
  color: THREE.Color;
}

export interface RegionAnalysis {
  centerLat: number;
  centerLon: number;
  avgSpeed: number;
  dominantDirection: string;
  avgU: number;
  avgV: number;
  particleCount: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

const EARTH_RADIUS = 1;
const PARTICLE_COUNT = 5000;
const MIN_PARTICLE_LIFE = 80;
const MAX_PARTICLE_LIFE = 200;
const MAX_WIND_SPEED = 80;
const MIN_SIZE = 1.5;
const MAX_SIZE = 4.0;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function parseWindField(raw: {
  lats: number[];
  lons: number[];
  latStep: number;
  lonStep: number;
  data: number[][];
}): WindFieldData {
  const { lats, lons, latStep, lonStep, data } = raw;
  const numLats = lats.length;
  const numLons = lons.length;
  const grid: WindGridPoint[][] = new Array(numLats);
  for (let i = 0; i < numLats; i++) {
    grid[i] = new Array(numLons);
    for (let j = 0; j < numLons; j++) {
      const idx = i * numLons + j;
      const [u, v] = data[idx] || [0, 0];
      grid[i][j] = { u, v };
    }
  }
  return {
    lats,
    lons,
    latStep,
    lonStep,
    grid,
    latMin: lats[0],
    latMax: lats[lats.length - 1],
    lonMin: lons[0],
    lonMax: lons[lons.length - 1],
  };
}

function bilinearInterpolate(field: WindFieldData, lat: number, lon: number): { u: number; v: number } {
  const { lats, lons, grid, latStep, lonStep } = field;

  let latNorm = ((lat - field.latMin) / latStep);
  let lonNorm = ((lon - field.lonMin) / lonStep);

  while (lonNorm < 0) lonNorm += lons.length;
  while (lonNorm >= lons.length) lonNorm -= lons.length;
  latNorm = Math.max(0, Math.min(lats.length - 1, latNorm));

  const i0 = Math.floor(latNorm);
  const j0 = Math.floor(lonNorm);
  const i1 = Math.min(i0 + 1, lats.length - 1);
  const j1 = (j0 + 1) % lons.length;

  const fi = latNorm - i0;
  const fj = lonNorm - j0;

  const g00 = grid[i0][j0];
  const g10 = grid[i1][j0];
  const g01 = grid[i0][j1];
  const g11 = grid[i1][j1];

  const u = (1 - fi) * (1 - fj) * g00.u + fi * (1 - fj) * g10.u + (1 - fi) * fj * g01.u + fi * fj * g11.u;
  const v = (1 - fi) * (1 - fj) * g00.v + fi * (1 - fj) * g10.v + (1 - fi) * fj * g01.v + fi * fj * g11.v;

  return { u, v };
}

function latLonToVec3(lat: number, lon: number, radius: number = EARTH_RADIUS): THREE.Vector3 {
  const phi = toRadians(90 - lat);
  const theta = toRadians(lon);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function vec3ToLatLon(v: THREE.Vector3): { lat: number; lon: number } {
  const n = v.clone().normalize();
  const lat = 90 - (Math.acos(n.y) * 180) / Math.PI;
  const lon = (Math.atan2(n.z, n.x) * 180) / Math.PI;
  return { lat, lon };
}

function getDirectionLabel(u: number, v: number): string {
  if (Math.abs(u) < 0.5 && Math.abs(v) < 0.5) return 'Calm';
  const angle = (Math.atan2(u, v) * 180) / Math.PI;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((angle + 360) % 360) / 45) % 8;
  return dirs[idx];
}

function speedToColor(speed: number): THREE.Color {
  const t = Math.min(1, Math.max(0, speed / MAX_WIND_SPEED));
  const c = new THREE.Color();
  const blue = new THREE.Color(0x00bfff);
  const red = new THREE.Color(0xff4500);
  c.lerpColors(blue, red, t);
  return c;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class WindDataService {
  private windFields: Record<MonthKey, WindFieldData>;
  private particles: ParticleData[] = [];
  private particleSystem: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.Material | null = null;

  private positionsAttr: THREE.Float32BufferAttribute | null = null;
  private colorsAttr: THREE.Float32BufferAttribute | null = null;
  private sizesAttr: THREE.Float32BufferAttribute | null = null;
  private opacityAttr: THREE.Float32BufferAttribute | null = null;

  private fadeAlpha = 1.0;
  private fadeTarget = 1.0;
  private transitionInProgress = false;
  private pendingMonth: MonthKey | null = null;

  constructor() {
    this.windFields = {
      january: parseWindField((rawWindData as any).january2020),
      july: parseWindField((rawWindData as any).july2020),
    };
    this.initParticles();
    this.setupStateListeners();
  }

  private setupStateListeners(): void {
    stateManager.subscribe('currentMonth', (_state, prevState) => {
      if (_state.currentMonth !== prevState.currentMonth) {
        this.scheduleMonthTransition(_state.currentMonth);
      }
    });
  }

  private scheduleMonthTransition(newMonth: MonthKey): void {
    if (this.transitionInProgress) {
      this.pendingMonth = newMonth;
      return;
    }
    this.transitionInProgress = true;
    this.fadeTarget = 0.0;
    this.pendingMonth = newMonth;
    stateManager.set('isTransitioning', true);
  }

  private completeTransition(): void {
    if (this.pendingMonth) {
      this.resetParticles();
      this.pendingMonth = null;
    }
    this.fadeTarget = 1.0;
    setTimeout(() => {
      this.transitionInProgress = false;
      stateManager.set('isTransitioning', false);
    }, 100);
  }

  private initParticles(): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const opacities = new Float32Array(PARTICLE_COUNT);

    this.particles = [];

    const month = stateManager.get('currentMonth');
    const field = this.windFields[month];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const lat = (Math.random() * 180) - 90;
      const lon = (Math.random() * 360) - 180;

      const { u, v } = bilinearInterpolate(field, lat, lon);
      const speed = Math.sqrt(u * u + v * v);

      const position = latLonToVec3(lat, lon, EARTH_RADIUS * (1.002 + Math.random() * 0.005));
      const color = speedToColor(speed);
      const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
      const maxLife = MIN_PARTICLE_LIFE + Math.random() * (MAX_PARTICLE_LIFE - MIN_PARTICLE_LIFE);

      this.particles.push({
        index: i,
        position: position.clone(),
        velocity: new THREE.Vector3(),
        life: Math.random() * maxLife,
        maxLife,
        baseSpeed: Math.max(1, speed),
        size,
        color: color.clone(),
      });

      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = size;
      opacities[i] = 1.0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.positionsAttr = new THREE.Float32BufferAttribute(positions, 3);
    this.colorsAttr = new THREE.Float32BufferAttribute(colors, 3);
    this.sizesAttr = new THREE.Float32BufferAttribute(sizes, 1);
    this.opacityAttr = new THREE.Float32BufferAttribute(opacities, 1);

    this.geometry.setAttribute('position', this.positionsAttr);
    this.geometry.setAttribute('color', this.colorsAttr);
    this.geometry.setAttribute('size', this.sizesAttr);
    this.geometry.setAttribute('aOpacity', this.opacityAttr);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uGlobalOpacity: { value: 1.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute float aOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uGlobalOpacity;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vOpacity * uGlobalOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.particleSystem = new THREE.Points(this.geometry!, this.material!);
    this.particleSystem.frustumCulled = false;
  }

  private resetParticles(): void {
    if (!this.positionsAttr || !this.colorsAttr || !this.sizesAttr || !this.opacityAttr) return;

    const month = stateManager.get('currentMonth');
    const field = this.windFields[month];
    const positions = this.positionsAttr.array as Float32Array;
    const colors = this.colorsAttr.array as Float32Array;
    const sizes = this.sizesAttr.array as Float32Array;
    const opacities = this.opacityAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const lat = (Math.random() * 180) - 90;
      const lon = (Math.random() * 360) - 180;
      const { u, v } = bilinearInterpolate(field, lat, lon);
      const speed = Math.sqrt(u * u + v * v);

      const position = latLonToVec3(lat, lon, EARTH_RADIUS * (1.002 + Math.random() * 0.005));
      const color = speedToColor(speed);
      const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
      const maxLife = MIN_PARTICLE_LIFE + Math.random() * (MAX_PARTICLE_LIFE - MIN_PARTICLE_LIFE);

      const p = this.particles[i];
      p.position.copy(position);
      p.velocity.set(0, 0, 0);
      p.life = Math.random() * maxLife;
      p.maxLife = maxLife;
      p.baseSpeed = Math.max(1, speed);
      p.size = size;
      p.color.copy(color);

      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = size;
      opacities[i] = 1.0;
    }

    this.positionsAttr.needsUpdate = true;
    this.colorsAttr.needsUpdate = true;
    this.sizesAttr.needsUpdate = true;
    this.opacityAttr.needsUpdate = true;
  }

  private respawnParticle(p: ParticleData, field: WindFieldData): void {
    const lat = (Math.random() * 180) - 90;
    const lon = (Math.random() * 360) - 180;
    const { u, v } = bilinearInterpolate(field, lat, lon);
    const speed = Math.sqrt(u * u + v * v);

    const position = latLonToVec3(lat, lon, EARTH_RADIUS * (1.002 + Math.random() * 0.005));
    const color = speedToColor(speed);
    const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);

    p.position.copy(position);
    p.velocity.set(0, 0, 0);
    p.life = 0;
    p.maxLife = MIN_PARTICLE_LIFE + Math.random() * (MAX_PARTICLE_LIFE - MIN_PARTICLE_LIFE);
    p.baseSpeed = Math.max(1, speed);
    p.size = size;
    p.color.copy(color);
  }

  update(deltaTime: number): void {
    if (!this.positionsAttr || !this.colorsAttr || !this.opacityAttr) return;

    const FADE_SPEED = 2.0;
    if (this.fadeAlpha < this.fadeTarget) {
      this.fadeAlpha = Math.min(this.fadeTarget, this.fadeAlpha + deltaTime * FADE_SPEED);
      if (this.fadeAlpha === this.fadeTarget && this.fadeTarget === 1.0 && this.transitionInProgress) {
        this.completeTransition();
      }
    } else if (this.fadeAlpha > this.fadeTarget) {
      this.fadeAlpha = Math.max(this.fadeTarget, this.fadeAlpha - deltaTime * FADE_SPEED);
      if (this.fadeAlpha === this.fadeTarget && this.fadeTarget === 0.0 && this.transitionInProgress) {
        this.completeTransition();
      }
    }

    if (this.material) {
      const mat = this.material as unknown as THREE.ShaderMaterial;
      mat.uniforms.uGlobalOpacity.value = this.fadeAlpha;
    }

    const animationSpeed = stateManager.get('animationSpeed');
    const month = stateManager.get('currentMonth');
    const field = this.windFields[month];

    const positions = this.positionsAttr.array as Float32Array;
    const colors = this.colorsAttr.array as Float32Array;
    const opacities = this.opacityAttr.array as Float32Array;
    const dt = deltaTime * animationSpeed * 0.6;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];

      p.life += dt;
      if (p.life >= p.maxLife) {
        this.respawnParticle(p, field);
      }

      const { lat, lon } = vec3ToLatLon(p.position);
      const { u, v } = bilinearInterpolate(field, lat, lon);
      const speed = Math.sqrt(u * u + v * v);

      const pColor = speedToColor(speed);
      p.color.lerp(pColor, 0.05);
      p.baseSpeed += (Math.max(1, speed) - p.baseSpeed) * 0.05;

      const east = new THREE.Vector3(-Math.sin(toRadians(lon)), 0, Math.cos(toRadians(lon)));
      const north = new THREE.Vector3(
        -Math.sin(toRadians(lat)) * Math.cos(toRadians(lon)),
        Math.cos(toRadians(lat)),
        -Math.sin(toRadians(lat)) * Math.sin(toRadians(lon))
      );

      const moveScale = 0.00008 * (1 + p.baseSpeed * 0.08) * dt;
      p.velocity.copy(east.multiplyScalar(u * moveScale)).add(north.multiplyScalar(v * moveScale));
      p.position.add(p.velocity);
      p.position.normalize().multiplyScalar(EARTH_RADIUS * 1.003);

      const lifeRatio = p.life / p.maxLife;
      let alpha = 1.0;
      if (lifeRatio < 0.1) {
        alpha = lifeRatio / 0.1;
      } else if (lifeRatio > 0.7) {
        alpha = 1.0 - (lifeRatio - 0.7) / 0.3;
      }
      alpha = Math.max(0, Math.min(1, alpha));

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      opacities[i] = alpha;
    }

    this.positionsAttr.needsUpdate = true;
    this.colorsAttr.needsUpdate = true;
    this.opacityAttr.needsUpdate = true;
  }

  getParticleSystem(): THREE.Points {
    if (!this.particleSystem) {
      throw new Error('Particle system not initialized');
    }
    return this.particleSystem;
  }

  getParticles(): Readonly<ParticleData[]> {
    return this.particles;
  }

  analyzeRegion(lat: number, lon: number, radiusKm: number = 200): RegionAnalysis {
    const month = stateManager.get('currentMonth');
    const field = this.windFields[month];
    let totalU = 0;
    let totalV = 0;
    let count = 0;
    let latMin = 90;
    let latMax = -90;
    let lonMin = 180;
    let lonMax = -180;

    const sampleStep = 1;
    for (let i = 0; i < field.lats.length; i += sampleStep) {
      for (let j = 0; j < field.lons.length; j += sampleStep) {
        const pLat = field.lats[i];
        const pLon = field.lons[j];
        const d = haversineDistanceKm(lat, lon, pLat, pLon);
        if (d <= radiusKm) {
          const { u, v } = field.grid[i][j];
          totalU += u;
          totalV += v;
          count++;
          if (pLat < latMin) latMin = pLat;
          if (pLat > latMax) latMax = pLat;
          if (pLon < lonMin) lonMin = pLon;
          if (pLon > lonMax) lonMax = pLon;
        }
      }
    }

    let avgSpeed = 0;
    let dominantDirection = 'N/A';
    let avgU = 0;
    let avgV = 0;

    if (count > 0) {
      avgU = totalU / count;
      avgV = totalV / count;
      avgSpeed = Math.sqrt(avgU * avgU + avgV * avgV);
      dominantDirection = getDirectionLabel(avgU, avgV);
    } else {
      latMin = lat;
      latMax = lat;
      lonMin = lon;
      lonMax = lon;
    }

    return {
      centerLat: lat,
      centerLon: lon,
      avgSpeed,
      dominantDirection,
      avgU,
      avgV,
      particleCount: count,
      latMin,
      latMax,
      lonMin,
      lonMax,
    };
  }

  highlightParticlesInRegion(region: SelectedRegion | null): void {
    if (!this.colorsAttr) return;
    const colors = this.colorsAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      const { lat, lon } = vec3ToLatLon(p.position);
      let inRegion = false;

      if (region) {
        const d = haversineDistanceKm(region.lat, region.lon, lat, lon);
        inRegion = d <= region.radiusKm;
      }

      if (inRegion && region) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 0.0;
      } else {
        const speed = p.baseSpeed;
        const c = speedToColor(speed);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
    }
    this.colorsAttr.needsUpdate = true;
  }

  dispose(): void {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    this.particleSystem = null;
    this.geometry = null;
    this.material = null;
    this.particles = [];
  }
}

export const windDataService = new WindDataService();
export default windDataService;

export { latLonToVec3, vec3ToLatLon, haversineDistanceKm };
