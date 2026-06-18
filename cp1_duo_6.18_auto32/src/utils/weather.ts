import type { WeatherInfo, WeatherType } from '../types/travel';

const weatherTypes: Record<WeatherType, WeatherInfo> = {
  sunny: {
    type: 'sunny',
    icon: '☀️',
    color: '#ffd54f',
    description: '晴天',
  },
  rainy: {
    type: 'rainy',
    icon: '🌧️',
    color: '#42a5f5',
    description: '雨天',
  },
  cloudy: {
    type: 'cloudy',
    icon: '☁️',
    color: '#90a4ae',
    description: '多云',
  },
  snowy: {
    type: 'snowy',
    icon: '❄️',
    color: '#e3f2fd',
    description: '雪天',
  },
  windy: {
    type: 'windy',
    icon: '💨',
    color: '#81d4fa',
    description: '大风',
  },
};

export function getWeatherByLatLngDate(
  lat: number,
  lng: number,
  date: string
): WeatherInfo {
  const dateObj = new Date(date);
  const month = dateObj.getMonth();
  const dayOfYear = Math.floor(
    (dateObj.getTime() - new Date(dateObj.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const seed = (lat * 1000 + lng * 100 + dayOfYear + month * 31) % 100;

  let weatherType: WeatherType;
  if (seed < 35) {
    weatherType = 'sunny';
  } else if (seed < 55) {
    weatherType = 'cloudy';
  } else if (seed < 75) {
    weatherType = 'rainy';
  } else if (seed < 90) {
    weatherType = 'windy';
  } else {
    weatherType = 'snowy';
  }

  return weatherTypes[weatherType];
}

export function getPinColor(index: number, total: number): string {
  if (total <= 1) return '#4caf50';
  
  const startColor = { r: 76, g: 175, b: 80 };
  const endColor = { r: 244, g: 67, b: 54 };
  const ratio = index / (total - 1);

  const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}
