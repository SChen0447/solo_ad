export type PlantSpecies = '绿萝' | '多肉' | '龟背竹' | '琴叶榕' | '蝴蝶兰';

export type CareStatus = 'healthy' | 'thirsty' | 'low_light';

export type TaskType = 'water' | 'fertilize' | 'repot';

export interface Plant {
  id: string;
  name: string;
  species: PlantSpecies;
  plantDate: string;
  photo: string;
  waterFrequency: number;
  fertilizeFrequency: number;
  repotFrequency: number;
  lastWatered: string;
  lastFertilized: string;
  lastRepotted: string;
  status: CareStatus;
}

export interface Task {
  id: string;
  plantId: string;
  plantName: string;
  type: TaskType;
  date: string;
  completed: boolean;
}

export interface SensorData {
  temperature: number;
  humidity: number;
  light: number;
  soilMoisture: number;
}

export interface CareAdvice {
  plantId: string;
  plantName: string;
  advice: string;
  priority: 'low' | 'medium' | 'high';
}
