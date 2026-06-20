import { SensorData, formatTime } from './types';

interface DataGeneratorCallbacks {
  onData: (data: SensorData) => void;
}

const BASE_VALUES = {
  temperature: 25,
  humidity: 55,
  pressure: 1013,
};

const VARIATION_RANGES = {
  temperature: 12,
  humidity: 25,
  pressure: 20,
};

export function createDataGenerator(callbacks: DataGeneratorCallbacks) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let counter = 0;

  const generateRandomValue = (base: number, range: number): number => {
    const variation = (Math.random() - 0.5) * range * 2;
    return base + variation;
  };

  const generateData = (): SensorData => {
    const timestamp = Date.now();
    counter += 1;
    return {
      id: `data-${timestamp}-${counter}`,
      timestamp,
      time: formatTime(timestamp),
      temperature: Number(
        generateRandomValue(BASE_VALUES.temperature, VARIATION_RANGES.temperature).toFixed(2)
      ),
      humidity: Number(
        generateRandomValue(BASE_VALUES.humidity, VARIATION_RANGES.humidity).toFixed(2)
      ),
      pressure: Number(
        generateRandomValue(BASE_VALUES.pressure, VARIATION_RANGES.pressure).toFixed(2)
      ),
    };
  };

  const start = () => {
    const initialData = generateData();
    callbacks.onData(initialData);
    intervalId = setInterval(() => {
      const data = generateData();
      callbacks.onData(data);
    }, 2000);
  };

  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { start, stop };
}
