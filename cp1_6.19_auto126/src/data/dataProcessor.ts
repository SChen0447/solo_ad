import type { Building, WindRose, WindParticle, WindGridCell } from '@/types';

const GRID_SIZE = 20;
const GRID_SPACING = 5;
const MAX_PARTICLES = 2000;

export class DataProcessor {
  private windGrid: WindGridCell[][][] = [];
  private gridMinX = -50;
  private gridMaxX = 50;
  private gridMinZ = -50;
  private gridMaxZ = 50;
  private gridMinY = 0;
  private gridMaxY = 60;

  constructor() {
    this.initWindGrid();
  }

  private initWindGrid(): void {
    const cellsX = Math.ceil((this.gridMaxX - this.gridMinX) / GRID_SPACING);
    const cellsY = Math.ceil((this.gridMaxY - this.gridMinY) / GRID_SPACING);
    const cellsZ = Math.ceil((this.gridMaxZ - this.gridMinZ) / GRID_SPACING);

    this.windGrid = [];
    for (let i = 0; i < cellsX; i++) {
      this.windGrid[i] = [];
      for (let j = 0; j < cellsY; j++) {
        this.windGrid[i][j] = [];
        for (let k = 0; k < cellsZ; k++) {
          this.windGrid[i][j][k] = {
            x: this.gridMinX + i * GRID_SPACING,
            y: this.gridMinY + j * GRID_SPACING,
            z: this.gridMinZ + k * GRID_SPACING,
            velocity: { x: 0, y: 0, z: 0 },
            speed: 0,
          };
        }
      }
    }
  }

  public calculateWindField(windRose: WindRose, buildings: Building[]): void {
    const windRad = (windRose.direction * Math.PI) / 180;
    const baseVx = Math.sin(windRad) * windRose.speed;
    const baseVz = Math.cos(windRad) * windRose.speed;

    for (let i = 0; i < this.windGrid.length; i++) {
      for (let j = 0; j < this.windGrid[i].length; j++) {
        for (let k = 0; k < this.windGrid[i][j].length; k++) {
          const cell = this.windGrid[i][j][k];
          let vx = baseVx;
          let vy = 0;
          let vz = baseVz;

          for (const building of buildings) {
            const dx = cell.x - building.x;
            const dy = cell.y - building.height / 2;
            const dz = cell.z - building.z;

            const halfW = building.width / 2;
            const halfD = building.depth / 2;

            const distX = Math.max(0, Math.abs(dx) - halfW);
            const distZ = Math.max(0, Math.abs(dz) - halfD);
            const distY = Math.max(0, cell.y > building.height ? cell.y - building.height : -cell.y);

            const dist = Math.sqrt(distX * distX + distZ * distZ + distY * distY);

            if (dist < GRID_SPACING * 4 && dist > 0.1) {
              const strength = 1 - dist / (GRID_SPACING * 4);
              const factor = strength * 0.8;

              if (cell.y < building.height && Math.abs(dx) < halfW + 1 && Math.abs(dz) < halfD + 1) {
                const perpX = -vz;
                const perpZ = vx;
                const perpMag = Math.sqrt(perpX * perpX + perpZ * perpZ) || 1;

                vx = (perpX / perpMag) * windRose.speed * 0.5;
                vz = (perpZ / perpMag) * windRose.speed * 0.5;

                const side = dx > 0 ? 1 : -1;
                vx += side * windRose.speed * 0.3 * factor;

                const sideZ = dz > 0 ? 1 : -1;
                vz += sideZ * windRose.speed * 0.2 * factor;
              } else if (cell.y >= building.height) {
                vy += windRose.speed * 0.3 * factor;
                vx *= 1 - factor * 0.2;
                vz *= 1 - factor * 0.2;
              } else {
                const wakeFactor = this.calculateWakeFactor(dx, dz, building, windRose);
                vx *= 1 - wakeFactor * 0.6;
                vz *= 1 - wakeFactor * 0.6;
                vy += windRose.speed * 0.1 * wakeFactor;
              }
            }
          }

          cell.velocity = { x: vx, y: vy, z: vz };
          cell.speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        }
      }
    }
  }

  private calculateWakeFactor(
    dx: number,
    dz: number,
    building: Building,
    windRose: WindRose
  ): number {
    const windRad = (windRose.direction * Math.PI) / 180;
    const windX = Math.sin(windRad);
    const windZ = Math.cos(windRad);

    const relX = dx - building.x;
    const relZ = dz - building.z;

    const alongWind = relX * windX + relZ * windZ;

    if (alongWind < 0) return 0;

    const perpWind = Math.abs(relX * windZ - relZ * windX);
    const wakeWidth = building.width * 0.5 + alongWind * 0.3;

    if (perpWind > wakeWidth) return 0;

    const distFactor = Math.max(0, 1 - alongWind / (building.width * 3));
    const widthFactor = 1 - perpWind / wakeWidth;

    return distFactor * widthFactor;
  }

  public getWindVelocityAt(x: number, y: number, z: number): { x: number; y: number; z: number; speed: number } {
    if (this.windGrid.length === 0) {
      return { x: 0, y: 0, z: 0, speed: 0 };
    }

    const i = Math.floor((x - this.gridMinX) / GRID_SPACING);
    const j = Math.floor((y - this.gridMinY) / GRID_SPACING);
    const k = Math.floor((z - this.gridMinZ) / GRID_SPACING);

    const clampedI = Math.max(0, Math.min(this.windGrid.length - 2, i));
    const clampedJ = Math.max(0, Math.min(this.windGrid[0].length - 2, j));
    const clampedK = Math.max(0, Math.min(this.windGrid[0][0].length - 2, k));

    if (
      clampedI < 0 ||
      clampedJ < 0 ||
      clampedK < 0 ||
      clampedI >= this.windGrid.length - 1 ||
      clampedJ >= this.windGrid[0].length - 1 ||
      clampedK >= this.windGrid[0][0].length - 1
    ) {
      return { x: 0, y: 0, z: 0, speed: 0 };
    }

    const fx = (x - this.gridMinX) / GRID_SPACING - clampedI;
    const fy = (y - this.gridMinY) / GRID_SPACING - clampedJ;
    const fz = (z - this.gridMinZ) / GRID_SPACING - clampedK;

    const c000 = this.windGrid[clampedI][clampedJ][clampedK];
    const c100 = this.windGrid[clampedI + 1][clampedJ][clampedK];
    const c010 = this.windGrid[clampedI][clampedJ + 1][clampedK];
    const c110 = this.windGrid[clampedI + 1][clampedJ + 1][clampedK];
    const c001 = this.windGrid[clampedI][clampedJ][clampedK + 1];
    const c101 = this.windGrid[clampedI + 1][clampedJ][clampedK + 1];
    const c011 = this.windGrid[clampedI][clampedJ + 1][clampedK + 1];
    const c111 = this.windGrid[clampedI + 1][clampedJ + 1][clampedK + 1];

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const vx =
      lerp(
        lerp(lerp(c000.velocity.x, c100.velocity.x, fx), lerp(c010.velocity.x, c110.velocity.x, fx), fy),
        lerp(lerp(c001.velocity.x, c101.velocity.x, fx), lerp(c011.velocity.x, c111.velocity.x, fx), fy),
        fz
      );
    const vy =
      lerp(
        lerp(lerp(c000.velocity.y, c100.velocity.y, fx), lerp(c010.velocity.y, c110.velocity.y, fx), fy),
        lerp(lerp(c001.velocity.y, c101.velocity.y, fx), lerp(c011.velocity.y, c111.velocity.y, fx), fy),
        fz
      );
    const vz =
      lerp(
        lerp(lerp(c000.velocity.z, c100.velocity.z, fx), lerp(c010.velocity.z, c110.velocity.z, fx), fy),
        lerp(lerp(c001.velocity.z, c101.velocity.z, fx), lerp(c011.velocity.z, c111.velocity.z, fx), fy),
        fz
      );

    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

    return { x: vx, y: vy, z: vz, speed };
  }

  public createInitialParticles(windRose: WindRose): WindParticle[] {
    const particles: WindParticle[] = [];
    const windRad = (windRose.direction * Math.PI) / 180;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const startX = this.gridMinX + Math.random() * (this.gridMaxX - this.gridMinX);
      const startY = Math.random() * 40 + 2;
      const startZ = this.gridMinZ + Math.random() * (this.gridMaxZ - this.gridMinZ);

      const vel = this.getWindVelocityAt(startX, startY, startZ);

      particles.push({
        position: { x: startX, y: startY, z: startZ },
        velocity: { x: vel.x, y: vel.y, z: vel.z },
        speed: vel.speed,
        life: Math.random() * 5,
        maxLife: 5 + Math.random() * 5,
      });
    }

    return particles;
  }

  public updateParticles(particles: WindParticle[], dt: number, windRose: WindRose): WindParticle[] {
    const windRad = (windRose.direction * Math.PI) / 180;

    return particles.map((p) => {
      const vel = this.getWindVelocityAt(p.position.x, p.position.y, p.position.z);

      const newLife = p.life + dt;
      const lifeRatio = newLife / p.maxLife;

      const fadeFactor = lifeRatio < 0.1 ? lifeRatio / 0.1 : lifeRatio > 0.9 ? (1 - lifeRatio) / 0.1 : 1;

      if (newLife >= p.maxLife || p.position.y < 0.5 || p.position.y > 80) {
        const startX = this.gridMinX + Math.random() * (this.gridMaxX - this.gridMinX);
        const startY = Math.random() * 30 + 2;
        const startZ = this.gridMinZ + Math.random() * (this.gridMaxZ - this.gridMinZ);

        const newVel = this.getWindVelocityAt(startX, startY, startZ);

        return {
          position: { x: startX, y: startY, z: startZ },
          velocity: { x: newVel.x, y: newVel.y, z: newVel.z },
          speed: newVel.speed,
          life: 0,
          maxLife: 5 + Math.random() * 5,
        };
      }

      const speed = vel.speed || 0.1;
      const speedFactor = Math.min(speed / windRose.speed, 2);

      return {
        ...p,
        position: {
          x: p.position.x + vel.x * dt * speedFactor * 2,
          y: p.position.y + vel.y * dt * speedFactor * 2,
          z: p.position.z + vel.z * dt * speedFactor * 2,
        },
        velocity: { x: vel.x, y: vel.y, z: vel.z },
        speed: vel.speed,
        life: newLife,
      };
    });
  }

  public getAvgWindSpeed(buildings: Building[], windRose: WindRose): number {
    this.calculateWindField(windRose, buildings);

    let totalSpeed = 0;
    let count = 0;

    const step = 2;
    for (let x = -40; x <= 40; x += step) {
      for (let z = -40; z <= 40; z += step) {
        const vel = this.getWindVelocityAt(x, 10, z);
        totalSpeed += vel.speed;
        count++;
      }
    }

    return count > 0 ? totalSpeed / count : 0;
  }

  public getGridBounds(): { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number } {
    return {
      minX: this.gridMinX,
      maxX: this.gridMaxX,
      minZ: this.gridMinZ,
      maxZ: this.gridMaxZ,
      minY: this.gridMinY,
      maxY: this.gridMaxY,
    };
  }
}

export function getWindColor(speed: number, maxSpeed: number): string {
  const ratio = Math.min(speed / maxSpeed, 1);

  const r = Math.floor(ratio < 0.5 ? ratio * 2 * 34 : 34 + (ratio - 0.5) * 2 * (239 - 34));
  const g = Math.floor(
    ratio < 0.5 ? 130 + ratio * 2 * (223 - 130) : 223 - (ratio - 0.5) * 2 * (223 - 79)
  );
  const b = Math.floor(ratio < 0.5 ? 246 - ratio * 2 * (246 - 94) : 94 - (ratio - 0.5) * 2 * 94);

  return `rgb(${r}, ${g}, ${b})`;
}
