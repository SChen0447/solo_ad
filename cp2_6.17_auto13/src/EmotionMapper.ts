import type { Features } from './Analyzer'

export type EmotionLabel = '兴奋' | '焦躁' | '平稳' | '沮丧' | '匆忙' | '从容'

export interface EmotionResult {
  label: EmotionLabel
  color: string
  energy: number
  stress: number
  stability: number
}

export const EMOTION_COLORS: Record<EmotionLabel, string> = {
  '兴奋': '#ff6584',
  '焦躁': '#ffaa33',
  '平稳': '#4ecdc4',
  '沮丧': '#7c6f9e',
  '匆忙': '#ff6b6b',
  '从容': '#6c63ff'
}

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

export function mapEmotion(features: Features): EmotionResult {
  const { avgSlope, avgSpeed, spacingCV, avgPressure, pressureCV } = features

  const speedNorm = normalize(avgSpeed, 0.1, 3.0)
  const slopeAbsNorm = normalize(Math.abs(avgSlope), 5, 60)
  const pressureNorm = normalize(avgPressure, 0.3, 0.9)
  const spacingCVNorm = normalize(spacingCV, 0.05, 0.8)
  const pressureCVNorm = normalize(pressureCV, 0.05, 0.6)

  const energy = speedNorm * 0.6 + slopeAbsNorm * 0.4
  const stress = pressureNorm * 0.5 + pressureCVNorm * 0.3 + spacingCVNorm * 0.2
  const stability = (1 - spacingCVNorm) * 0.5 + (1 - slopeAbsNorm) * 0.3 + (1 - pressureCVNorm) * 0.2

  let label: EmotionLabel

  if (energy > 0.7 && stress > 0.5) {
    label = '焦躁'
  } else if (energy > 0.6 && stress <= 0.5) {
    label = '兴奋'
  } else if (energy <= 0.4 && stress > 0.6) {
    label = '沮丧'
  } else if (energy > 0.5 && stability < 0.4) {
    label = '匆忙'
  } else if (stability > 0.6 && energy <= 0.5) {
    label = '从容'
  } else {
    label = '平稳'
  }

  return {
    label,
    color: EMOTION_COLORS[label],
    energy: Math.round(energy * 100),
    stress: Math.round(stress * 100),
    stability: Math.round(stability * 100)
  }
}
