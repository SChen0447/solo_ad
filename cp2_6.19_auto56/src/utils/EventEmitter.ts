export type EventListener<T = unknown> = (data: T) => void

export class EventEmitter<EventMap extends Record<string, unknown>> {
  private listeners: Map<keyof EventMap, Set<EventListener<EventMap[keyof EventMap]>>> = new Map()

  on<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const set = this.listeners.get(event)!
    set.add(listener as EventListener<EventMap[keyof EventMap]>)
    return () => this.off(event, listener)
  }

  off<K extends keyof EventMap>(event: K, listener: EventListener<EventMap[K]>): void {
    const set = this.listeners.get(event)
    if (set) {
      set.delete(listener as EventListener<EventMap[keyof EventMap]>)
    }
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const set = this.listeners.get(event)
    if (set) {
      set.forEach((listener) => {
        try {
          listener(data)
        } catch (e) {
          console.error(`Error in event listener for ${String(event)}:`, e)
        }
      })
    }
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }
}
