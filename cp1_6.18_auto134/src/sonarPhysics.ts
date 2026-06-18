import type { Platform, Mirror, Enemy, Obstacle, Mechanism, Vector2 } from './levelData';

export interface SonarPulse {
  id: number;
  x: number;
  y: number;
  maxRadius: number;
  currentRadius: number;
  speed: number;
  life: number;
  maxLife: number;
  reflections: SonarReflection[];
  rays: SonarRay[];
  active: boolean;
}

export interface SonarRay {
  angle: number;
  distance: number;
  maxDistance: number;
  hitPoint: Vector2 | null;
  hitNormal: Vector2 | null;
  reflected: boolean;
  reflectionCount: number;
  hitType: 'wall' | 'mirror' | 'enemy' | 'mechanism' | 'obstacle' | 'none';
  hitId: number | null;
}

export interface SonarReflection {
  x: number;
  y: number;
  arcStart: number;
  arcEnd: number;
  intensity: number;
  life: number;
  maxLife: number;
}

export interface ExploredCell {
  x: number;
  y: number;
  explored: boolean;
}

export class SonarPhysics {
  private pulses: SonarPulse[] = [];
  private pulseIdCounter = 0;
  private exploredGrid: boolean[][] = [];
  private gridCellSize = 20;
  private gridWidth = 0;
  private gridHeight = 0;
  private exploredCells = 0;
  private totalCells = 0;

  private platforms: Platform[] = [];
  private mirrors: Mirror[] = [];
  private enemies: Enemy[] = [];
  private obstacles: Obstacle[] = [];
  private mechanisms: Mechanism[] = [];

  private rayCount = 72;
  private maxReflections = 3;

  public onEnemyAlert: ((enemyId: number) => void) | null = null;
  public onMechanismActivate: ((mechanismId: number) => void) | null = null;
  public onObstacleHit: ((obstacleId: number) => void) | null = null;
  public onCrystalBreak: ((obstacleId: number) => void) | null = null;

  constructor(levelWidth: number, levelHeight: number) {
    this.gridWidth = Math.ceil(levelWidth / this.gridCellSize);
    this.gridHeight = Math.ceil(levelHeight / this.gridCellSize);
    this.totalCells = this.gridWidth * this.gridHeight;
    this.exploredGrid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.exploredGrid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.exploredGrid[y][x] = false;
      }
    }
  }

  public setLevelData(
    platforms: Platform[],
    mirrors: Mirror[],
    enemies: Enemy[],
    obstacles: Obstacle[],
    mechanisms: Mechanism[]
  ): void {
    this.platforms = platforms;
    this.mirrors = mirrors;
    this.enemies = enemies;
    this.obstacles = obstacles;
    this.mechanisms = mechanisms;
  }

  public createPulse(x: number, y: number, maxRadius: number = 400): SonarPulse {
    const rays: SonarRay[] = [];
    for (let i = 0; i < this.rayCount; i++) {
      const angle = (i / this.rayCount) * Math.PI * 2;
      rays.push({
        angle,
        distance: 0,
        maxDistance: maxRadius,
        hitPoint: null,
        hitNormal: null,
        reflected: false,
        reflectionCount: 0,
        hitType: 'none',
        hitId: null,
      });
    }

    const pulse: SonarPulse = {
      id: this.pulseIdCounter++,
      x,
      y,
      maxRadius,
      currentRadius: 0,
      speed: 500,
      life: 0.5,
      maxLife: 0.5,
      reflections: [],
      rays,
      active: true,
    };

    this.pulses.push(pulse);
    return pulse;
  }

  public update(dt: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      if (!pulse.active) continue;

      pulse.life -= dt;
      pulse.currentRadius += pulse.speed * dt;

      if (pulse.life <= 0 || pulse.currentRadius >= pulse.maxRadius) {
        pulse.active = false;
        this.pulses.splice(i, 1);
        continue;
      }

      this.updatePulseRays(pulse, dt);
      this.updateExploredArea(pulse);
      this.updateReflections(pulse, dt);
    }
  }

  private updatePulseRays(pulse: SonarPulse, dt: number): void {
    for (const ray of pulse.rays) {
      if (ray.hitType !== 'none') continue;

      const newDistance = pulse.currentRadius;
      if (newDistance > ray.maxDistance) continue;

      const endX = pulse.x + Math.cos(ray.angle) * newDistance;
      const endY = pulse.y + Math.sin(ray.angle) * newDistance;

      const hit = this.castRay(pulse.x, pulse.y, endX, endY, ray.reflectionCount);

      if (hit.hit) {
        ray.distance = hit.distance;
        ray.hitPoint = { x: hit.x, y: hit.y };
        ray.hitNormal = hit.normal;
        ray.hitType = hit.type as 'wall' | 'mirror' | 'enemy' | 'mechanism' | 'obstacle';
        ray.hitId = hit.id;
        ray.reflected = true;

        this.handleHit(ray, hit);

        if (hit.type === 'mirror' && ray.reflectionCount < this.maxReflections) {
          this.createReflectedRay(pulse, ray, hit);
        }
      } else {
        ray.distance = newDistance;
      }
    }
  }

  private castRay(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    reflectionCount: number
  ): {
    hit: boolean;
    x: number;
    y: number;
    distance: number;
    normal: Vector2;
    type: string;
    id: number | null;
  } {
    let closestHit = {
      hit: false,
      x: 0,
      y: 0,
      distance: Infinity,
      normal: { x: 0, y: 0 },
      type: 'none',
      id: null as number | null,
    };

    for (const platform of this.platforms) {
      const hit = this.rayRectIntersect(x1, y1, x2, y2, platform.x, platform.y, platform.width, platform.height);
      if (hit.hit && hit.distance < closestHit.distance) {
        closestHit = { ...hit, type: 'wall', id: null };
      }
    }

    for (const mirror of this.mirrors) {
      const hit = this.rayMirrorIntersect(x1, y1, x2, y2, mirror);
      if (hit.hit && hit.distance < closestHit.distance && hit.distance > 1) {
        closestHit = { ...hit, type: 'mirror', id: mirror.id };
      }
    }

    for (const enemy of this.enemies) {
      const hit = this.rayCircleIntersect(
        x1, y1, x2, y2,
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        Math.max(enemy.width, enemy.height) / 2
      );
      if (hit.hit && hit.distance < closestHit.distance) {
        closestHit = { ...hit, type: 'enemy', id: enemy.id };
      }
    }

    for (const obstacle of this.obstacles) {
      if (obstacle.health <= 0 && obstacle.type !== 'slime') continue;

      const hit = this.rayRectIntersect(
        x1, y1, x2, y2,
        obstacle.x, obstacle.y, obstacle.width, obstacle.height
      );
      if (hit.hit && hit.distance < closestHit.distance) {
        closestHit = { ...hit, type: 'obstacle', id: obstacle.id };
      }
    }

    for (const mechanism of this.mechanisms) {
      if (mechanism.activated) continue;

      const hit = this.rayCircleIntersect(
        x1, y1, x2, y2,
        mechanism.x, mechanism.y,
        mechanism.radius
      );
      if (hit.hit && hit.distance < closestHit.distance) {
        closestHit = { ...hit, type: 'mechanism', id: mechanism.id };
      }
    }

    return closestHit;
  }

  private rayRectIntersect(
    x1: number, y1: number, x2: number, y2: number,
    rx: number, ry: number, rw: number, rh: number
  ): { hit: boolean; x: number; y: number; distance: number; normal: Vector2 } {
    const dx = x2 - x1;
    const dy = y2 - y1;

    let tMin = 0;
    let tMax = 1;
    let normalX = 0;
    let normalY = 0;

    if (Math.abs(dx) < 0.0001) {
      if (x1 < rx || x1 > rx + rw) return { hit: false, x: 0, y: 0, distance: 0, normal: { x: 0, y: 0 } };
    } else {
      let t1 = (rx - x1) / dx;
      let t2 = (rx + rw - x1) / dx;

      if (t1 > t2) {
        [t1, t2] = [t2, t1];
        if (tMin < t1) { normalX = 1; normalY = 0; }
      } else {
        if (tMin < t1) { normalX = -1; normalY = 0; }
      }

      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);

      if (tMin > tMax) return { hit: false, x: 0, y: 0, distance: 0, normal: { x: 0, y: 0 } };
    }

    if (Math.abs(dy) < 0.0001) {
      if (y1 < ry || y1 > ry + rh) return { hit: false, x: 0, y: 0, distance: 0, normal: { x: 0, y: 0 } };
    } else {
      let t1 = (ry - y1) / dy;
      let t2 = (ry + rh - y1) / dy;

      if (t1 > t2) {
        [t1, t2] = [t2, t1];
        if (t1 > tMin && tMin !== 0) { normalX = 0; normalY = 1; }
      } else {
        if (t1 > tMin && tMin !== 0) { normalX = 0; normalY = -1; }
      }

      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);

      if (tMin > tMax) return { hit: false, x: 0, y: 0, distance: 0, normal: { x: 0, y: 0 } };
    }

    if (tMin < 0 || tMin > 1) return { hit: false, x: 0, y: 0, distance: 0, normal: { x: 0, y: 0 } };

    const hitX = x1 + dx * tMin;
    const hitY = y1 + dy * tMin;
    const distance = Math.sqrt(dx * dx + dy * dy) * tMin;

    if (normalX === 0 && normalY === 0) {
      normalY = -1;
    }

    return { hit: true, x: hitX, y: hitY, distance, normal: { x: normalX, y: normalY } };
  }

  private rayMirrorIntersect(
    x1: number, y1: number, x2: number, y2: number,
    mirror: Mirror
  ): { hit: boolean; x: number; y: number; distance: number; normal: Vector2 } {
    const angleRad = (mirror.angle * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const halfWidth = mirror.width / 2;
    const halfHeight = mirror.height / 2;

    const mx1 = mirror.x - halfWidth * cos - (-halfHeight) * sin;
    const my1 = mirror.y - halfWidth * sin + (-halfHeight) * cos;
    const mx2 = mirror.x + halfWidth * cos - (-halfHeight) * sin;
    const my2 = mirror.y + halfWidth * sin + (-halfHeight) * cos;

    const dx = x2 - x1;
    const dy = y2 - y1;

    const x3 = mx1;
    const y3 = my1;
    const x4 = mx2;
    const y4 = my2;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) {
      return { hit: false, x: 0, y: 0, distance: 0, normal: { x: 0, y: 0 } };
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t < 0 || t > 1 || u < 0 || u > 1) {
      return { hit: false, x: 0, y: 0, distance: 0, normal: { x: 0, y: 0 } };
    }

    const hitX = x1 + t * dx;
    const hitY = y1 + t * dy;
    const distance = Math.sqrt(dx * dx + dy * dy) * t;

    const normal = { x: -sin, y: cos };
    const dot = dx * normal.x + dy * normal.y;
    if (dot > 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
    }

    return { hit: true, x: hitX, y: hitY, distance, normal };
  }

  private rayCircleIntersect(
    x1: number, y1: number, x2: number, y2: number,
    cx: number, cy: number, r: number
  ): { hit: boolean; x: number; y: number; distance: number; normal: Vector2 } {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      return { hit: false, x: 0, y: 0, distance: 0, normal: { x: 0, y: 0 } };
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);

    if (t1 < 0 || t1 > 1) {
      return { hit: false, x: 0, y: 0, distance: 0, normal: { x: 0, y: 0 } };
    }

    const hitX = x1 + t1 * dx;
    const hitY = y1 + t1 * dy;
    const distance = Math.sqrt(dx * dx + dy * dy) * t1;

    const normalLen = Math.sqrt((hitX - cx) ** 2 + (hitY - cy) ** 2);
    const normal = {
      x: (hitX - cx) / normalLen,
      y: (hitY - cy) / normalLen,
    };

    return { hit: true, x: hitX, y: hitY, distance, normal };
  }

  private handleHit(ray: SonarRay, hit: { type: string; id: number | null }): void {
    if (hit.type === 'enemy' && hit.id !== null) {
      if (this.onEnemyAlert) {
        this.onEnemyAlert(hit.id);
      }
    } else if (hit.type === 'mechanism' && hit.id !== null) {
      if (this.onMechanismActivate) {
        this.onMechanismActivate(hit.id);
      }
    } else if (hit.type === 'obstacle' && hit.id !== null) {
      const obstacle = this.obstacles.find(o => o.id === hit.id);
      if (obstacle) {
        if (obstacle.type === 'crystal') {
          if (this.onCrystalBreak) {
            this.onCrystalBreak(hit.id);
          }
        } else if (obstacle.type === 'pillar') {
          if (this.onObstacleHit) {
            this.onObstacleHit(hit.id);
          }
        }
      }
    }
  }

  private createReflectedRay(pulse: SonarPulse, originalRay: SonarRay, hit: { x: number; y: number; normal: Vector2 }): void {
    const incidentAngle = originalRay.angle;
    const normalAngle = Math.atan2(hit.normal.y, hit.normal.x);
    const reflectedAngle = 2 * normalAngle - incidentAngle - Math.PI;

    const newRay: SonarRay = {
      angle: reflectedAngle,
      distance: 0,
      maxDistance: originalRay.maxDistance - originalRay.distance,
      hitPoint: null,
      hitNormal: null,
      reflected: true,
      reflectionCount: originalRay.reflectionCount + 1,
      hitType: 'none',
      hitId: null,
    };

    this.addReflectionArc(pulse, hit.x, hit.y, reflectedAngle);

    const endX = hit.x + Math.cos(reflectedAngle) * newRay.maxDistance;
    const endY = hit.y + Math.sin(reflectedAngle) * newRay.maxDistance;

    const newHit = this.castRay(hit.x, hit.y, endX, endY, newRay.reflectionCount);

    if (newHit.hit) {
      newRay.distance = newHit.distance;
      newRay.hitPoint = { x: newHit.x, y: newHit.y };
      newRay.hitNormal = newHit.normal;
      newRay.hitType = newHit.type as 'wall' | 'mirror' | 'enemy' | 'mechanism' | 'obstacle';
      newRay.hitId = newHit.id;

      this.handleHit(newRay, newHit);

      if (newHit.type === 'mirror' && newRay.reflectionCount < this.maxReflections) {
        this.createReflectedRay(pulse, newRay, newHit);
      }
    } else {
      newRay.distance = newRay.maxDistance;
    }

    pulse.rays.push(newRay);
  }

  private addReflectionArc(pulse: SonarPulse, x: number, y: number, direction: number): void {
    pulse.reflections.push({
      x,
      y,
      arcStart: direction - Math.PI / 4,
      arcEnd: direction + Math.PI / 4,
      intensity: 1,
      life: 0.3,
      maxLife: 0.3,
    });
  }

  private updateExploredArea(pulse: SonarPulse): void {
    const radius = pulse.currentRadius;
    const minX = Math.max(0, Math.floor((pulse.x - radius) / this.gridCellSize));
    const maxX = Math.min(this.gridWidth - 1, Math.ceil((pulse.x + radius) / this.gridCellSize));
    const minY = Math.max(0, Math.floor((pulse.y - radius) / this.gridCellSize));
    const maxY = Math.min(this.gridHeight - 1, Math.ceil((pulse.y + radius) / this.gridCellSize));

    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        if (this.exploredGrid[gy][gx]) continue;

        const cellCenterX = gx * this.gridCellSize + this.gridCellSize / 2;
        const cellCenterY = gy * this.gridCellSize + this.gridCellSize / 2;

        const dist = Math.sqrt((cellCenterX - pulse.x) ** 2 + (cellCenterY - pulse.y) ** 2);
        if (dist <= radius) {
          let blocked = false;
          for (const platform of this.platforms) {
            if (this.lineRectIntersect(pulse.x, pulse.y, cellCenterX, cellCenterY,
              platform.x, platform.y, platform.width, platform.height)) {
              blocked = true;
              break;
            }
          }
          if (!blocked) {
            this.exploredGrid[gy][gx] = true;
            this.exploredCells++;
          }
        }
      }
    }
  }

  private lineRectIntersect(
    x1: number, y1: number, x2: number, y2: number,
    rx: number, ry: number, rw: number, rh: number
  ): boolean {
    const hit = this.rayRectIntersect(x1, y1, x2, y2, rx, ry, rw, rh);
    return hit.hit && hit.distance > 0;
  }

  private updateReflections(pulse: SonarPulse, dt: number): void {
    for (let i = pulse.reflections.length - 1; i >= 0; i--) {
      const reflection = pulse.reflections[i];
      reflection.life -= dt;
      reflection.intensity = reflection.life / reflection.maxLife;
      if (reflection.life <= 0) {
        pulse.reflections.splice(i, 1);
      }
    }
  }

  public getPulses(): SonarPulse[] {
    return this.pulses;
  }

  public getExplorationPercentage(): number {
    return (this.exploredCells / this.totalCells) * 100;
  }

  public isExplored(x: number, y: number): boolean {
    const gx = Math.floor(x / this.gridCellSize);
    const gy = Math.floor(y / this.gridCellSize);
    if (gx < 0 || gx >= this.gridWidth || gy < 0 || gy >= this.gridHeight) return false;
    return this.exploredGrid[gy][gx];
  }

  public getGridCellSize(): number {
    return this.gridCellSize;
  }

  public getExploredGrid(): boolean[][] {
    return this.exploredGrid;
  }
}
