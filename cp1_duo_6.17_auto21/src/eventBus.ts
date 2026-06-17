type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }
}

export const eventBus = new EventBus();

export interface SimulationParams {
  windSpeed: number;
  particleDensity: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  obstacleType: string;
  displayMode: 'particles' | 'streamlines' | 'pressure' | 'overlay';
}

export const defaultParams: SimulationParams = {
  windSpeed: 8,
  particleDensity: 5000,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  obstacleType: 'sphere',
  displayMode: 'particles'
};

export const OBSTACLE_TYPES = [
  'sphere', 'cylinder', 'airfoil', 'car', 'pyramid',
  'flatplate', 'wedge', 'hemisphere', 'concavemirror', 'custom'
] as const;

export const DISPLAY_MODES = [
  'particles', 'streamlines', 'pressure', 'overlay'
] as const;
