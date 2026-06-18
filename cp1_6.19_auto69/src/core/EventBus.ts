type EventCallback = (...args: unknown[]) => void;

class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback?: EventCallback): void {
    if (!this.events.has(event)) return;

    if (!callback) {
      this.events.delete(event);
      return;
    }

    const callbacks = this.events.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    if (!this.events.has(event)) return;

    const callbacks = this.events.get(event)!;
    callbacks.forEach((cb) => {
      try {
        cb(...args);
      } catch (e) {
        console.error(`[EventBus] Error in event "${event}":`, e);
      }
    });
  }
}

export const eventBus = new EventBus();

export type NodeData = {
  id: string;
  position: { x: number; y: number; z: number };
  color: string;
};

export type ConnectionData = {
  id: string;
  nodeAId: string;
  nodeBId: string;
  distance: number;
};

export type ConstellationData = {
  nodes: NodeData[];
  connections: ConnectionData[];
};
