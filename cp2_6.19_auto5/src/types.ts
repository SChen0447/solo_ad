export interface Point {
  x: number;
  y: number;
}

export type ElementType = 'start' | 'end' | 'monster' | 'erase';

export type ToolType = ElementType | null;

export interface MapElements {
  starts: Point[];
  ends: Point[];
  monsters: Point[];
}

export interface MapData {
  width: number;
  height: number;
  grid: CellType[][];
  elements: MapElements;
}

export type CellType = 0 | 1;
export type MazeGrid = CellType[][];

export enum AppEvent {
  MAZE_GENERATED = 'maze:generated',
  ELEMENT_PLACED = 'element:placed',
  ELEMENT_REMOVED = 'element:removed',
  TOOL_CHANGED = 'tool:changed',
  EXPORT_REQUESTED = 'export:requested',
  RENDER_UPDATE = 'render:update',
  THUMBNAIL_HOVER = 'thumbnail:hover',
  SHOW_MESSAGE = 'show:message'
}

export interface EventPayload {
  [AppEvent.MAZE_GENERATED]: {
    grid: MazeGrid;
    width: number;
    height: number;
    entrance: Point;
    exit: Point;
  };
  [AppEvent.ELEMENT_PLACED]: { type: ElementType; point: Point };
  [AppEvent.ELEMENT_REMOVED]: { type: ElementType; point: Point };
  [AppEvent.TOOL_CHANGED]: { tool: ToolType };
  [AppEvent.EXPORT_REQUESTED]: void;
  [AppEvent.RENDER_UPDATE]: void;
  [AppEvent.THUMBNAIL_HOVER]: {
    rect: { x: number; y: number; w: number; h: number } | null;
  };
  [AppEvent.SHOW_MESSAGE]: { text: string; type: 'info' | 'warning' | 'error' };
}

export class EventBus {
  private listeners: Map<AppEvent, Set<(payload: any) => void>> = new Map();

  on<T extends AppEvent>(event: T, callback: (payload: EventPayload[T]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<T extends AppEvent>(event: T, callback: (payload: EventPayload[T]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<T extends AppEvent>(event: T, ...payload: EventPayload[T] extends void ? [] : [EventPayload[T]]): void {
    const data = payload.length > 0 ? payload[0] : undefined;
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }
}

export const MAX_ELEMENTS = 5;
