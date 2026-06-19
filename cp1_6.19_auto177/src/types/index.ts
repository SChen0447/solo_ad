export interface OceanCurrent {
  id: string;
  name: string;
  nameEn: string;
  type: 'warm' | 'cold';
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  avgTemperature: number;
  avgSalinity: number;
  flowRate: number;
  colorStart: string;
  colorEnd: string;
  description: string;
  affectedRegions: string[];
  width: number;
  waypoints?: { lat: number; lng: number }[];
}

export type LayerType = 'temperature' | 'salinity';

export interface AppState {
  selectedCurrent: OceanCurrent | null;
  activeLayer: LayerType;
  isLoading: boolean;
  searchQuery: string;
  setSelectedCurrent: (current: OceanCurrent | null) => void;
  setActiveLayer: (layer: LayerType) => void;
  setSearchQuery: (query: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}
