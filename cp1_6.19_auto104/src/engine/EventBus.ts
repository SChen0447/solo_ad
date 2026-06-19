import type { EventBusEvents, EventCallback } from '../types';

type EventName = keyof EventBusEvents;

class EventBus {
  private listeners: Map<EventName, Set<EventCallback>> = new Map();

  on<K extends EventName>(eventName: K, callback: (data: EventBusEvents[K]) => void): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(callback as EventCallback);
    
    return () => {
      this.off(eventName, callback);
    };
  }

  off<K extends EventName>(eventName: K, callback: (data: EventBusEvents[K]) => void): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(callback as EventCallback);
    }
  }

  emit<K extends EventName>(eventName: K, data: EventBusEvents[K]): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
