import type { Capsule } from './dataStore'

type EventCallback = (capsule: Capsule) => void
type EventName = 'capsule-due'

class EventBus {
  private listeners: Map<EventName, Set<EventCallback>> = new Map()

  on(event: EventName, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  emit(event: EventName, capsule: Capsule): void {
    this.listeners.get(event)?.forEach((cb) => cb(capsule))
  }
}

export const eventBus = new EventBus()
