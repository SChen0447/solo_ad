export interface Star {
  id: string;
  position: { x: number; y: number; z: number };
  brightness: number;
  color: { r: number; g: number; b: number };
  spectralType: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
  size: number;
}

export interface StarGenerationParams {
  count: number;
  distribution: 'sphere' | 'disk';
  seed: number;
}

export interface ConstellationLine {
  id: string;
  startStarId: string;
  endStarId: string;
}

export interface PlanetOrbit {
  id: string;
  centerStarId: string;
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  speed: number;
  planetRadius: number;
  planetColor: string;
}

export interface SelectedStar {
  star: Star;
  screenPosition: { x: number; y: number };
}
