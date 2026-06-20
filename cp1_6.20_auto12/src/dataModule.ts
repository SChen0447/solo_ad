export type MetricKey = 'temperature' | 'precipitation' | 'windSpeed' | 'humidity' | 'pressure';

export interface MetricInfo {
  key: MetricKey;
  name: string;
  unit: string;
  color: string;
  minValue: number;
  maxValue: number;
}

export interface DataPoint {
  date: string;
  dayOfYear: number;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  pressure: number;
}

export const METRICS: MetricInfo[] = [
  { key: 'temperature', name: '温度', unit: '°C', color: '#ff6b6b', minValue: -10, maxValue: 40 },
  { key: 'precipitation', name: '降水量', unit: 'mm', color: '#4ecdc4', minValue: 0, maxValue: 50 },
  { key: 'windSpeed', name: '风速', unit: 'm/s', color: '#a29bfe', minValue: 0, maxValue: 25 },
  { key: 'humidity', name: '湿度', unit: '%', color: '#74b9ff', minValue: 20, maxValue: 100 },
  { key: 'pressure', name: '气压', unit: 'hPa', color: '#ffeaa7', minValue: 990, maxValue: 1040 }
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function dayOfYearToDate(year: number, dayOfYear: number): string {
  const date = new Date(year, 0, 1);
  date.setDate(date.getDate() + dayOfYear - 1);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class DataModule {
  private data: DataPoint[] = [];
  private readonly year = 2024;
  private readonly dayCount = 365;

  constructor() {
    this.generateData();
  }

  private generateData(): void {
    const random = seededRandom(42);
    this.data = [];

    for (let day = 1; day <= this.dayCount; day++) {
      const t = (day - 1) / (this.dayCount - 1);
      const seasonal = Math.sin((t - 0.25) * Math.PI * 2);

      const temperature = 15 + seasonal * 20 + (random() - 0.5) * 6;
      const precipitation = Math.max(0, 8 + Math.sin(t * Math.PI * 4) * 6 + (random() - 0.5) * 10);
      const windSpeed = Math.max(0, 6 + seasonal * 3 + (random() - 0.5) * 5);
      const humidity = 60 + seasonal * 15 + (random() - 0.5) * 15;
      const pressure = 1013 - seasonal * 8 + (random() - 0.5) * 6;

      this.data.push({
        date: dayOfYearToDate(this.year, day),
        dayOfYear: day,
        temperature: Math.round(temperature * 10) / 10,
        precipitation: Math.round(precipitation * 10) / 10,
        windSpeed: Math.round(windSpeed * 10) / 10,
        humidity: Math.round(humidity * 10) / 10,
        pressure: Math.round(pressure * 10) / 10
      });
    }
  }

  getAllData(): DataPoint[] {
    return [...this.data];
  }

  getDataByDay(dayOfYear: number): DataPoint | null {
    if (dayOfYear < 1 || dayOfYear > this.dayCount) return null;
    return this.data[dayOfYear - 1] ?? null;
  }

  getDataByDate(date: string): DataPoint | null {
    return this.data.find(d => d.date === date) ?? null;
  }

  getDataByRange(startDay: number, endDay: number): DataPoint[] {
    const s = Math.max(1, startDay);
    const e = Math.min(this.dayCount, endDay);
    if (s > e) return [];
    return this.data.slice(s - 1, e);
  }

  getMetricRange(metric: MetricKey): { min: number; max: number } {
    const info = METRICS.find(m => m.key === metric);
    if (info) return { min: info.minValue, max: info.maxValue };
    const values = this.data.map(d => d[metric]);
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  getDayCount(): number {
    return this.dayCount;
  }
}
