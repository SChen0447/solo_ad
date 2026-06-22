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

export interface TrackWeights {
  acceleration: number;
  topSpeed: number;
  grip: number;
  cornering: number;
}

export interface Track {
  id: string;
  name: string;
  description: string;
  surface: string;
  condition: string;
  weights: TrackWeights;
  icon: string;
}

export interface TrackEfficiency {
  accelerationEfficiency: number;
  topSpeedEfficiency: number;
  gripEfficiency: number;
  corneringEfficiency: number;
}

export interface TrackMatchResult {
  trackId: string;
  matchScore: number;
  efficiency: TrackEfficiency;
  weightedContribution: {
    acceleration: number;
    topSpeed: number;
    grip: number;
    cornering: number;
  };
}

export interface Recommendation {
  setupId: string;
  setupName: string;
  matchScore: number;
  stats: CarStats;
  selection: PartSelection;
  pros: string[];
  cons: string[];
}
