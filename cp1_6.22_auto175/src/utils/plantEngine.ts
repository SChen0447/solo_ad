export type GrowthStage = 'seed' | 'sprout' | 'seedling' | 'mature' | 'flowering';

export interface PlantPreferences {
  idealLight: number;
  idealWater: number;
  idealTemperature: number;
  lightTolerance: number;
  waterTolerance: number;
  temperatureTolerance: number;
}

export interface PlantType {
  id: string;
  name: string;
  species: string;
  icon: string;
  color: string;
  preferences: PlantPreferences;
}

export interface PlantGrowthHistory {
  timestamp: number;
  stage: GrowthStage;
  durationMs: number;
  avgHealth: number;
}

export interface Plant {
  id: string;
  typeId: string;
  name: string;
  stage: GrowthStage;
  growthProgress: number;
  health: number;
  createdAt: number;
  stageStartedAt: number;
  healthTrend: number[];
  history: PlantGrowthHistory[];
  isWithered: boolean;
  stageAnimating: boolean;
}

export interface EnvironmentParams {
  light: number;
  water: number;
  temperature: number;
}

export const GROWTH_STAGES: GrowthStage[] = ['seed', 'sprout', 'seedling', 'mature', 'flowering'];

export const STAGE_NAMES: Record<GrowthStage, string> = {
  seed: '种子',
  sprout: '发芽',
  seedling: '幼苗',
  mature: '成熟',
  flowering: '开花'
};

export const STAGE_ICONS: Record<GrowthStage, string> = {
  seed: '🌰',
  sprout: '🌱',
  seedling: '🌿',
  mature: '🪴',
  flowering: '🌸'
};

export const PLANT_TYPES: PlantType[] = [
  {
    id: 'sunflower',
    name: '向日葵',
    species: 'Helianthus annuus',
    icon: '🌻',
    color: '#fbbf24',
    preferences: {
      idealLight: 85,
      idealWater: 60,
      idealTemperature: 28,
      lightTolerance: 20,
      waterTolerance: 25,
      temperatureTolerance: 8
    }
  },
  {
    id: 'cactus',
    name: '仙人掌',
    species: 'Cactaceae',
    icon: '🌵',
    color: '#22c55e',
    preferences: {
      idealLight: 95,
      idealWater: 20,
      idealTemperature: 32,
      lightTolerance: 10,
      waterTolerance: 15,
      temperatureTolerance: 8
    }
  },
  {
    id: 'rose',
    name: '玫瑰',
    species: 'Rosa rugosa',
    icon: '🌹',
    color: '#ef4444',
    preferences: {
      idealLight: 70,
      idealWater: 55,
      idealTemperature: 22,
      lightTolerance: 20,
      waterTolerance: 20,
      temperatureTolerance: 6
    }
  },
  {
    id: 'mint',
    name: '薄荷',
    species: 'Mentha',
    icon: '🌿',
    color: '#10b981',
    preferences: {
      idealLight: 60,
      idealWater: 75,
      idealTemperature: 20,
      lightTolerance: 25,
      waterTolerance: 15,
      temperatureTolerance: 8
    }
  },
  {
    id: 'tomato',
    name: '番茄',
    species: 'Solanum lycopersicum',
    icon: '🍅',
    color: '#f97316',
    preferences: {
      idealLight: 80,
      idealWater: 65,
      idealTemperature: 26,
      lightTolerance: 15,
      waterTolerance: 20,
      temperatureTolerance: 6
    }
  }
];

export function getPlantType(typeId: string): PlantType | undefined {
  return PLANT_TYPES.find(p => p.id === typeId);
}

function calculateParamHealth(
  actual: number,
  ideal: number,
  tolerance: number
): number {
  const diff = Math.abs(actual - ideal);
  if (diff <= tolerance) {
    return 100;
  }
  const excess = diff - tolerance;
  const penaltyPerUnit = 100 / (100 - tolerance);
  return Math.max(0, 100 - excess * penaltyPerUnit);
}

export function calculateHealthFromEnv(
  plantType: PlantType,
  env: EnvironmentParams
): number {
  const { preferences } = plantType;
  const lightHealth = calculateParamHealth(
    env.light,
    preferences.idealLight,
    preferences.lightTolerance
  );
  const waterHealth = calculateParamHealth(
    env.water,
    preferences.idealWater,
    preferences.waterTolerance
  );
  const tempHealth = calculateParamHealth(
    env.temperature,
    preferences.idealTemperature,
    preferences.temperatureTolerance
  );
  return (lightHealth + waterHealth + tempHealth) / 3;
}

export function calculateGrowthRate(
  plantType: PlantType,
  env: EnvironmentParams
): number {
  const envMatch = calculateHealthFromEnv(plantType, env) / 100;
  const minRate = 0.5;
  const maxRate = 2.0;
  return minRate + (maxRate - minRate) * envMatch;
}

export interface EngineUpdateResult {
  stage: GrowthStage;
  growthProgress: number;
  health: number;
  isWithered: boolean;
  stageChanged: boolean;
  newHistory?: PlantGrowthHistory;
}

export function createPlant(typeId: string): Plant {
  const plantType = getPlantType(typeId);
  if (!plantType) throw new Error(`Unknown plant type: ${typeId}`);
  const now = Date.now();
  return {
    id: `plant-${now}-${Math.random().toString(36).slice(2, 9)}`,
    typeId,
    name: plantType.name,
    stage: 'seed',
    growthProgress: 0,
    health: 100,
    createdAt: now,
    stageStartedAt: now,
    healthTrend: [],
    history: [],
    isWithered: false,
    stageAnimating: false
  };
}

export function updatePlant(
  plant: Plant,
  env: EnvironmentParams,
  deltaMs: number
): EngineUpdateResult {
  if (plant.isWithered) {
    return {
      stage: plant.stage,
      growthProgress: plant.growthProgress,
      health: 0,
      isWithered: true,
      stageChanged: false
    };
  }

  const plantType = getPlantType(plant.typeId);
  if (!plantType) {
    return {
      stage: plant.stage,
      growthProgress: plant.growthProgress,
      health: plant.health,
      isWithered: plant.isWithered,
      stageChanged: false
    };
  }

  const targetHealth = calculateHealthFromEnv(plantType, env);
  const healthDelta = targetHealth - plant.health;
  const healthSmoothing = 0.05;
  let newHealth = Math.max(0, Math.min(100, plant.health + healthDelta * healthSmoothing));

  let isWithered = false;
  if (newHealth <= 0) {
    newHealth = 0;
    isWithered = true;
  }

  const growthRate = calculateGrowthRate(plantType, env);
  const progressIncrement = growthRate * (newHealth / 100) * (deltaMs / 1000);
  let newProgress = plant.growthProgress + progressIncrement;
  let newStage = plant.stage;
  let stageChanged = false;
  let newHistory: PlantGrowthHistory | undefined;

  const currentStageIndex = GROWTH_STAGES.indexOf(plant.stage);
  if (newProgress >= 100 && currentStageIndex < GROWTH_STAGES.length - 1) {
    const now = Date.now();
    const stageDuration = now - plant.stageStartedAt;
    const avgHealth = plant.healthTrend.length > 0
      ? plant.healthTrend.reduce((a, b) => a + b, 0) / plant.healthTrend.length
      : newHealth;

    newHistory = {
      timestamp: now,
      stage: plant.stage,
      durationMs: stageDuration,
      avgHealth: Math.round(avgHealth)
    };

    newStage = GROWTH_STAGES[currentStageIndex + 1];
    newProgress = 0;
    stageChanged = true;
  }

  if (newProgress > 100) {
    newProgress = 100;
  }

  return {
    stage: newStage,
    growthProgress: newProgress,
    health: Math.round(newHealth * 100) / 100,
    isWithered,
    stageChanged,
    newHistory
  };
}
