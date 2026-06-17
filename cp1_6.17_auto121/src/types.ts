export type DisplayMode = 'drill' | 'both' | 'stratum';

export interface StratumData {
  name: string;
  depth: number;
  color: string;
}

export interface DrillData {
  id: string;
  name: string;
  x: number;
  z: number;
  strata: StratumData[];
}

export interface PresetDrill {
  x: number;
  z: number;
  name: string;
  strata: StratumData[];
}

export interface PresetData {
  name: string;
  description: string;
  drills: PresetDrill[];
}
