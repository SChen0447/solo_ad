import { clamp, lerp, normalize, RGBColor } from './utils';
import type { SensorData, ControlParams } from './SensorSimulator';

export type PlantType = 'tomato' | 'lettuce' | 'eggplant' | 'pepper';

export interface PlantConfig {
  type: PlantType;
  name: string;
  baseColor: RGBColor;
  maxHeight: number;
  growthRate: number;
  optimalTemp: number;
  optimalTempRange: number;
  optimalHumidity: number;
  optimalHumidityRange: number;
  optimalLight: number;
  optimalLightRange: number;
  optimalMoisture: number;
  optimalMoistureRange: number;
  optimalCO2: number;
  optimalCO2Range: number;
}

export interface PlantState {
  type: PlantType;
  height: number;
  growthRate: number;
  colorSaturation: number;
  branchIteration: number;
  health: number;
}

export interface GrowthHistoryPoint {
  timestamp: Date;
  height: number;
}

export const PLANT_CONFIGS: Record<PlantType, PlantConfig> = {
  tomato: {
    type: 'tomato',
    name: '番茄',
    baseColor: { r: 220, g: 60, b: 60 },
    maxHeight: 2.5,
    growthRate: 0.012,
    optimalTemp: 26,
    optimalTempRange: 4,
    optimalHumidity: 65,
    optimalHumidityRange: 15,
    optimalLight: 75,
    optimalLightRange: 20,
    optimalMoisture: 60,
    optimalMoistureRange: 20,
    optimalCO2: 70,
    optimalCO2Range: 20
  },
  lettuce: {
    type: 'lettuce',
    name: '生菜',
    baseColor: { r: 80, g: 180, b: 90 },
    maxHeight: 1.2,
    growthRate: 0.018,
    optimalTemp: 22,
    optimalTempRange: 4,
    optimalHumidity: 75,
    optimalHumidityRange: 10,
    optimalLight: 60,
    optimalLightRange: 20,
    optimalMoisture: 70,
    optimalMoistureRange: 15,
    optimalCO2: 65,
    optimalCO2Range: 15
  },
  eggplant: {
    type: 'eggplant',
    name: '茄子',
    baseColor: { r: 140, g: 80, b: 180 },
    maxHeight: 2.0,
    growthRate: 0.01,
    optimalTemp: 28,
    optimalTempRange: 3,
    optimalHumidity: 60,
    optimalHumidityRange: 15,
    optimalLight: 80,
    optimalLightRange: 15,
    optimalMoisture: 55,
    optimalMoistureRange: 20,
    optimalCO2: 75,
    optimalCO2Range: 20
  },
  pepper: {
    type: 'pepper',
    name: '甜椒',
    baseColor: { r: 240, g: 200, b: 60 },
    maxHeight: 1.8,
    growthRate: 0.011,
    optimalTemp: 27,
    optimalTempRange: 3,
    optimalHumidity: 55,
    optimalHumidityRange: 15,
    optimalLight: 85,
    optimalLightRange: 15,
    optimalMoisture: 50,
    optimalMoistureRange: 20,
    optimalCO2: 70,
    optimalCO2Range: 20
  }
};

export class PlantGrowthModel {
  private plants: Map<PlantType, PlantState> = new Map();
  private growthHistory: Map<PlantType, GrowthHistoryPoint[]> = new Map();
  private maxHistoryPoints: number = 288;
  private lastIterationTime: number = 0;
  private iterationInterval: number = 3000;

  constructor() {
    (Object.keys(PLANT_CONFIGS) as PlantType[]).forEach((type) => {
      this.plants.set(type, {
        type,
        height: 0.1 + Math.random() * 0.2,
        growthRate: 0,
        colorSaturation: 0.8,
        branchIteration: 1,
        health: 1
      });
      this.growthHistory.set(type, []);
    });
  }

  public update(sensorData: SensorData, controlParams: ControlParams, deltaTime: number): void {
    const now = Date.now();
    const shouldIterate = now - this.lastIterationTime >= this.iterationInterval;

    (Object.keys(PLANT_CONFIGS) as PlantType[]).forEach((type) => {
      const config = PLANT_CONFIGS[type];
      const state = this.plants.get(type)!;

      const envScore = this.calculateEnvironmentScore(config, sensorData, controlParams);
      state.health = envScore;

      const tempFactor = this.calcFactor(sensorData.temperature, config.optimalTemp, config.optimalTempRange);
      const humidityFactor = this.calcFactor(sensorData.humidity, config.optimalHumidity, config.optimalHumidityRange);
      const lightFactor = this.calcFactor(sensorData.lightIntensity, config.optimalLight, config.optimalLightRange);
      const moistureFactor = this.calcFactor(sensorData.soilMoisture, config.optimalMoisture, config.optimalMoistureRange);
      const co2Factor = this.calcFactor(controlParams.co2Concentration, config.optimalCO2, config.optimalCO2Range);

      const combinedFactor = tempFactor * humidityFactor * lightFactor * moistureFactor * co2Factor;
      state.growthRate = config.growthRate * combinedFactor * 100 * deltaTime;

      const heightIncrement = state.growthRate;
      state.height = clamp(state.height + heightIncrement, 0.05, config.maxHeight);

      state.colorSaturation = clamp(lerp(0.3, 1.0, combinedFactor), 0.3, 1.0);

      if (shouldIterate) {
        const maxIterations = Math.floor(normalize(state.height, 0.1, config.maxHeight) * 8) + 1;
        state.branchIteration = Math.min(state.branchIteration + 1, maxIterations);
      }

      this.appendHistory(type, state.height);
    });

    if (shouldIterate) {
      this.lastIterationTime = now;
    }
  }

  public getPlantState(type: PlantType): PlantState {
    return { ...this.plants.get(type)! };
  }

  public getAllPlantStates(): Record<PlantType, PlantState> {
    const result = {} as Record<PlantType, PlantState>;
    (Object.keys(PLANT_CONFIGS) as PlantType[]).forEach((type) => {
      result[type] = this.getPlantState(type);
    });
    return result;
  }

  public getGrowthHistory(type: PlantType): GrowthHistoryPoint[] {
    return [...this.growthHistory.get(type)!];
  }

  public getAllGrowthHistory(): Record<PlantType, GrowthHistoryPoint[]> {
    const result = {} as Record<PlantType, GrowthHistoryPoint[]>;
    (Object.keys(PLANT_CONFIGS) as PlantType[]).forEach((type) => {
      result[type] = this.getGrowthHistory(type);
    });
    return result;
  }

  public getAverageHeight(): number {
    const states = this.getAllPlantStates();
    const values = Object.values(states);
    return values.reduce((sum, s) => sum + s.height, 0) / values.length;
  }

  private calcFactor(actual: number, optimal: number, range: number): number {
    const diff = Math.abs(actual - optimal);
    if (diff <= range) {
      return 1 - (diff / range) * 0.3;
    }
    return clamp(0.7 - (diff - range) / range * 0.7, 0.1, 0.7);
  }

  private calculateEnvironmentScore(
    config: PlantConfig,
    sensorData: SensorData,
    controlParams: ControlParams
  ): number {
    const tempFactor = this.calcFactor(sensorData.temperature, config.optimalTemp, config.optimalTempRange);
    const humidityFactor = this.calcFactor(sensorData.humidity, config.optimalHumidity, config.optimalHumidityRange);
    const lightFactor = this.calcFactor(sensorData.lightIntensity, config.optimalLight, config.optimalLightRange);
    const moistureFactor = this.calcFactor(sensorData.soilMoisture, config.optimalMoisture, config.optimalMoistureRange);
    const co2Factor = this.calcFactor(controlParams.co2Concentration, config.optimalCO2, config.optimalCO2Range);
    return (tempFactor + humidityFactor + lightFactor + moistureFactor + co2Factor) / 5;
  }

  private appendHistory(type: PlantType, height: number): void {
    const history = this.growthHistory.get(type)!;
    const now = new Date();

    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (history.length > 0 && history[history.length - 1].timestamp > fiveMinutesAgo) {
      history[history.length - 1] = { timestamp: now, height };
    } else {
      history.push({ timestamp: now, height });
      if (history.length > this.maxHistoryPoints) {
        history.shift();
      }
    }
  }
}
