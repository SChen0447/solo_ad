export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

export interface CityData {
  time: number;
  weather: WeatherType;
  populationDensity: number;
}

type CityDataListener = (data: CityData) => void;

export class Simulator {
  private data: CityData;
  private listeners: Set<CityDataListener> = new Set();
  private intervalId: number | null = null;
  private updateInterval: number = 5000;

  constructor() {
    this.data = {
      time: 12,
      weather: 'sunny',
      populationDensity: 50
    };
  }

  getData(): CityData {
    return { ...this.data };
  }

  setTime(time: number): void {
    this.data.time = Math.max(0, Math.min(24, time));
    this.emit();
  }

  setWeather(weather: WeatherType): void {
    this.data.weather = weather;
    this.emit();
  }

  setPopulationDensity(density: number): void {
    this.data.populationDensity = Math.max(0, Math.min(100, density));
    this.emit();
  }

  setData(data: Partial<CityData>): void {
    if (data.time !== undefined) this.data.time = Math.max(0, Math.min(24, data.time));
    if (data.weather !== undefined) this.data.weather = data.weather;
    if (data.populationDensity !== undefined) {
      this.data.populationDensity = Math.max(0, Math.min(100, data.populationDensity));
    }
    this.emit();
  }

  subscribe(listener: CityDataListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  startAutoUpdate(): void {
    if (this.intervalId !== null) return;
    this.intervalId = window.setInterval(() => this.simulateStep(), this.updateInterval);
  }

  stopAutoUpdate(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private simulateStep(): void {
    this.data.time = (this.data.time + 0.5) % 24;

    const weathers: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy'];
    if (Math.random() < 0.3) {
      this.data.weather = weathers[Math.floor(Math.random() * weathers.length)];
    }

    this.data.populationDensity = Math.max(
      10,
      Math.min(90, this.data.populationDensity + (Math.random() - 0.5) * 15)
    );

    this.emit();
  }

  private emit(): void {
    const snapshot = { ...this.data };
    this.listeners.forEach(listener => listener(snapshot));
  }
}
