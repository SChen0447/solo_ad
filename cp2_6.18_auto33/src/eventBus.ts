type EventCallback = (data: unknown) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const cb = callback as EventCallback;
    this.listeners.get(event)!.add(cb);
    return () => this.off(event, cb);
  }

  off<T = unknown>(event: string, callback: (data: T) => void): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback as EventCallback);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit<T = unknown>(event: string, data: T): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
export default eventBus;
