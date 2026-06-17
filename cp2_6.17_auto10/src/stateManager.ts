export type MonthKey = 'january' | 'july';

export interface SelectedRegion {
  lat: number;
  lon: number;
  radiusKm: number;
}

export interface AppState {
  currentMonth: MonthKey;
  animationSpeed: number;
  zoomLevel: number;
  selectedRegion: SelectedRegion | null;
  colorMapMode: 'speed' | 'direction';
  particleOpacity: number;
  isTransitioning: boolean;
}

export type StateListener = (state: AppState, prevState: AppState) => void;

export type StateKey = keyof AppState;

const initialState: AppState = {
  currentMonth: 'january',
  animationSpeed: 1.0,
  zoomLevel: 1.0,
  selectedRegion: null,
  colorMapMode: 'speed',
  particleOpacity: 1.0,
  isTransitioning: false,
};

class StateManager {
  private state: AppState;
  private listeners: Map<StateKey | '*', Set<StateListener>> = new Map();

  constructor(initial: AppState = initialState) {
    this.state = { ...initial };
  }

  getState(): Readonly<AppState> {
    return { ...this.state };
  }

  get<K extends StateKey>(key: K): AppState[K] {
    return this.state[key];
  }

  set<K extends StateKey>(key: K, value: AppState[K]): void {
    if (this.state[key] === value) return;
    const prevState = { ...this.state };
    this.state[key] = value;
    this.notify(key, prevState);
  }

  setPartial(partial: Partial<AppState>): void {
    const prevState = { ...this.state };
    let changed = false;
    for (const key of Object.keys(partial) as StateKey[]) {
      const value = partial[key]!;
      if (this.state[key] !== value) {
        (this.state as Record<StateKey, unknown>)[key] = value;
        changed = true;
      }
    }
    if (!changed) return;
    for (const key of Object.keys(partial) as StateKey[]) {
      if (prevState[key] !== this.state[key]) {
        this.notify(key, prevState);
      }
    }
  }

  subscribe<K extends StateKey>(key: K | '*', listener: StateListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);
    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  private notify(changedKey: StateKey, prevState: AppState): void {
    const current = this.state;
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      for (const listener of wildcard) {
        try {
          listener(current, prevState);
        } catch (e) {
          console.error('State listener error (wildcard):', e);
        }
      }
    }
    const specific = this.listeners.get(changedKey);
    if (specific) {
      for (const listener of specific) {
        try {
          listener(current, prevState);
        } catch (e) {
          console.error(`State listener error (${String(changedKey)}):`, e);
        }
      }
    }
  }

  reset(): void {
    const prevState = { ...this.state };
    this.state = { ...initialState };
    for (const key of Object.keys(prevState) as StateKey[]) {
      if (prevState[key] !== this.state[key]) {
        this.notify(key, prevState);
      }
    }
  }
}

export const stateManager = new StateManager();

export default stateManager;
