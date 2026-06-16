export type MonthKey = 'january' | 'july';

export type ColorMappingMode = 'speed' | 'direction';

export interface SelectedRegion {
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface AppState {
  currentMonth: MonthKey;
  animationSpeed: number;
  colorMappingMode: ColorMappingMode;
  selectedRegion: SelectedRegion | null;
  zoomLevel: number;
  isTransitioning: boolean;
}

type Listener = (state: AppState) => void;

class StateManager {
  private state: AppState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = {
      currentMonth: 'january',
      animationSpeed: 1,
      colorMappingMode: 'speed',
      selectedRegion: null,
      zoomLevel: 1,
      isTransitioning: false,
    };
  }

  getState(): AppState {
    return { ...this.state };
  }

  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.state[key];
  }

  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    if (this.state[key] === value) return;
    this.state = { ...this.state, [key]: value };
    this.notify();
  }

  setPartial(partial: Partial<AppState>): void {
    let changed = false;
    for (const key of Object.keys(partial) as (keyof AppState)[]) {
      if (this.state[key] !== partial[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = { ...this.state };
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const stateManager = new StateManager();
