import { DifficultyConfig } from '../../types';

export class DifficultyManager {
  level: number = 1;
  survivalTime: number = 0;
  currentConfig: DifficultyConfig;

  constructor() {
    this.currentConfig = this.computeConfig();
  }

  update(dt: number, combo: number): DifficultyConfig {
    this.survivalTime += dt;
    const newLevel = Math.floor(this.survivalTime / 15) + 1;
    if (newLevel !== this.level) {
      this.level = newLevel;
    }
    this.currentConfig = this.computeConfig();
    const comboBonus = Math.min(combo, 20);
    this.currentConfig.fragmentSpawnInterval = Math.max(
      200,
      this.currentConfig.fragmentSpawnInterval - comboBonus * 10
    );
    return this.currentConfig;
  }

  private computeConfig(): DifficultyConfig {
    const l = this.level;
    return {
      level: l,
      fragmentSpawnInterval: Math.max(300, 1200 - (l - 1) * 80),
      asteroidSpawnInterval: Math.max(600, 3000 - (l - 1) * 200),
      asteroidSpeed: 60 + (l - 1) * 15,
      maxFragments: Math.min(30, 8 + l * 2),
      maxAsteroids: Math.min(10, 2 + l),
    };
  }

  getPerformanceConfig(fps: number): DifficultyConfig {
    const config = { ...this.currentConfig };
    if (fps < 30) {
      config.maxFragments = Math.min(config.maxFragments, 20);
      config.maxAsteroids = Math.min(config.maxAsteroids, 6);
    }
    return config;
  }

  reset() {
    this.level = 1;
    this.survivalTime = 0;
    this.currentConfig = this.computeConfig();
  }
}
