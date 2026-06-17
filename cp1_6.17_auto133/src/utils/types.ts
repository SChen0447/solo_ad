export interface Star {
  id: string;
  name: string;
  englishName?: string;
  magnitude: number;
  distance: number;
  spectralType: string;
  ra: number;
  dec: number;
  color?: string;
}

export interface ConstellationLine {
  from: string;
  to: string;
}

export interface Constellation {
  id: string;
  name: string;
  englishName: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  starIds: string[];
  lines: ConstellationLine[];
}

export interface CustomLine {
  id: string;
  fromStarId: string;
  toStarId: string;
  name: string;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface StarProjected extends Star {
  x: number;
  y: number;
  z: number;
  screenX: number;
  screenY: number;
  size: number;
  alpha: number;
  visible: boolean;
}

export interface ViewState {
  rotationX: number;
  rotationY: number;
  zoom: number;
}
