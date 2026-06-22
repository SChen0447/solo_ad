export type FilterType = 'visible' | 'infrared' | 'xray';

export type CelestialShape = 'galaxy' | 'nebula' | 'cluster' | 'ring';

export interface CelestialBody {
  id: string;
  name: string;
  alias: string[];
  type: string;
  distance: string;
  size: string;
  description: string;
  position: [number, number, number];
  baseColor: string;
  particleCount: number;
  shape: CelestialShape;
  radius: number;
  bandColors: {
    visible: string;
    infrared: string;
    xray: string;
  };
  bandExpansion: {
    visible: number;
    infrared: number;
    xray: number;
  };
}

export interface FilterOption {
  key: FilterType;
  label: string;
  color: string;
}
