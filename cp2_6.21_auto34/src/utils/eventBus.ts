import type { EventCallback } from '../types';

type EventMap = Record<string, Set<EventCallback>>;

export class EventBus {
  private events: EventMap = {};

  on(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = new Set();
    }
    this.events[event].add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.events[event]?.delete(callback);
  }

  emit(event: string, data?: any): void {
    this.events[event]?.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error(`[EventBus] Error in handler for "${event}":`, e);
      }
    });
  }

  clear(): void {
    this.events = {};
  }
}

export const eventBus = new EventBus();
