import { clamp, randomRange } from './utils';

export interface SensorData {
  temperature: number;
  humidity: number;
  lightIntensity: number;
  soilMoisture: number;
  timestamp: Date;
}

export interface ControlParams {
  irrigation: number;
  shading: number;
  co2Concentration: number;
}

export type SensorCallback = (data: SensorData, prevData: SensorData | null) => void;

const DEFAULT_SENSOR_DATA: SensorData = {
  temperature: 26,
  humidity: 60,
  lightIntensity: 70,
  soilMoisture: 55,
  timestamp: new Date()
};

const DEFAULT_CONTROL_PARAMS: ControlParams = {
  irrigation: 50,
  shading: 30,
  co2Concentration: 60
};

export class SensorSimulator {
  private data: SensorData;
  private prevData: SensorData | null = null;
  private controlParams: ControlParams;
  private callbacks: Set<SensorCallback> = new Set();
  private intervalId: number | null = null;
  private updateInterval: number = 2000;
  private dayTime: number = 0.5;
  private dayTimeSpeed: number = 0.0005;

  constructor(initialData?: Partial<SensorData>, initialParams?: Partial<ControlParams>) {
    this.data = { ...DEFAULT_SENSOR_DATA, ...initialData, timestamp: new Date() };
    this.controlParams = { ...DEFAULT_CONTROL_PARAMS, ...initialParams };
  }

  public subscribe(callback: SensorCallback): () => void {
    this.callbacks.add(callback);
    callback(this.data, null);
    return () => this.callbacks.delete(callback);
  }

  public start(): void {
    if (this.intervalId !== null) return;
    this.intervalId = window.setInterval(() => this.tick(), this.updateInterval);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setUpdateInterval(ms: number): void {
    this.updateInterval = ms;
    if (this.intervalId !== null) {
      this.stop();
      this.start();
    }
  }

  public setControlParams(params: Partial<ControlParams>): void {
    this.controlParams = { ...this.controlParams, ...params };
  }

  public getControlParams(): ControlParams {
    return { ...this.controlParams };
  }

  public getData(): SensorData {
    return { ...this.data };
  }

  public getDayTime(): number {
    return this.dayTime;
  }

  private tick(): void {
    this.prevData = { ...this.data };
    this.dayTime = (this.dayTime + this.dayTimeSpeed) % 1;

    const tempBase = this.calcTemperatureBase();
    const humidityBase = this.calcHumidityBase();
    const lightBase = this.calcLightBase();
    const moistureBase = this.calcSoilMoistureBase();

    this.data = {
      temperature: clamp(
        tempBase + randomRange(-0.5, 0.5) - this.controlParams.shading * 0.03,
        22, 35
      ),
      humidity: clamp(
        humidityBase + randomRange(-1, 1) + this.controlParams.irrigation * 0.15,
        40, 90
      ),
      lightIntensity: clamp(
        lightBase + randomRange(-2, 2) - this.controlParams.shading * 0.8,
        0, 100
      ),
      soilMoisture: clamp(
        moistureBase + randomRange(-1, 1) + this.controlParams.irrigation * 0.3,
        0, 100
      ),
      timestamp: new Date()
    };

    this.notifyCallbacks();
  }

  private calcTemperatureBase(): number {
    const dayFactor = Math.sin(this.dayTime * Math.PI);
    return 26 + dayFactor * 8;
  }

  private calcHumidityBase(): number {
    const dayFactor = Math.sin(this.dayTime * Math.PI);
    return 65 - dayFactor * 15;
  }

  private calcLightBase(): number {
    const dayFactor = Math.sin(this.dayTime * Math.PI);
    return Math.max(0, dayFactor * 95);
  }

  private calcSoilMoistureBase(): number {
    const evaporationFactor = Math.sin(this.dayTime * Math.PI) * 0.05;
    return clamp(this.data.soilMoisture - evaporationFactor, 10, 90);
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach((cb) => cb(this.data, this.prevData));
  }
}
