import { eventBus } from '../../eventBus';
import { pathfinder } from './Pathfinder';
import {
  Unit,
  MapTile,
  TILE_SIZE,
  MIN_FORMATION_DISTANCE,
  MAP_WIDTH,
  MAP_HEIGHT
} from '../gameMap/types';

export interface UnitCommandData {
  unitIds: string[];
  type: 'move' | 'attack';
  targetGridX: number;
  targetGridY: number;
}

export interface PositionUpdateData {
  unitId: string;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  state: string;
  path: Array<{ x: number; y: number }>;
  pathIndex: number;
}

const SEPARATION_ITERATIONS = 4;
const SEPARATION_FORCE = 0.55;
const ALIGNMENT_FORCE = 0.15;
const MAX_PUSH_PER_FRAME = 1.2;

export class UnitBehaviorManager {
  private units: Map<string, Unit> = new Map();
  private tiles: MapTile[][] = [];
  private pendingReroute: Map<string, number> = new Map();

  init(): void {
    eventBus.on('state:init', (data: unknown) => {
      const d = data as { units: Unit[]; tiles: MapTile[][] };
      this.setUnits(d.units);
      this.setTiles(d.tiles);
    });

    eventBus.on('obstacle:added', () => {
      const now = performance.now();
      for (const [id, u] of this.units) {
        if (u.state === 'moving' && u.path.length > 0) {
          this.pendingReroute.set(id, now);
        }
      }
    });
  }

  setUnits(units: Unit[]): void {
    this.units.clear();
    for (const u of units) this.units.set(u.id, { ...u });
  }

  setTiles(tiles: MapTile[][]): void {
    this.tiles = tiles;
  }

  getUnit(id: string): Unit | undefined {
    return this.units.get(id);
  }

  getAllUnits(): Unit[] {
    return Array.from(this.units.values());
  }

  handleCommand(command: UnitCommandData): void {
    const selectedUnits: Unit[] = [];
    for (const id of command.unitIds) {
      const u = this.units.get(id);
      if (u) selectedUnits.push(u);
    }
    if (selectedUnits.length === 0) return;

    if (selectedUnits.length === 1) {
      this.moveSingleUnit(selectedUnits[0], command.targetGridX, command.targetGridY);
    } else {
      this.moveFormation(selectedUnits, command.targetGridX, command.targetGridY);
    }
  }

  private moveSingleUnit(unit: Unit, tgx: number, tgy: number): void {
    const startGridX = Math.floor(unit.x / TILE_SIZE);
    const startGridY = Math.floor(unit.y / TILE_SIZE);
    const gridPath = pathfinder.findPath(this.tiles, startGridX, startGridY, tgx, tgy, false);
    const pixelPath = this.gridToPixelPath(gridPath);
    this.trimFirstPoint(pixelPath, unit.x, unit.y);
    const u = this.units.get(unit.id);
    if (u) {
      u.path = pixelPath;
      u.pathIndex = 0;
      u.state = pixelPath.length > 0 ? 'moving' : 'idle';
      u.formationOffset = undefined;
      this.emitUpdate(u);
    }
  }

  private moveFormation(units: Unit[], tgx: number, tgy: number): void {
    let cx = 0;
    let cy = 0;
    for (const u of units) { cx += u.x; cy += u.y; }
    cx /= units.length;
    cy /= units.length;

    for (const u of units) {
      u.formationOffset = { dx: u.x - cx, dy: u.y - cy };
    }

    const targetCx = tgx * TILE_SIZE + TILE_SIZE / 2;
    const targetCy = tgy * TILE_SIZE + TILE_SIZE / 2;

    const sortedTargets: Array<{ unit: Unit; tx: number; ty: number; dist: number }> = [];
    const reserved = new Set<string>();

    for (const u of units) {
      const offset = u.formationOffset!;
      let tpx = targetCx + offset.dx;
      let tpy = targetCy + offset.dy;
      tpx = Math.max(TILE_SIZE / 2, Math.min(tpx, (MAP_WIDTH - 0.5) * TILE_SIZE));
      tpy = Math.max(TILE_SIZE / 2, Math.min(tpy, (MAP_HEIGHT - 0.5) * TILE_SIZE));

      const gridTarget = this.snapToWalkableExclusive(tpx, tpy, reserved);
      if (!gridTarget) continue;
      reserved.add(`${gridTarget.x},${gridTarget.y}`);

      const finalPx = gridTarget.x * TILE_SIZE + TILE_SIZE / 2;
      const finalPy = gridTarget.y * TILE_SIZE + TILE_SIZE / 2;
      const dist = Math.hypot(finalPx - u.x, finalPy - u.y);
      sortedTargets.push({ unit: u, tx: gridTarget.x, ty: gridTarget.y, dist });
    }

    sortedTargets.sort((a, b) => a.dist - b.dist);

    for (const target of sortedTargets) {
      const u = target.unit;
      const startGridX = Math.floor(u.x / TILE_SIZE);
      const startGridY = Math.floor(u.y / TILE_SIZE);
      const gridPath = pathfinder.findPath(this.tiles, startGridX, startGridY, target.tx, target.ty, false);
      const pixelPath = this.gridToPixelPath(gridPath);
      this.trimFirstPoint(pixelPath, u.x, u.y);
      const stored = this.units.get(u.id);
      if (stored) {
        stored.path = pixelPath;
        stored.pathIndex = 0;
        stored.state = pixelPath.length > 0 ? 'moving' : 'idle';
        this.emitUpdate(stored);
      }
    }
  }

  private trimFirstPoint(path: Array<{ x: number; y: number }>, ux: number, uy: number): void {
    if (path.length > 0) {
      const first = path[0];
      if (Math.abs(first.x - ux) < 1.5 && Math.abs(first.y - uy) < 1.5) {
        path.shift();
      }
    }
  }

  private gridToPixelPath(gridPath: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    return gridPath.map((gp) => ({
      x: gp.x * TILE_SIZE + TILE_SIZE / 2,
      y: gp.y * TILE_SIZE + TILE_SIZE / 2
    }));
  }

  private snapToWalkableExclusive(
    px: number,
    py: number,
    reserved: Set<string>
  ): { x: number; y: number } | null {
    let gx = Math.floor(px / TILE_SIZE);
    let gy = Math.floor(py / TILE_SIZE);
    gx = Math.max(0, Math.min(gx, MAP_WIDTH - 1));
    gy = Math.max(0, Math.min(gy, MAP_HEIGHT - 1));
    const tile = this.tiles[gy]?.[gx];
    const key = `${gx},${gy}`;
    if (tile && tile.walkable && !tile.obstacle && !reserved.has(key)) return { x: gx, y: gy };
    for (let r = 1; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_WIDTH || ny >= MAP_HEIGHT) continue;
          const t = this.tiles[ny]?.[nx];
          const k = `${nx},${ny}`;
          if (t && t.walkable && !t.obstacle && !reserved.has(k)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  update(deltaTime: number): void {
    const now = performance.now();
    const allUnits = Array.from(this.units.values());

    for (const u of allUnits) {
      if (u.state !== 'moving') continue;

      const rerouteAt = this.pendingReroute.get(u.id);
      if (rerouteAt !== undefined && now - rerouteAt >= 250) {
        this.pendingReroute.delete(u.id);
        if (this.pathBlocked(u)) {
          this.reroute(u);
          continue;
        }
      }

      if (u.path.length === 0 || u.pathIndex >= u.path.length) {
        u.state = 'idle';
        u.path = [];
        u.pathIndex = 0;
        this.emitUpdate(u);
        continue;
      }

      const distPerSec = u.speed * TILE_SIZE;
      let dist = distPerSec * deltaTime;
      dist = Math.min(dist, 2);

      let remaining = dist;
      while (remaining > 0.001 && u.pathIndex < u.path.length) {
        const curTarget = u.path[u.pathIndex];
        const dx = curTarget.x - u.x;
        const dy = curTarget.y - u.y;
        const d = Math.hypot(dx, dy);
        if (d <= remaining) {
          u.x = curTarget.x;
          u.y = curTarget.y;
          u.pathIndex++;
          remaining -= d;
        } else {
          const r = remaining / d;
          u.x += dx * r;
          u.y += dy * r;
          remaining = 0;
        }
      }
    }

    this.resolveUnitCollisions(allUnits, deltaTime);

    for (const u of allUnits) {
      if (u.state !== 'moving') continue;
      u.gridX = Math.max(0, Math.min(Math.floor(u.x / TILE_SIZE), MAP_WIDTH - 1));
      u.gridY = Math.max(0, Math.min(Math.floor(u.y / TILE_SIZE), MAP_HEIGHT - 1));
      this.emitUpdate(u);

      if (u.pathIndex >= u.path.length) {
        u.state = 'idle';
        u.path = [];
        u.pathIndex = 0;
        this.emitUpdate(u);
      }
    }
  }

  private resolveUnitCollisions(allUnits: Unit[], deltaTime: number): void {
    const moving = allUnits.filter((u) => u.state === 'moving' || true);

    for (let iter = 0; iter < SEPARATION_ITERATIONS; iter++) {
      let changed = false;

      for (let i = 0; i < moving.length; i++) {
        const a = moving[i];
        let pushX = 0;
        let pushY = 0;
        let neighborCount = 0;

        for (let j = 0; j < moving.length; j++) {
          if (i === j) continue;
          const b = moving[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);

          if (d < MIN_FORMATION_DISTANCE && d > 0.0001) {
            const overlap = MIN_FORMATION_DISTANCE - d;
            const nx = dx / d;
            const ny = dy / d;
            const force = overlap * SEPARATION_FORCE;
            pushX += nx * force;
            pushY += ny * force;
            neighborCount++;
          }
        }

        if (neighborCount > 0) {
          const pushMag = Math.hypot(pushX, pushY);
          if (pushMag > MAX_PUSH_PER_FRAME) {
            const scale = MAX_PUSH_PER_FRAME / pushMag;
            pushX *= scale;
            pushY *= scale;
          }

          const newX = a.x + pushX;
          const newY = a.y + pushY;
          const gx = Math.floor(newX / TILE_SIZE);
          const gy = Math.floor(newY / TILE_SIZE);
          const clampedGx = Math.max(0, Math.min(gx, MAP_WIDTH - 1));
          const clampedGy = Math.max(0, Math.min(gy, MAP_HEIGHT - 1));
          const tile = this.tiles[clampedGy]?.[clampedGx];
          if (tile && tile.walkable && !tile.obstacle) {
            a.x = newX;
            a.y = newY;
            changed = true;
          }
        }
      }

      if (!changed) break;
    }

    for (let i = 0; i < moving.length; i++) {
      const a = moving[i];
      if (a.state !== 'moving') continue;
      let alignX = 0;
      let alignY = 0;
      let count = 0;

      for (let j = 0; j < moving.length; j++) {
        if (i === j) continue;
        const b = moving[j];
        if (b.state !== 'moving') continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d < MIN_FORMATION_DISTANCE * 2.5 && d > 0.0001) {
          alignX += dx;
          alignY += dy;
          count++;
        }
      }

      if (count > 1 && a.pathIndex < a.path.length) {
        alignX /= count;
        alignY /= count;
        const mag = Math.hypot(alignX, alignY);
        if (mag > 0.01) {
          const curTarget = a.path[a.pathIndex];
          const pathDx = curTarget.x - a.x;
          const pathDy = curTarget.y - a.y;
          const pathMag = Math.hypot(pathDx, pathDy);
          if (pathMag > 0.01) {
            const dot = (pathDx * alignX + pathDy * alignY) / (pathMag * mag);
            if (dot > 0) {
              a.x += (alignX / mag) * ALIGNMENT_FORCE;
              a.y += (alignY / mag) * ALIGNMENT_FORCE;
            }
          }
        }
      }
    }
  }

  private pathBlocked(u: Unit): boolean {
    for (let i = u.pathIndex; i < u.path.length; i++) {
      const p = u.path[i];
      const gx = Math.floor(p.x / TILE_SIZE);
      const gy = Math.floor(p.y / TILE_SIZE);
      const tile = this.tiles[gy]?.[gx];
      if (!tile || !tile.walkable || tile.obstacle) return true;
    }
    return false;
  }

  private reroute(u: Unit): void {
    const startGridX = Math.max(0, Math.min(Math.floor(u.x / TILE_SIZE), MAP_WIDTH - 1));
    const startGridY = Math.max(0, Math.min(Math.floor(u.y / TILE_SIZE), MAP_HEIGHT - 1));
    const lastPoint = u.path[u.path.length - 1];
    if (!lastPoint) return;
    const endGx = Math.floor(lastPoint.x / TILE_SIZE);
    const endGy = Math.floor(lastPoint.y / TILE_SIZE);
    const gridPath = pathfinder.findPath(this.tiles, startGridX, startGridY, endGx, endGy, true);
    const pixelPath = this.gridToPixelPath(gridPath);
    this.trimFirstPoint(pixelPath, u.x, u.y);
    u.path = pixelPath;
    u.pathIndex = 0;
    u.state = pixelPath.length > 0 ? 'moving' : 'idle';
    this.emitUpdate(u);
  }

  private emitUpdate(u: Unit): void {
    const data: PositionUpdateData = {
      unitId: u.id,
      x: u.x,
      y: u.y,
      gridX: u.gridX,
      gridY: u.gridY,
      state: u.state,
      path: [...u.path],
      pathIndex: u.pathIndex
    };
    eventBus.emit('unit:position-update', data);
  }
}

export const unitBehavior = new UnitBehaviorManager();
