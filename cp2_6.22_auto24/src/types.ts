export interface Plant {
  id: string;
  name: string;
  category: 'leaf' | 'fruit' | 'root';
  maturityDays: number;
  wateringFrequency: number;
  fertilizingCycle: number;
  imageUrl: string;
}

export interface Plan {
  id: string;
  plantId: string;
  plantName: string;
  sowDate: string;
  pots: number;
  plant?: Plant;
}

export interface GrowthRecord {
  id: string;
  planId: string;
  date: string;
  photoUrl: string;
  height: number;
  leafCount: number;
  note: string;
}

export interface Task {
  id: string;
  planId: string;
  planName: string;
  type: 'water' | 'fertilize' | 'harvest';
  label: string;
  completed: boolean;
  overdue: boolean;
}
