export enum WeatherType {
  Sunny = 'sunny',
  Cloudy = 'cloudy',
  LightRain = 'lightRain',
  HeavyRain = 'heavyRain',
  Foggy = 'foggy',
}

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  temperature: number;
  duration: number;
  isTransitioning: boolean;
  transitionProgress: number;
  transitionDuration: number;
  nextWeather?: WeatherType;
  nextWeatherIntensity?: number;
}

export interface WeatherEffects {
  healthRate: number;
  hungerMultiplier: number;
  speedMultiplier: number;
}

export const WEATHER_CONFIG: Record<WeatherType, {
  name: string;
  baseProbability: number;
  minDuration: number;
  maxDuration: number;
  minTemp: number;
  maxTemp: number;
  effects: WeatherEffects;
  color: string;
}> = {
  [WeatherType.Sunny]: {
    name: '晴天',
    baseProbability: 0.35,
    minDuration: 180,
    maxDuration: 480,
    minTemp: 25,
    maxTemp: 30,
    effects: {
      healthRate: 0.1,
      hungerMultiplier: 1.0,
      speedMultiplier: 1.0,
    },
    color: '#ffd54f',
  },
  [WeatherType.Cloudy]: {
    name: '多云',
    baseProbability: 0.25,
    minDuration: 180,
    maxDuration: 420,
    minTemp: 22,
    maxTemp: 26,
    effects: {
      healthRate: 0.05,
      hungerMultiplier: 1.0,
      speedMultiplier: 1.0,
    },
    color: '#b0bec5',
  },
  [WeatherType.LightRain]: {
    name: '小雨',
    baseProbability: 0.15,
    minDuration: 180,
    maxDuration: 360,
    minTemp: 17,
    maxTemp: 20,
    effects: {
      healthRate: -0.05,
      hungerMultiplier: 1.5,
      speedMultiplier: 0.9,
    },
    color: '#4fc3f7',
  },
  [WeatherType.HeavyRain]: {
    name: '大雨',
    baseProbability: 0.1,
    minDuration: 120,
    maxDuration: 300,
    minTemp: 15,
    maxTemp: 18,
    effects: {
      healthRate: -0.15,
      hungerMultiplier: 1.5,
      speedMultiplier: 0.75,
    },
    color: '#0288d1',
  },
  [WeatherType.Foggy]: {
    name: '雾天',
    baseProbability: 0.15,
    minDuration: 180,
    maxDuration: 360,
    minTemp: 20,
    maxTemp: 25,
    effects: {
      healthRate: -0.03,
      hungerMultiplier: 1.1,
      speedMultiplier: 0.6,
    },
    color: '#e0e0e0',
  },
};

export const TRANSITION_DURATION = 2;
export const WEATHER_UPDATE_INTERVAL = 30;
