import type { Features } from './Analyzer';

export type EmotionLabel = '兴奋' | '焦躁' | '平稳' | '沮丧' | '匆忙' | '从容';

export interface EmotionResult {
  label: EmotionLabel;
  color: string;
  energy: number;
  stress: number;
  stability: number;
}

const EMOTION_CONFIG: Record<EmotionLabel, { color: string }> = {
  '兴奋': { color: '#ff6584' },
  '焦躁': { color: '#ffaa33' },
  '平稳': { color: '#4ecdc4' },
  '沮丧': { color: '#7c6f9e' },
  '匆忙': { color: '#ff6b6b' },
  '从容': { color: '#6c63ff' }
};

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

export function mapToEmotion(features: Features): EmotionResult {
  const { avgSlope, avgSpeed, spacingCV, avgPressure } = features;

  const absSlope = Math.abs(avgSlope);
  const slopeNorm = normalize(absSlope, 5, 60);
  const speedNorm = normalize(avgSpeed, 0.1, 1.5);
  const pressureNorm = normalize(avgPressure, 0.2, 0.8);
  const cvNorm = normalize(spacingCV, 0.1, 0.8);

  const energy = (speedNorm * 0.6 + slopeNorm * 0.4);
  const stress = (pressureNorm * 0.5 + cvNorm * 0.5);
  const stability = (1 - cvNorm) * 0.6 + (1 - slopeNorm) * 0.4;

  let label: EmotionLabel;

  if (energy > 0.65 && stress > 0.55) {
    label = '焦躁';
  } else if (energy > 0.6 && stability < 0.5) {
    label = '兴奋';
  } else if (energy > 0.5 && stress > 0.5) {
    label = '匆忙';
  } else if (energy < 0.35 && stress > 0.5) {
    label = '沮丧';
  } else if (stability > 0.6 && energy < 0.5) {
    label = '从容';
  } else {
    label = '平稳';
  }

  return {
    label,
    color: EMOTION_CONFIG[label].color,
    energy: Math.round(energy * 100),
    stress: Math.round(stress * 100),
    stability: Math.round(stability * 100)
  };
}
