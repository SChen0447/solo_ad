import { SensorData } from './types';

const DATA_INTERVAL = 500;

export class DataGenerator {
  private lastValues = {
    temperature: 25,
    humidity: 60,
    light: 500,
    windSpeed: 5,
  };

  generateDataPoint(): SensorData {
    const now = Date.now();

    this.lastValues.temperature = Math.max(
      15,
      Math.min(35, this.lastValues.temperature + (Math.random() - 0.5) * 1)
    );
    this.lastValues.humidity = Math.max(
      20,
      Math.min(90, this.lastValues.humidity + (Math.random() - 0.5) * 3)
    );
    this.lastValues.light = Math.max(
      0,
      Math.min(1000, this.lastValues.light + (Math.random() - 0.5) * 50)
    );
    this.lastValues.windSpeed = Math.max(
      0,
      Math.min(30, this.lastValues.windSpeed + (Math.random() - 0.5) * 1.5)
    );

    return {
      timestamp: now,
      temperature: parseFloat(this.lastValues.temperature.toFixed(1)),
      humidity: parseFloat(this.lastValues.humidity.toFixed(1)),
      light: parseFloat(this.lastValues.light.toFixed(1)),
      windSpeed: parseFloat(this.lastValues.windSpeed.toFixed(1)),
    };
  }

  generateHistoryData(points: number): SensorData[] {
    const data: SensorData[] = [];
    const now = Date.now();

    for (let i = points; i > 0; i--) {
      const point = this.generateDataPoint();
      point.timestamp = now - i * DATA_INTERVAL;
      data.push(point);
    }

    return data;
  }
}

export const dataGenerator = new DataGenerator();
