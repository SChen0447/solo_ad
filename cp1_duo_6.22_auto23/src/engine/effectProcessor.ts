import { Subtitle, TransformMatrix, EffectConfig, InEffectType, OutEffectType } from '../types';

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number): number => t * t * t;

export class EffectProcessor {
  private config: EffectConfig;

  constructor(config: EffectConfig = { inAnimationDuration: 1, outAnimationDuration: 1 }) {
    this.config = config;
  }

  updateConfig(config: EffectConfig): void {
    this.config = config;
  }

  getTransformMatrix(
    subtitle: Subtitle,
    currentTime: number,
    canvasHeight: number
  ): TransformMatrix {
    const { startTime, duration } = subtitle;
    const { inAnimationDuration, outAnimationDuration } = this.config;
    const endTime = startTime + duration;

    let matrix: TransformMatrix = {
      opacity: 1,
      translateX: 0,
      translateY: 0,
      scaleX: 1,
      scaleY: 1,
    };

    if (currentTime < startTime) {
      return { ...matrix, opacity: 0 };
    }

    if (currentTime > endTime) {
      return { ...matrix, opacity: 0 };
    }

    const inEndTime = startTime + Math.min(inAnimationDuration, duration / 2);
    const outStartTime = endTime - Math.min(outAnimationDuration, duration / 2);

    if (currentTime >= startTime && currentTime < inEndTime) {
      const progress = (currentTime - startTime) / (inEndTime - startTime);
      const easedProgress = easeOutCubic(progress);
      matrix = this.applyInEffect(subtitle.inEffect, matrix, easedProgress, canvasHeight);
    }

    if (currentTime >= outStartTime && currentTime <= endTime) {
      const progress = (currentTime - outStartTime) / (endTime - outStartTime);
      const easedProgress = easeInCubic(progress);
      matrix = this.applyOutEffect(subtitle.outEffect, matrix, easedProgress, canvasHeight);
    }

    return matrix;
  }

  private applyInEffect(
    effect: InEffectType,
    matrix: TransformMatrix,
    progress: number,
    canvasHeight: number
  ): TransformMatrix {
    switch (effect) {
      case 'fadeIn':
        return { ...matrix, opacity: progress };
      case 'slideUp':
        return {
          ...matrix,
          opacity: progress,
          translateY: canvasHeight * 0.2 * (1 - progress),
        };
      case 'scaleIn':
        return {
          ...matrix,
          opacity: progress,
          scaleX: 0.5 + progress * 0.5,
          scaleY: 0.5 + progress * 0.5,
        };
      default:
        return matrix;
    }
  }

  private applyOutEffect(
    effect: OutEffectType,
    matrix: TransformMatrix,
    progress: number,
    canvasHeight: number
  ): TransformMatrix {
    switch (effect) {
      case 'fadeOut':
        return { ...matrix, opacity: 1 - progress };
      case 'slideUpOut':
        return {
          ...matrix,
          opacity: 1 - progress,
          translateY: -canvasHeight * 0.2 * progress,
        };
      case 'scaleOut':
        return {
          ...matrix,
          opacity: 1 - progress,
          scaleX: 1 - progress * 0.5,
          scaleY: 1 - progress * 0.5,
        };
      default:
        return matrix;
    }
  }
}
