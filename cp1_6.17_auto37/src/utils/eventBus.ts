const listeners = new Map<string, Set<Function>>();

export function on(event: string, callback: Function): void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);
}

export function off(event: string, callback: Function): void {
  listeners.get(event)?.delete(callback);
}

export function emit(event: string, ...args: any[]): void {
  listeners.get(event)?.forEach((callback) => callback(...args));
}
