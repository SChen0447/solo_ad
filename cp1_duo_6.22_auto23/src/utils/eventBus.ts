import { EventType, EventPayload } from '../types';

type EventCallback<T extends EventType> = (payload: EventPayload[T]) => void;

class EventBus {
  private listeners: Map<EventType, Set<EventCallback<EventType>>> = new Map();

  on<T extends EventType>(event: T, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<EventType>);
  }

  off<T extends EventType>(event: T, callback: EventCallback<T>): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback as EventCallback<EventType>);
    }
  }

  emit<T extends EventType>(event: T, payload: EventPayload[T]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(payload));
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
