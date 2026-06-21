export interface PlanetData {
  id: string;
  name: string;
  nameEn: string;
  gravity: number;
  bgTop: number;
  bgBottom: number;
  groundColor: number;
  accentColor: number;
  particleCount: number;
}

export const PLANETS: PlanetData[] = [
  {
    id: 'earth',
    name: '地球',
    nameEn: 'Earth',
    gravity: 1.0,
    bgTop: 0x4a90d9,
    bgBottom: 0x87ceeb,
    groundColor: 0x5d8a4a,
    accentColor: 0x7cb342,
    particleCount: 18
  },
  {
    id: 'mars',
    name: '火星',
    nameEn: 'Mars',
    gravity: 0.38,
    bgTop: 0x8b3a1a,
    bgBottom: 0xd46a3a,
    groundColor: 0xa0522d,
    accentColor: 0xcd5c5c,
    particleCount: 12
  },
  {
    id: 'moon',
    name: '月球',
    nameEn: 'Moon',
    gravity: 0.16,
    bgTop: 0x1a1a2e,
    bgBottom: 0x2d2d44,
    groundColor: 0x808080,
    accentColor: 0xa9a9a9,
    particleCount: 6
  },
  {
    id: 'europa',
    name: '木卫二',
    nameEn: 'Europa',
    gravity: 0.13,
    bgTop: 0x2c3e6b,
    bgBottom: 0x6b8e9e,
    groundColor: 0xb8c4d4,
    accentColor: 0xd4e4f0,
    particleCount: 5
  }
];

export interface GravityUpdateCallback {
  (gravity: number, planet: PlanetData, progress: number): void;
}

export class GravityManager {
  private currentPlanet: PlanetData;
  private targetPlanet: PlanetData;
  private currentGravity: number;
  private isInterpolating: boolean = false;
  private interpolationProgress: number = 0;
  private interpolationDuration: number = 1500;
  private interpolationStartGravity: number = 0;
  private callbacks: GravityUpdateCallback[] = [];
  private readonly baseGravity: number = 800;

  constructor() {
    this.currentPlanet = PLANETS[0];
    this.targetPlanet = PLANETS[0];
    this.currentGravity = this.currentPlanet.gravity * this.baseGravity;
  }

  public getCurrentPlanet(): PlanetData {
    return this.currentPlanet;
  }

  public getCurrentGravity(): number {
    return this.currentGravity;
  }

  public getCurrentGravityFactor(): number {
    return this.currentPlanet.gravity;
  }

  public getBaseGravity(): number {
    return this.baseGravity;
  }

  public isTransitioning(): boolean {
    return this.isInterpolating;
  }

  public addCallback(callback: GravityUpdateCallback): void {
    if (!this.callbacks.includes(callback)) {
      this.callbacks.push(callback);
    }
  }

  public removeCallback(callback: GravityUpdateCallback): void {
    const idx = this.callbacks.indexOf(callback);
    if (idx >= 0) {
      this.callbacks.splice(idx, 1);
    }
  }

  public switchToPlanet(planetId: string): boolean {
    const planet = PLANETS.find(p => p.id === planetId);
    if (!planet || planet.id === this.targetPlanet.id) {
      return false;
    }
    this.targetPlanet = planet;
    this.interpolationStartGravity = this.currentGravity;
    this.interpolationProgress = 0;
    this.isInterpolating = true;
    return true;
  }

  public update(deltaTime: number): void {
    if (!this.isInterpolating) {
      return;
    }

    this.interpolationProgress += deltaTime;
    let t = Math.min(this.interpolationProgress / this.interpolationDuration, 1);
    t = this.easeInOutCubic(t);

    const targetGravity = this.targetPlanet.gravity * this.baseGravity;
    this.currentGravity = this.interpolationStartGravity + (targetGravity - this.interpolationStartGravity) * t;

    this.callbacks.forEach(cb => {
      try {
        cb(this.currentGravity, this.targetPlanet, t);
      } catch (e) {
        console.error('Gravity callback error:', e);
      }
    });

    if (t >= 1) {
      this.isInterpolating = false;
      this.currentPlanet = this.targetPlanet;
      this.currentGravity = this.currentPlanet.gravity * this.baseGravity;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getInterpolationProgress(): number {
    return Math.min(this.interpolationProgress / this.interpolationDuration, 1);
  }

  public getAllPlanets(): PlanetData[] {
    return [...PLANETS];
  }
}
