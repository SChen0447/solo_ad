import { SPECIES } from '../types';

export interface MushroomGrowthState {
  speciesId: number;
  currentStage: 'seed' | 'sprout' | 'growing' | 'mature';
  progress: number;
  elapsedSeconds: number;
  totalRequiredSeconds: number;
  growthRate: number;
}

export class MushroomGrowth {
  static calculateState(
    speciesId: number,
    startTime: number | null,
    overallProgress: number,
    growthRate: number
  ): MushroomGrowthState {
    const species = SPECIES[speciesId];
    const totalSeconds = species.growthDuration;
    const elapsedSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;

    let currentStage: MushroomGrowthState['currentStage'];
    if (overallProgress < 0.25) {
      currentStage = 'seed';
    } else if (overallProgress < 0.5) {
      currentStage = 'sprout';
    } else if (overallProgress < 1.0) {
      currentStage = 'growing';
    } else {
      currentStage = 'mature';
    }

    return {
      speciesId,
      currentStage,
      progress: overallProgress,
      elapsedSeconds,
      totalRequiredSeconds: totalSeconds,
      growthRate,
    };
  }

  static getStageEmoji(stage: MushroomGrowthState['currentStage']): string {
    switch (stage) {
      case 'seed': return '◉';
      case 'sprout': return '♧';
      case 'growing': return '🍄';
      case 'mature': return '🌟';
    }
  }
}
