import { eventBus } from '../../eventBus';
import { pathfinder } from './Pathfinder';
import {
  Unit,
  MapTile,
  TILE_SIZE,
  MIN_FORMATION_DISTANCE
} from '../gameMap/types';

export interface UnitCommandData {
  unitIds: string[];
  type: 'move' | 'attack';
  targetGridX: number;
  targetGridY: number;
}

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

    eventBus.on('state:update', (data: unknown) => {
      const d = data as { units: Unit[]; tiles: MapTile[][] };
      for (const u of d.units) {
        this.units.set(u.id, u);
      }
      this.tiles = d.tiles;
    });

    eventBus.on('obstacle:added', () => {
      for (const [id, u] of this.units) {
        if (u.state === 'moving' && u.path.length > 0) {
          this.pendingReroute.set(id, performance.now());
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
    const gridPath = pathfinder.findPath(this.tiles, startGridX, startGridY, tgx, tgy);
    const pixelPath = gridPath.map((gp) => ({
      x: gp.x * TILE_SIZE + TILE_SIZE / 2,
      y: gp.y * TILE_SIZE + TILE_SIZE / 2
    }));
    if (pixelPath.length > 0 && pixelPath[0].x === unit.x && pixelPath[0].y === unit.y) {
      pixelPath.shift();
    }
    const u = this.units.get(unit.id);
    if (u) {
      u.path = pixelPath;
      u.pathIndex = 0;
      u.state = pixelPath.length > 0 ? 'moving' : 'idle';
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

    for (const u of units) {
      const offset = u.formationOffset!;
      let tpx = targetCx + offset.dx;
      let tpy = targetCy + offset.dy;
      tpx = Math.max(TILE_SIZE / 2, Math.min(tpx, (this.tiles[0].length - 0.5) * TILE_SIZE));
      tpy = Math.max(TILE_SIZE / 2, Math.min(tpy, (this.tiles.length - 0.5) * TILE_SIZE));
      const gridTarget = this.snapToWalkable(tpx, tpy);
      if (!gridTarget) continue;
      const startGridX = Math.floor(u.x / TILE_SIZE);
      const startGridY = Math.floor(u.y / TILE_SIZE);
      const gridPath = pathfinder.findPath(this.tiles, startGridX, startGridY, gridTarget.x, gridTarget.y);
      const pixelPath = gridPath.map((gp) => ({
        x: gp.x * TILE_SIZE + TILE_SIZE / 2,
        y: gp.y * TILE_SIZE + TILE_SIZE / 2
      }));
      if (pixelPath.length > 0 && pixelPath[0].x === u.x && pixelPath[0].y === u.y) {
        pixelPath.shift();
      }
      const unit = this.units.get(u.id);
      if (unit) {
        unit.path = pixelPath;
        unit.pathIndex = 0;
        unit.state = pixelPath.length > 0 ? 'moving' : 'idle';
        this.emitUpdate(unit);
      }
    }
  }

  private snapToWalkable(px: number, py: number): { x: number; y: number } | null {
    let gx = Math.floor(px / TILE_SIZE);
    let gy = Math.floor(py / TILE_SIZE);
    gx = Math.max(0, Math.min(gx, MAP_WIDTH() - 1));
    gy = Math.max(0, Math.min(gy, MAP_HEIGHT() - 1));
    const tile = this.tiles[gy]?.[gx];
    if (tile && tile.walkable && !tile.obstacle) return { x: gx, y: gy };
    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_WIDTH() || ny >= MAP_HEIGHT()) continue;
          const t = this.tiles[ny]?.[nx];
          if (t && t.walkable && !t.obstacle) return { x: nx, y: ny };
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

      const target = u.path[u.pathIndex];
      const distPerSec = u.speed * TILE_SIZE;
      let dist = distPerSec * deltaTime;
      dist = Math.min(dist, 2);

      let remaining = dist;
      while (remaining > 0 && u.pathIndex < u.path.length) {
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

      this.separateUnits(u, allUnits);

      u.gridX = Math.floor(u.x / TILE_SIZE);
      u.gridY = Math.floor(u.y / TILE_SIZE);
      this.emitUpdate(u);

      if (u.pathIndex >= u.path.length) {
        u.state = 'idle';
        u.path = [];
        u.pathIndex = 0;
        this.emitUpdate(u);
      }
    }
  }

  private separateUnits(u: Unit, all: Unit[]): void {
    for (const other of all) {
      if (other.id === u.id) continue;
      if (other.state !== 'moving') continue;
      const dx = u.x - other.x;
      const dy = u.y - other.y;
      const d = Math.hypot(dx, dy);
      if (d < MIN_FORMATION_DISTANCE && d > 0.001) {
        const push = (MIN_FORMATION_DISTANCE - d) / 2;
        const nx = (dx / d) * push;
        const ny = (dy / d) * push;
        u.x += nx;
        u.y += ny;
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
    const startGridX = Math.max(0, Math.min(Math.floor(u.x / TILE_SIZE), MAP_WIDTH() - 1));
    const startGridY = Math.max(0, Math.min(Math.floor(u.y / TILE_SIZE), MAP_HEIGHT() - 1));
    const lastPoint = u.path[u.path.length - 1];
    if (!lastPoint) return;
    const endGx = Math.floor(lastPoint.x / TILE_SIZE);
    const endGy = Math.floor(lastPoint.y / TILE_SIZE);
    const gridPath = pathfinder.findPath(this.tiles, startGridX, startGridY, endGx, endGy);
    const pixelPath = gridPath.map((gp) => ({
      x: gp.x * TILE_SIZE + TILE_SIZE / 2,
      y: gp.y * TILE_SIZE + TILE_SIZE / 2
    }));
    if (pixelPath.length > 0 && pixelPath[0].x === u.x && pixelPath[0].y === u.y) {
      pixelPath.shift();
    }
    u.path = pixelPath;
    u.pathIndex = 0;
    u.state = pixelPath.length > 0 ? 'moving' : 'idle';
    this.emitUpdate(u);
  }

  private emitUpdate(u: Unit): void {
    eventBus.emit('unit:position-update', {
      unitId: u.id,
      x: u.x,
      y: u.y,
      gridX: u.gridX,
      gridY: u.gridY,
      state: u.state,
      path: u.path,
      pathIndex: u.pathIndex
    });
  }
}

function MAP_WIDTH(): number {
  return 20;
}
function MAP_HEIGHT(): number {
  return 20;
}

export const unitBehavior = new UnitBehaviorManager();
