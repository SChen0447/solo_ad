import { eventBus, GameEvents } from '../core/EventBus';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PingData {
  id: string;
  origin: Vec2;
  radius: number;
  maxRadius: number;
  speed: number;
  reflectedWalls: Set<string>;
  reflectedCreatures: Set<string>;
  createdAt: number;
  active: boolean;
  duration: number;
}

export interface ReflectPoint {
  id: string;
  position: Vec2;
  normal: Vec2;
  distance: number;
  intensity: number;
  createdAt: number;
  duration: number;
  active: boolean;
}

export interface CreatureData {
  id: string;
  position: Vec2;
  radius: number;
}

export interface PhysicsState {
  walls: Wall[];
  pings: PingData[];
  reflectPoints: ReflectPoint[];
}

const MAX_PINGS = 4;
const REFLECT_DURATION = 500;

export class PhysicsEngine {
  private state: PhysicsState;
  private worldWidth: number;
  private worldHeight: number;
  private pingIdCounter: number = 0;
  private reflectIdCounter: number = 0;

  constructor(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.state = {
      walls: [],
      pings: [],
      reflectPoints: []
    };
    this.initBoundaries();
  }

  private initBoundaries(): void {
    this.state.walls = [
      { id: 'top', x1: 0, y1: 0, x2: this.worldWidth, y2: 0 },
      { id: 'bottom', x1: 0, y1: this.worldHeight, x2: this.worldWidth, y2: this.worldHeight },
      { id: 'left', x1: 0, y1: 0, x2: 0, y2: this.worldHeight },
      { id: 'right', x1: this.worldWidth, y1: 0, x2: this.worldWidth, y2: this.worldHeight }
    ];
  }

  public setWalls(walls: Omit<Wall, 'id'>[]): void {
    this.state.walls = this.state.walls.filter(w =>
      w.id === 'top' || w.id === 'bottom' || w.id === 'left' || w.id === 'right'
    );
    walls.forEach((w, i) => {
      this.state.walls.push({ ...w, id: `wall_${i}` });
    });
  }

  public addWall(wall: Omit<Wall, 'id'>): string {
    const id = `wall_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.state.walls.push({ ...wall, id });
    return id;
  }

  public removeWall(id: string): void {
    this.state.walls = this.state.walls.filter(w => w.id !== id);
  }

  public emitPing(origin: Vec2, pressDuration: number): PingData | null {
    if (this.state.pings.length >= MAX_PINGS) {
      const oldest = this.state.pings.shift();
      if (oldest) {
        eventBus.emit(GameEvents.PING_EXPIRE, { id: oldest.id });
      }
    }

    const normalizedDuration = Math.min(Math.max(pressDuration / 1000, 0.05), 1.0);
    const speed = 500 - normalizedDuration * 350;
    const maxRadius = 150 + normalizedDuration * 500;
    const duration = (maxRadius / speed) * 1000;

    const ping: PingData = {
      id: `ping_${this.pingIdCounter++}`,
      origin: { ...origin },
      radius: 0,
      maxRadius,
      speed,
      reflectedWalls: new Set(),
      reflectedCreatures: new Set(),
      createdAt: performance.now(),
      active: true,
      duration
    };

    this.state.pings.push(ping);
    eventBus.emit(GameEvents.PING_EMIT, ping);

    return ping;
  }

  private circleLineIntersect(
    cx: number, cy: number, cr: number,
    x1: number, y1: number, x2: number, y2: number
  ): { point: Vec2; distance: number } | null {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return null;

    let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const distX = cx - closestX;
    const distY = cy - closestY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance <= cr) {
      const nx = distX / (distance || 1);
      const ny = distY / (distance || 1);
      return {
        point: { x: closestX + nx * cr, y: closestY + ny * cr },
        distance
      };
    }

    return null;
  }

  private lineNormal(wall: Wall): Vec2 {
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: -dy / len, y: dx / len };
  }

  public update(deltaTime: number, creatures: CreatureData[]): void {
    const dt = deltaTime / 1000;

    for (const ping of this.state.pings) {
      if (!ping.active) continue;

      const oldRadius = ping.radius;
      ping.radius += ping.speed * dt;

      if (ping.radius >= ping.maxRadius) {
        ping.radius = ping.maxRadius;
        ping.active = false;
        eventBus.emit(GameEvents.PING_EXPIRE, { id: ping.id });
      }

      for (const wall of this.state.walls) {
        if (ping.reflectedWalls.has(wall.id)) continue;

        const intersect = this.circleLineIntersect(
          ping.origin.x, ping.origin.y, ping.radius,
          wall.x1, wall.y1, wall.x2, wall.y2
        );

        if (intersect) {
          ping.reflectedWalls.add(wall.id);

          const dx = intersect.point.x - ping.origin.x;
          const dy = intersect.point.y - ping.origin.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const intensity = 1 - (distance / ping.maxRadius);

          const reflectPoint: ReflectPoint = {
            id: `reflect_${this.reflectIdCounter++}`,
            position: { ...intersect.point },
            normal: this.lineNormal(wall),
            distance,
            intensity: Math.max(0.2, intensity),
            createdAt: performance.now(),
            duration: REFLECT_DURATION,
            active: true
          };

          this.state.reflectPoints.push(reflectPoint);

          eventBus.emit(GameEvents.PING_REFLECT, {
            pingId: ping.id,
            wallId: wall.id,
            point: reflectPoint
          });
        }
      }

      for (const creature of creatures) {
        if (ping.reflectedCreatures.has(creature.id)) continue;

        const dx = creature.position.x - ping.origin.x;
        const dy = creature.position.y - ping.origin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= ping.radius + creature.radius && dist >= oldRadius - creature.radius) {
          ping.reflectedCreatures.add(creature.id);

          eventBus.emit(GameEvents.CREATURE_HIT, {
            creatureId: creature.id,
            pingId: ping.id,
            position: { ...creature.position }
          });
        }
      }
    }

    const now = performance.now();
    this.state.reflectPoints = this.state.reflectPoints.filter(rp => {
      if (now - rp.createdAt >= rp.duration) {
        rp.active = false;
        return false;
      }
      return true;
    });

    this.state.pings = this.state.pings.filter(p => p.active);
  }

  public checkCircleWallsCollision(
    cx: number, cy: number, cr: number
  ): { collided: boolean; normal: Vec2; overlap: number } {
    let result = { collided: false, normal: { x: 0, y: 0 } as Vec2, overlap: 0 };

    for (const wall of this.state.walls) {
      const intersect = this.circleLineIntersect(cx, cy, cr, wall.x1, wall.y1, wall.x2, wall.y2);
      if (intersect) {
        result.collided = true;
        result.overlap = Math.max(result.overlap, cr - intersect.distance);
        const normal = this.lineNormal(wall);
        const toCenterX = cx - (wall.x1 + wall.x2) / 2;
        const toCenterY = cy - (wall.y1 + wall.y2) / 2;
        const dot = normal.x * toCenterX + normal.y * toCenterY;
        if (dot < 0) {
          result.normal = { x: -normal.x, y: -normal.y };
        } else {
          result.normal = normal;
        }
      }
    }

    return result;
  }

  public getState(): Readonly<PhysicsState> {
    return this.state;
  }

  public resize(worldWidth: number, worldHeight: number): void {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    const topWall = this.state.walls.find(w => w.id === 'top');
    const bottomWall = this.state.walls.find(w => w.id === 'bottom');
    const leftWall = this.state.walls.find(w => w.id === 'left');
    const rightWall = this.state.walls.find(w => w.id === 'right');

    if (topWall) { topWall.x2 = worldWidth; }
    if (bottomWall) { bottomWall.x2 = worldWidth; bottomWall.y1 = worldHeight; bottomWall.y2 = worldHeight; }
    if (leftWall) { leftWall.y2 = worldHeight; }
    if (rightWall) { rightWall.x1 = worldWidth; rightWall.x2 = worldWidth; rightWall.y2 = worldHeight; }
  }

  public clear(): void {
    this.state.pings = [];
    this.state.reflectPoints = [];
  }
}
