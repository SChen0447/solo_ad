export type PartCategory = 'engine' | 'tire' | 'suspension' | 'wing';

export interface PartStats {
  acceleration: number;
  topSpeed: number;
  grip: number;
  cornering: number;
}

export interface Part {
  id: string;
  category: PartCategory;
  name: string;
  description: string;
  stats: PartStats;
  color?: string;
}

export interface PartSelection {
  engine: string;
  tire: string;
  suspension: string;
  wing: string;
}

export interface CarStats {
  acceleration: number;
  topSpeed: number;
  grip: number;
  cornering: number;
}

export interface SavedSetup {
  id: string;
  name: string;
  selection: PartSelection;
  stats: CarStats;
  createdAt: number;
}
