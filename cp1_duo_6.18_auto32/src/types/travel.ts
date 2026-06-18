export interface TravelPoint {
  lat: number;
  lng: number;
  date: string;
  photoUrl: string;
  note: string;
}

export interface TravelStore {
  travelData: TravelPoint[];
  selectedPoint: number | null;
  currentTime: number;
  isPlaying: boolean;
  isGalleryOpen: boolean;
  setTravelData: (data: TravelPoint[]) => void;
  selectPoint: (index: number | null) => void;
  setCurrentTime: (time: number) => void;
  togglePlayback: () => void;
  toggleGallery: () => void;
}

export interface ParseResult {
  success: boolean;
  data: TravelPoint[];
  error?: string;
}

export type WeatherType = 'sunny' | 'rainy' | 'cloudy' | 'snowy' | 'windy';

export interface WeatherInfo {
  type: WeatherType;
  icon: string;
  color: string;
  description: string;
}
