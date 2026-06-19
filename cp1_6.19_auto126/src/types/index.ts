export interface Building {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  opacity: number;
  selected?: boolean;
}

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SunPosition {
  azimuth: number;
  altitude: number;
  season: SeasonType;
  time: number;
}

export interface WindRose {
  direction: number;
  speed: number;
}

export interface WindParticle {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  speed: number;
  life: number;
  maxLife: number;
}

export interface WindGridCell {
  x: number;
  y: number;
  z: number;
  velocity: { x: number; y: number; z: number };
  speed: number;
}

export interface Scheme {
  id: string;
  name: string;
  buildings: Building[];
  metrics: {
    avgSunshineHours: number;
    avgWindSpeed: number;
  };
}

export interface SectionPlane {
  active: boolean;
  axis: 'x' | 'z';
  position: number;
}

export interface AppState {
  currentScheme: 'A' | 'B';
  schemeA: Scheme;
  schemeB: Scheme;
  sunPosition: SunPosition;
  windRose: WindRose;
  showWindParticles: boolean;
  sectionPlane: SectionPlane;
  selectedBuildingId: string | null;
  transitionProgress: number;
}
