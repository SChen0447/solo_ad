export interface MetricData {
  cpu: number;
  memory: number;
  network: number;
}

export interface HistoryPoint {
  data: MetricData;
  timestamp: number;
}

export interface Thresholds {
  cpu: number;
  memory: number;
  network: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  cpu: 80,
  memory: 70,
  network: 60,
};

export const METRIC_KEYS: (keyof MetricData)[] = ['cpu', 'memory', 'network'];

export const METRIC_COLORS: Record<keyof MetricData, string> = {
  cpu: '#00ffff',
  memory: '#00ff88',
  network: '#aa66ff',
};

export const METRIC_LABELS: Record<keyof MetricData, string> = {
  cpu: 'CPU',
  memory: 'MEM',
  network: 'NET',
};

export const HISTORY_SIZE = 20;
export const FLASH_PERIOD = 0.3;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function generateValue(prev: number): number {
  const delta = (Math.random() - 0.48) * 15;
  return clamp(prev + delta, 0, 100);
}

export class DataStream {
  private _data: MetricData = { cpu: 45, memory: 35, network: 25 };
  private _thresholds: Thresholds = { ...DEFAULT_THRESHOLDS };
  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _listeners: Array<(data: MetricData, thresholds: Thresholds) => void> = [];
  private _history: HistoryPoint[] = [];

  get data(): MetricData {
    return { ...this._data };
  }

  get thresholds(): Thresholds {
    return { ...this._thresholds };
  }

  get history(): HistoryPoint[] {
    return [...this._history];
  }

  onUpdate(listener: (data: MetricData, thresholds: Thresholds) => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  setThreshold(key: keyof Thresholds, value: number): void {
    this._thresholds[key] = clamp(value, 0, 100);
    this._notify();
  }

  reset(): void {
    this._thresholds = { ...DEFAULT_THRESHOLDS };
    this._data = { cpu: 45, memory: 35, network: 25 };
    this._history = [];
    this._notify();
  }

  start(): void {
    if (this._intervalId !== null) return;
    this._pushHistory();
    this._notify();
    this._intervalId = setInterval(() => {
      this._data.cpu = generateValue(this._data.cpu);
      this._data.memory = generateValue(this._data.memory);
      this._data.network = generateValue(this._data.network);
      this._pushHistory();
      this._notify();
    }, 500);
  }

  private _pushHistory(): void {
    this._history.push({ data: { ...this._data }, timestamp: Date.now() });
    if (this._history.length > HISTORY_SIZE) {
      this._history.shift();
    }
  }

  stop(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  private _notify(): void {
    const data = this.data;
    const thresholds = this.thresholds;
    this._listeners.forEach(l => l(data, thresholds));
  }
}
