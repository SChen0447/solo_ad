type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: Map<string, EventCallback[]>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (!callbacks) return;

    for (const callback of callbacks) {
      callback(...args);
    }
  }

  clear(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

export const eventBus = new EventBus();

export type ParticleParams = {
  density: number;
  gravity: number;
  damping: number;
  theme: ColorTheme;
  autoRotate: boolean;
};

export type ColorTheme = 'aurora' | 'lava' | 'starry' | 'neon';

export const EVENTS = {
  PARAMS_CHANGED: 'params:changed',
  DENSITY_CHANGED: 'params:density',
  GRAVITY_CHANGED: 'params:gravity',
  DAMPING_CHANGED: 'params:damping',
  THEME_CHANGED: 'params:theme',
  AUTO_ROTATE_CHANGED: 'params:autoRotate',
  PARTICLES_READY: 'particles:ready',
  RENDER_READY: 'render:ready'
} as const;

export const THEME_COLORS: Record<ColorTheme, string[]> = {
  aurora: ['#6366F1', '#EC4899', '#06B6D4', '#F59E0B'],
  lava: ['#EF4444', '#F97316', '#F59E0B', '#FBBF24'],
  starry: ['#6366F1', '#8B5CF6', '#A855F7', '#3B82F6'],
  neon: ['#10B981', '#06B6D4', '#EC4899', '#8B5CF6']
};

export const THEME_TRACK_COLORS: Record<ColorTheme, string> = {
  aurora: '#06B6D4',
  lava: '#F97316',
  starry: '#8B5CF6',
  neon: '#10B981'
};
