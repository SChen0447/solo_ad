import { v4 as uuidv4 } from 'uuid';
import { eventBus, EditorEvent } from './eventSystem';

export type TerrainType = 'grass' | 'wall' | 'water';
export type EntityType = 'player' | 'monster' | 'chest' | 'custom';
export type Facing = 'up' | 'down' | 'left' | 'right';
export type EventType = 'dialog' | 'battle' | 'teleport';

export interface GridCell {
  x: number;
  y: number;
  terrain: TerrainType;
}

export interface PathPoint {
  x: number;
  y: number;
  order: number;
}

export interface MapEntity {
  id: string;
  type: EntityType;
  gridX: number;
  gridY: number;
  facing: Facing;
  pathId?: string;
  name?: string;
  color?: string;
}

export interface PathData {
  id: string;
  entityId: string;
  points: PathPoint[];
}

export interface EventBinding {
  entityId: string;
  name: string;
  type: EventType;
}

export interface CustomUnitType {
  id: string;
  name: string;
  color: string;
}

export interface MapData {
  grid: GridCell[][];
  entities: MapEntity[];
  paths: PathData[];
  events: EventBinding[];
  customUnitTypes: CustomUnitType[];
}

export const GRID_COLS = 20;
export const GRID_ROWS = 15;
export const CELL_SIZE = 40;
export const MAX_PATH_POINTS = 10;

const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: 'rgba(76, 175, 80, 0.35)',
  wall: 'rgba(158, 158, 158, 0.45)',
  water: 'rgba(33, 150, 243, 0.35)',
};

export { TERRAIN_COLORS };

function createEmptyGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    const row: GridCell[] = [];
    for (let x = 0; x < GRID_COLS; x++) {
      row.push({ x, y, terrain: 'grass' });
    }
    grid.push(row);
  }
  return grid;
}

class MapDataManager {
  private data: MapData;

  constructor() {
    this.data = {
      grid: createEmptyGrid(),
      entities: [],
      paths: [],
      events: [],
      customUnitTypes: [],
    };
    this.bindEvents();
  }

  private bindEvents(): void {
    eventBus.on(EditorEvent.ADD_ENTITY, (payload: unknown) => {
      const p = payload as { type: EntityType; gridX: number; gridY: number; name?: string; color?: string };
      if (!this.isCellWalkable(p.gridX, p.gridY)) return;
      if (this.getEntityAt(p.gridX, p.gridY)) return;
      const entity: MapEntity = {
        id: uuidv4(),
        type: p.type,
        gridX: p.gridX,
        gridY: p.gridY,
        facing: 'down',
        name: p.name,
        color: p.color,
      };
      this.data.entities.push(entity);
      this.notify();
    });

    eventBus.on(EditorEvent.MOVE_ENTITY, (payload: unknown) => {
      const p = payload as { id: string; toX: number; toY: number };
      const entity = this.data.entities.find((e) => e.id === p.id);
      if (!entity) return;
      if (!this.isCellWalkable(p.toX, p.toY)) return;
      if (this.getEntityAt(p.toX, p.toY)) return;
      entity.gridX = p.toX;
      entity.gridY = p.toY;
      this.notify();
    });

    eventBus.on(EditorEvent.DELETE_ENTITY, (payload: unknown) => {
      const p = payload as { id: string };
      this.data.entities = this.data.entities.filter((e) => e.id !== p.id);
      this.data.paths = this.data.paths.filter((path) => path.entityId !== p.id);
      this.data.events = this.data.events.filter((ev) => ev.entityId !== p.id);
      this.notify();
    });

    eventBus.on(EditorEvent.SELECT_ENTITY, () => {});

    eventBus.on(EditorEvent.SET_TERRAIN, (payload: unknown) => {
      const p = payload as { x: number; y: number; terrain: TerrainType };
      if (p.x < 0 || p.x >= GRID_COLS || p.y < 0 || p.y >= GRID_ROWS) return;
      this.data.grid[p.y][p.x].terrain = p.terrain;
      this.notify();
    });

    eventBus.on(EditorEvent.ADD_PATH_POINT, (payload: unknown) => {
      const p = payload as { entityId: string; x: number; y: number };
      let path = this.data.paths.find((pa) => pa.entityId === p.entityId);
      if (!path) {
        path = { id: uuidv4(), entityId: p.entityId, points: [] };
        this.data.paths.push(path);
      }
      if (path.points.length >= MAX_PATH_POINTS) return;
      path.points.push({ x: p.x, y: p.y, order: path.points.length + 1 });
      const entity = this.data.entities.find((e) => e.id === p.entityId);
      if (entity) {
        entity.pathId = path.id;
      }
      this.notify();
    });

    eventBus.on(EditorEvent.MOVE_PATH_POINT, (payload: unknown) => {
      const p = payload as { pathId: string; pointOrder: number; newX: number; newY: number };
      const path = this.data.paths.find((pa) => pa.id === p.pathId);
      if (!path) return;
      const pt = path.points.find((pp) => pp.order === p.pointOrder);
      if (pt) {
        pt.x = p.newX;
        pt.y = p.newY;
      }
      this.notify();
    });

    eventBus.on(EditorEvent.DELETE_PATH_POINT, (payload: unknown) => {
      const p = payload as { pathId: string; pointOrder: number };
      const path = this.data.paths.find((pa) => pa.id === p.pathId);
      if (!path) return;
      path.points = path.points.filter((pp) => pp.order !== p.pointOrder);
      path.points.forEach((pp, i) => {
        pp.order = i + 1;
      });
      if (path.points.length === 0) {
        const entity = this.data.entities.find((e) => e.pathId === path.id);
        if (entity) entity.pathId = undefined;
        this.data.paths = this.data.paths.filter((pa) => pa.id !== path.id);
      }
      this.notify();
    });

    eventBus.on(EditorEvent.CLEAR_ALL_PATHS, () => {
      this.data.paths = [];
      this.data.entities.forEach((e) => {
        e.pathId = undefined;
      });
      this.notify();
    });

    eventBus.on(EditorEvent.BIND_PATH_TO_ENTITY, (payload: unknown) => {
      const p = payload as { entityId: string; pathId: string };
      const entity = this.data.entities.find((e) => e.id === p.entityId);
      if (entity) {
        entity.pathId = p.pathId;
      }
      this.notify();
    });

    eventBus.on(EditorEvent.BIND_EVENT, (payload: unknown) => {
      const p = payload as { entityId: string; name: string; type: EventType };
      const existing = this.data.events.findIndex((ev) => ev.entityId === p.entityId);
      if (existing >= 0) {
        this.data.events[existing] = { entityId: p.entityId, name: p.name, type: p.type };
      } else {
        this.data.events.push({ entityId: p.entityId, name: p.name, type: p.type });
      }
      this.notify();
    });

    eventBus.on(EditorEvent.ADD_CUSTOM_UNIT_TYPE, (payload: unknown) => {
      const p = payload as { name: string; color: string };
      this.data.customUnitTypes.push({
        id: uuidv4(),
        name: p.name,
        color: p.color,
      });
      this.notify();
    });
  }

  isCellWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return false;
    const terrain = this.data.grid[y][x].terrain;
    return terrain !== 'wall' && terrain !== 'water';
  }

  getEntityAt(x: number, y: number): MapEntity | undefined {
    return this.data.entities.find((e) => e.gridX === x && e.gridY === y);
  }

  getPathForEntity(entityId: string): PathData | undefined {
    return this.data.paths.find((p) => p.entityId === entityId);
  }

  getEventForEntity(entityId: string): EventBinding | undefined {
    return this.data.events.find((e) => e.entityId === entityId);
  }

  getData(): MapData {
    return this.data;
  }

  serialize(): string {
    return JSON.stringify(this.data);
  }

  deserialize(json: string): void {
    try {
      const parsed = JSON.parse(json) as MapData;
      this.data = parsed;
      this.notify();
    } catch {
      console.error('Failed to deserialize map data');
    }
  }

  private notify(): void {
    eventBus.emit(EditorEvent.MAP_UPDATED, this.data);
  }
}

export const mapDataManager = new MapDataManager();
