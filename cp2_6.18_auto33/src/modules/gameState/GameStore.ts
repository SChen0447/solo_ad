import { eventBus } from '../../eventBus';
import {
  GameState,
  MapTile,
  Unit,
  Obstacle,
  Region,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM
} from '../gameMap/types';

type StateListener = (state: GameState) => void;

export class GameStore {
  private state: GameState;
  private listeners: Set<StateListener> = new Set();

  constructor() {
    this.state = {
      tiles: [],
      units: [],
      obstacles: [],
      selectedUnitIds: [],
      zoom: 1.0,
      fps: 0
    };
    this.bindEvents();
  }

  private bindEvents(): void {
    eventBus.on('map:generated', (data: unknown) => {
      const d = data as { tiles: MapTile[][]; regions: Region[] };
      this.state.tiles = d.tiles;
      this.state.units = this.generateInitialUnits(d.tiles);
      this.state.obstacles = [];
      this.state.selectedUnitIds = [];
      this.notify();
    });

    eventBus.on('unit:position-update', (data: unknown) => {
      const d = data as {
        unitId: string;
        x: number;
        y: number;
        gridX: number;
        gridY: number;
        state: string;
        path: Array<{ x: number; y: number }>;
        pathIndex: number;
      };
      const unit = this.state.units.find((u) => u.id === d.unitId);
      if (unit) {
        unit.x = d.x;
        unit.y = d.y;
        unit.gridX = d.gridX;
        unit.gridY = d.gridY;
        unit.state = d.state as Unit['state'];
        unit.path = d.path;
        unit.pathIndex = d.pathIndex;
      }
      this.notify();
    });

    eventBus.on('selection:single', (data: unknown) => {
      const d = data as { unitId: string };
      this.state.selectedUnitIds = [d.unitId];
      for (const u of this.state.units) {
        u.selected = u.id === d.unitId;
      }
      this.notify();
    });

    eventBus.on('selection:multiple', (data: unknown) => {
      const d = data as { unitIds: string[] };
      this.state.selectedUnitIds = d.unitIds;
      for (const u of this.state.units) {
        u.selected = d.unitIds.includes(u.id);
      }
      this.notify();
    });

    eventBus.on('selection:clear', () => {
      this.state.selectedUnitIds = [];
      for (const u of this.state.units) {
        u.selected = false;
      }
      this.notify();
    });

    eventBus.on('selection:box', (data: unknown) => {
      const d = data as { x1: number; y1: number; x2: number; y2: number };
      const minX = Math.min(d.x1, d.x2);
      const maxX = Math.max(d.x1, d.x2);
      const minY = Math.min(d.y1, d.y2);
      const maxY = Math.max(d.y1, d.y2);
      const ids: string[] = [];
      for (const u of this.state.units) {
        if (u.x >= minX && u.x <= maxX && u.y >= minY && u.y <= maxY) {
          ids.push(u.id);
          u.selected = true;
        } else {
          u.selected = false;
        }
      }
      this.state.selectedUnitIds = ids;
      this.notify();
    });

    eventBus.on('obstacle:add', (data: unknown) => {
      const d = data as { gridX: number; gridY: number };
      const tile = this.state.tiles[d.gridY]?.[d.gridX];
      if (!tile || !tile.walkable || tile.obstacle) return;
      tile.obstacle = true;
      const ob: Obstacle = {
        id: `ob-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        gridX: d.gridX,
        gridY: d.gridY,
        createdAt: performance.now()
      };
      this.state.obstacles.push(ob);
      eventBus.emit('obstacle:added', { obstacle: ob });
      this.notify();
    });

    eventBus.on('zoom:change', (data: unknown) => {
      const d = data as { zoom: number };
      this.state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, d.zoom));
      this.notify();
    });

    eventBus.on('fps:update', (data: unknown) => {
      const d = data as { fps: number };
      this.state.fps = d.fps;
    });
  }

  private generateInitialUnits(tiles: MapTile[][]): Unit[] {
    const units: Unit[] = [];
    const walkableTiles: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        if (tiles[y][x].walkable) {
          walkableTiles.push({ x, y });
        }
      }
    }

    const count = Math.min(8, walkableTiles.length);
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      let idx: number;
      let key: string;
      let attempts = 0;
      do {
        idx = Math.floor(Math.random() * walkableTiles.length);
        key = `${walkableTiles[idx].x},${walkableTiles[idx].y}`;
        attempts++;
      } while (used.has(key) && attempts < 100);
      used.add(key);
      const t = walkableTiles[idx];
      units.push({
        id: `unit-${i + 1}`,
        name: `星际战士 ${i + 1}`,
        x: t.x * TILE_SIZE + TILE_SIZE / 2,
        y: t.y * TILE_SIZE + TILE_SIZE / 2,
        gridX: t.x,
        gridY: t.y,
        hp: 80 + Math.floor(Math.random() * 40),
        maxHp: 100,
        speed: 2,
        state: 'idle',
        path: [],
        pathIndex: 0,
        selected: false
      });
    }
    return units;
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot: GameState = {
      tiles: this.state.tiles,
      units: this.state.units.map((u) => ({ ...u, path: [...u.path] })),
      obstacles: [...this.state.obstacles],
      selectedUnitIds: [...this.state.selectedUnitIds],
      zoom: this.state.zoom,
      fps: this.state.fps
    };
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('[GameStore] Listener error:', err);
      }
    }
    eventBus.emit('state:update', { state: snapshot });
  }
}

export const gameStore = new GameStore();
