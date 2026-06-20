import { WeatherData, WeatherType } from './types';

export const WEATHER_UPDATED_EVENT = 'weatherUpdated';

interface WeatherConfig {
  sunny: { icon: string; description: string; tempRange: [number, number] };
  rainy: { icon: string; description: string; tempRange: [number, number] };
  snowy: { icon: string; description: string; tempRange: [number, number] };
}

const weatherConfigs: WeatherConfig = {
  sunny: {
    icon: '☀️',
    description: '晴朗',
    tempRange: [20, 35],
  },
  rainy: {
    icon: '🌧️',
    description: '下雨',
    tempRange: [10, 22],
  },
  snowy: {
    icon: '❄️',
    description: '下雪',
    tempRange: [-15, 0],
  },
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getWeatherTypeByCity(city: string): WeatherType {
  const hash = hashString(city);
  const types: WeatherType[] = ['sunny', 'rainy', 'snowy'];
  return types[hash % 3];
}

export async function fetchWeather(city: string): Promise<WeatherData> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const weatherType = getWeatherTypeByCity(city);
      const config = weatherConfigs[weatherType];
      const seed = hashString(city);
      const random = seededRandom(seed);
      const [minTemp, maxTemp] = config.tempRange;
      const temperature = Math.round(minTemp + random * (maxTemp - minTemp));
      const humidity = Math.round(40 + seededRandom(seed + 1) * 50);
      const windSpeed = Math.round(5 + seededRandom(seed + 2) * 25);

      const weatherData: WeatherData = {
        city,
        temperature,
        humidity,
        windSpeed,
        weatherType,
        weatherIcon: config.icon,
        description: config.description,
      };

      dispatchWeatherUpdate(weatherData);
      resolve(weatherData);
    }, 200);
  });
}

export function dispatchWeatherUpdate(data: WeatherData): void {
  const event = new CustomEvent<WeatherData>(WEATHER_UPDATED_EVENT, {
    detail: data,
  });
  window.dispatchEvent(event);
}

export function onWeatherUpdate(callback: (data: WeatherData) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<WeatherData>;
    callback(customEvent.detail);
  };
  window.addEventListener(WEATHER_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(WEATHER_UPDATED_EVENT, handler);
  };
}
