export type EventType =
  | 'tree:added'
  | 'tree:removed'
  | 'tree:selected'
  | 'year:changed'
  | 'growth:updated'
  | 'occlusion:updated'
  | 'scene:reset'
  | 'ground:clicked';

type EventCallback = (payload: unknown) => void;

class EventBusClass {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  on<T = unknown>(event: EventType, callback: (payload: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    return () => this.off(event, callback as EventCallback);
  }

  off(event: EventType, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<T = unknown>(event: EventType, payload?: T): void {
    this.listeners.get(event)?.forEach((cb) => cb(payload as unknown));
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const EventBus = new EventBusClass();
