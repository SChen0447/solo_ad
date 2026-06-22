type Listener = (...args: unknown[]) => void;

class EventBus {
  private listeners: Map<string, Set<Listener>> = new Map();

  on(event: string, fn: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
    return () => this.off(event, fn);
  }

  off(event: string, fn: Listener): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(fn);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((fn) => {
        try {
          fn(...args);
        } catch (e) {
          console.error(`EventBus error on "${event}":`, e);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();

export enum EditorEvent {
  ADD_ENTITY = 'ADD_ENTITY',
  MOVE_ENTITY = 'MOVE_ENTITY',
  DELETE_ENTITY = 'DELETE_ENTITY',
  SELECT_ENTITY = 'SELECT_ENTITY',
  SET_TERRAIN = 'SET_TERRAIN',
  ADD_PATH_POINT = 'ADD_PATH_POINT',
  MOVE_PATH_POINT = 'MOVE_PATH_POINT',
  DELETE_PATH_POINT = 'DELETE_PATH_POINT',
  CLEAR_ALL_PATHS = 'CLEAR_ALL_PATHS',
  BIND_PATH_TO_ENTITY = 'BIND_PATH_TO_ENTITY',
  BIND_EVENT = 'BIND_EVENT',
  MAP_UPDATED = 'MAP_UPDATED',
  EXPORT_MAP = 'EXPORT_MAP',
  ADD_CUSTOM_UNIT_TYPE = 'ADD_CUSTOM_UNIT_TYPE',
}
