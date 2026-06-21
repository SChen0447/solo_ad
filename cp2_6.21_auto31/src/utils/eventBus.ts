type EventHandler<T = unknown> = (payload: T) => void;

interface EventMap {
  'planet:select': { name: string };
  'planet:deselect': { name: string };
  'planets:compare': { names: [string, string] };
  'planets:compareExit': void;
  'speed:orbit': { speed: number };
  'speed:rotation': { speed: number };
  'texture:change': { style: 'realistic' | 'cartoon' | 'wireframe' };
  'camera:focus': { name: string };
  'camera:reset': void;
  'mode:reset': void;
  'planet:hover': { name: string };
  'planet:unhover': void;
  'planet:click': { name: string };
  'planet:highlighted': { name: string; highlighted: boolean };
  'planets:compared': CompareData;
  'texture:transition:complete': void;
  'speed:orbit:updated': { currentSpeed: number };
  'speed:rotation:updated': { currentSpeed: number };
}

export interface CompareData {
  planetA: PlanetInfo;
  planetB: PlanetInfo;
  radiusRatio: number;
  orbitPeriodRatio: number;
  axialTiltDiff: number;
}

export interface PlanetInfo {
  name: string;
  englishName: string;
  diameter: number;
  orbitRadius: number;
  orbitPeriod: number;
  axialTilt: number;
  rotationSpeed: number;
  orbitSpeed: number;
  color: string;
  hasRing: boolean;
}

type EventKey = keyof EventMap;

const listeners = new Map<EventKey, Set<EventHandler<any>>>();

export function on<K extends EventKey>(event: K, handler: EventHandler<EventMap[K]>): void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(handler);
}

export function off<K extends EventKey>(event: K, handler: EventHandler<EventMap[K]>): void {
  const set = listeners.get(event);
  if (set) {
    set.delete(handler);
  }
}

export function emit<K extends EventKey>(event: K, payload?: EventMap[K]): void {
  const set = listeners.get(event);
  if (set) {
    set.forEach((handler) => {
      try {
        handler(payload);
      } catch (e) {
        console.error(`Event handler error for "${event}":`, e);
      }
    });
  }
}

export function clear(): void {
  listeners.clear();
}
