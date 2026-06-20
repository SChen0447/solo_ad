export type WeatherType = 'sunny' | 'rainy' | 'snowy';

export interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherType: WeatherType;
  weatherIcon: string;
  description: string;
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  weatherTypes: WeatherType[];
  tempRange: [number, number];
  reason: string;
  activities: string[];
}

export interface Recommendation extends Destination {
  matchScore: number;
}

export interface HistoryItem {
  id: string;
  city: string;
  timestamp: number;
}

export interface CityInfo {
  name: string;
  country: string;
  lat: number;
  lng: number;
}
