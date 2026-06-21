export interface SensorData {
  timestamp: number;
  temperature: number;
  humidity: number;
  light: number;
  windSpeed: number;
}

export type SensorType = 'temperature' | 'humidity' | 'light' | 'windSpeed';

export type TimeRange = '1m' | '5m' | '15m';

export interface FilterState {
  sensors: SensorType[];
  timeRange: TimeRange;
}

export interface LayoutItem {
  id: SensorType;
  x: number;
  y: number;
  w: number;
  h: number;
}
