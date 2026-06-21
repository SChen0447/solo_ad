export type PlantType = 'succulent' | 'flower' | 'foliage' | 'herb';

export interface Plant {
  id: string;
  name: string;
  species: string;
  type: PlantType;
  purchaseDate: string;
  photoUrl: string;
  wateringFrequencyDays: number;
  lastWateredDate: string;
  lastFertilizedDate: string | null;
  lastRepottedDate: string | null;
}

export interface DiagnosisRecord {
  id: string;
  plantId: string;
  date: string;
  healthScore: number;
  photoUrl: string;
  notes: string;
}

export interface Reminder {
  plantId: string;
  plantName: string;
  type: 'water' | 'fertilizer';
  daysUntil: number;
  plantType: PlantType;
}
