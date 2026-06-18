export interface BuildingShape {
  type: 'rect' | 'L' | 'U';
  width: number;
  depth: number;
}

export interface Building {
  id: string;
  x: number;
  z: number;
  height: number;
  rotation: number;
  shape: BuildingShape;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  speed: number;
  trail: Array<{ x: number; y: number; age: number }>;
}

export interface WindCell {
  vx: number;
  vy: number;
  speed: number;
}

export type DisplayMode = 'particles' | 'heatmap' | 'vectors';

const GRID_SIZE = 40;
const CELL_SIZE = 1;
const PARTICLE_COUNT = 400;
const MAX_TRAIL_LENGTH = 8;

class WindSimulator {
  private buildings: Building[] = [];
  private particles: Particle[] = [];
  private windField: WindCell[][] = [];
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private listeners: Set<() => void> = new Set();
  private windDirection: { vx: number; vy: number } = { vx: 1.0, vy: 0.0 };
  private baseSpeed: number = 1.5;
  private lastTime: number = 0;
  public fps: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;

  constructor() {
    this.initWindField();
    this.initParticles();
  }

  private initWindField(): void {
    this.windField = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      this.windField[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        this.windField[i][j] = {
          vx: this.windDirection.vx * this.baseSpeed,
          vy: this.windDirection.vy * this.baseSpeed,
          speed: this.baseSpeed
        };
      }
    }
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(randomX: boolean = false): Particle {
    return {
      x: randomX ? Math.random() * GRID_SIZE : 0,
      y: Math.random() * GRID_SIZE,
      vx: this.windDirection.vx * this.baseSpeed,
      vy: this.windDirection.vy * this.baseSpeed + (Math.random() - 0.5) * 0.3,
      age: 0,
      maxAge: 200 + Math.random() * 200,
      speed: this.baseSpeed,
      trail: []
    };
  }

  public setBuildings(buildings: Building[]): void {
    this.buildings = buildings;
  }

  public startSimulation(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.fpsTime = this.lastTime;
    this.frameCount = 0;
    this.animate();
  }

  public pauseSimulation(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private isPointInBuilding(x: number, z: number): Building | null {
    for (const b of this.buildings) {
      const cos = Math.cos(-b.rotation);
      const sin = Math.sin(-b.rotation);
      const dx = x - b.x;
      const dz = z - b.z;
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;

      const hw = b.shape.width / 2;
      const hd = b.shape.depth / 2;

      if (b.shape.type === 'rect') {
        if (localX >= -hw && localX <= hw && localZ >= -hd && localZ <= hd) {
          return b;
        }
      } else if (b.shape.type === 'L') {
        const armW = b.shape.width * 0.4;
        const armD = b.shape.depth * 0.4;
        const inMainX = localX >= -hw && localX <= hw;
        const inMainZ = localZ >= -hd && localZ <= -hd + armD;
        const inArmX = localX >= hw - armW && localX <= hw;
        const inArmZ = localZ >= -hd && localZ <= hd;
        if ((inMainX && inMainZ) || (inArmX && inArmZ)) {
          return b;
        }
      } else if (b.shape.type === 'U') {
        const armW = b.shape.width * 0.3;
        const gap = b.shape.depth * 0.5;
        const inBackX = localX >= -hw && localX <= hw;
        const inBackZ = localZ >= -hd && localZ <= -hd + armW;
        const inLeftX = localX >= -hw && localX <= -hw + armW;
        const inLeftZ = localZ >= -hd && localZ <= hd;
        const inRightX = localX >= hw - armW && localX <= hw;
        const inRightZ = localZ >= -hd && localZ <= hd;
        if ((inBackX && inBackZ) || (inLeftX && inLeftZ) || (inRightX && inRightZ)) {
          if (!(localX > -hw + armW && localX < hw - armW && localZ > -hd + gap)) {
            return b;
          }
        }
      }
    }
    return null;
  }

  private computeCollisionResponse(px: number, py: number, building: Building): { nx: number; ny: number; push: number } {
    const cos = Math.cos(-building.rotation);
    const sin = Math.sin(-building.rotation);
    const dx = px - building.x;
    const dz = py - building.z;
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;

    const hw = building.shape.width / 2;
    const hd = building.shape.depth / 2;

    const distLeft = localX + hw;
    const distRight = hw - localX;
    const distTop = localZ + hd;
    const distBottom = hd - localZ;

    let minDist = Math.min(Math.abs(distLeft), Math.abs(distRight), Math.abs(distTop), Math.abs(distBottom));
    let nxLocal = 0, nzLocal = 0;

    if (Math.abs(distLeft) === minDist) {
      nxLocal = -1;
      nzLocal = 0;
      minDist = distLeft;
    } else if (Math.abs(distRight) === minDist) {
      nxLocal = 1;
      nzLocal = 0;
      minDist = distRight;
    } else if (Math.abs(distTop) === minDist) {
      nxLocal = 0;
      nzLocal = -1;
      minDist = distTop;
    } else {
      nxLocal = 0;
      nzLocal = 1;
      minDist = distBottom;
    }

    const cos2 = Math.cos(building.rotation);
    const sin2 = Math.sin(building.rotation);
    const worldNx = nxLocal * cos2 - nzLocal * sin2;
    const worldNz = nxLocal * sin2 + nzLocal * cos2;

    return { nx: worldNx, ny: worldNz, push: Math.max(0, -minDist + 0.1) };
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.age += dt * 60;

      const gridX = Math.floor(p.x);
      const gridY = Math.floor(p.y);

      let fieldVx = this.windDirection.vx * this.baseSpeed;
      let fieldVy = this.windDirection.vy * this.baseSpeed;

      if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
        fieldVx = this.windField[gridX][gridY].vx;
        fieldVy = this.windField[gridX][gridY].vy;
      }

      p.vx += (fieldVx - p.vx) * 0.1;
      p.vy += (fieldVy - p.vy) * 0.1;

      p.vx += (Math.random() - 0.5) * 0.02;
      p.vy += (Math.random() - 0.5) * 0.02;

      let newX = p.x + p.vx * dt * 3;
      let newY = p.y + p.vy * dt * 3;

      const building = this.isPointInBuilding(newX, newY);
      if (building) {
        const response = this.computeCollisionResponse(newX, newY, building);
        if (response.push > 0) {
          newX += response.nx * response.push * 1.5;
          newY += response.ny * response.push * 1.5;
        }
        const dot = p.vx * response.nx + p.vy * response.ny;
        p.vx = (p.vx - 2 * dot * response.nx) * 0.6;
        p.vy = (p.vy - 2 * dot * response.ny) * 0.6;
        const tangentX = -response.ny;
        const tangentY = response.nx;
        p.vx += tangentX * this.baseSpeed * 0.8;
        p.vy += tangentY * this.baseSpeed * 0.8;
      }

      p.x = newX;
      p.y = newY;
      p.speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

      p.trail.unshift({ x: p.x, y: p.y, age: 0 });
      if (p.trail.length > MAX_TRAIL_LENGTH) {
        p.trail.pop();
      }
      for (let t = 0; t < p.trail.length; t++) {
        p.trail[t].age++;
      }

      if (p.age > p.maxAge || p.x < -2 || p.x > GRID_SIZE + 2 || p.y < -2 || p.y > GRID_SIZE + 2) {
        this.particles[i] = this.createParticle(false);
        this.particles[i].y = Math.random() * GRID_SIZE;
      }
    }
  }

  private updateWindField(): void {
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        let baseVx = this.windDirection.vx * this.baseSpeed;
        let baseVy = this.windDirection.vy * this.baseSpeed;

        for (const b of this.buildings) {
          const dx = i - b.x;
          const dz = j - b.z;
          const cos = Math.cos(-b.rotation);
          const sin = Math.sin(-b.rotation);
          const localX = dx * cos - dz * sin;
          const localZ = dx * sin + dz * cos;

          const hw = b.shape.width / 2;
          const hd = b.shape.depth / 2;

          const expand = 2.5;
          if (
            localX >= -hw - expand &&
            localX <= hw + expand &&
            localZ >= -hd - expand &&
            localZ <= hd + expand
          ) {
            const dist = Math.max(
              Math.max(-hw - localX, localX - hw),
              Math.max(-hd - localZ, localZ - hd)
            );
            const influence = Math.max(0, 1 - dist / expand);
            const ang = Math.atan2(localZ, localX) * influence * 0.5;
            const cv = Math.cos(ang);
            const sv = Math.sin(ang);
            const tvx = baseVx * cv - baseVy * sv;
            const tvy = baseVx * sv + baseVy * cv;
            baseVx = tvx;
            baseVy = tvy;
            baseVx *= 0.3 + 0.7 * Math.abs(dist) / expand;
            baseVy *= 0.3 + 0.7 * Math.abs(dist) / expand;
          }
        }

        this.windField[i][j].vx = baseVx;
        this.windField[i][j].vy = baseVy;
        this.windField[i][j].speed = Math.sqrt(baseVx * baseVx + baseVy * baseVy);
      }
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = Math.min(dt, 0.05);

    this.frameCount++;
    if (now - this.fpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = now;
    }

    this.updateWindField();
    this.updateParticles(dt);
    this.notify();

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  public getParticleData(): Particle[] {
    return this.particles;
  }

  public getWindField(): WindCell[][] {
    return this.windField;
  }

  public getGridSize(): number {
    return GRID_SIZE;
  }

  public getCellSize(): number {
    return CELL_SIZE;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getAverageWindDirection(): number {
    let avgVx = 0;
    let avgVy = 0;
    for (const p of this.particles) {
      avgVx += p.vx;
      avgVy += p.vy;
    }
    avgVx /= this.particles.length;
    avgVy /= this.particles.length;
    return Math.atan2(avgVy, avgVx) * (180 / Math.PI);
  }
}

export const windSimulator = new WindSimulator();
