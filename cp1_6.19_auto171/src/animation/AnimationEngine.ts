import { AnimationParams } from '@/types';

export class AnimationEngine {
  parse(params: AnimationParams): AnimationParams {
    const parsed: AnimationParams = {
      duration: Math.max(0.1, Math.min(5, Number(params.duration) || 1)),
      easing: params.easing,
      customEasing: params.customEasing || 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      delay: Math.max(0, Math.min(3, Number(params.delay) || 0)),
      iterationCount:
        params.iterationCount === 'infinite'
          ? 'infinite'
          : Math.max(1, Math.min(10, Number(params.iterationCount) || 1)),
      direction: params.direction || 'normal',
    };
    return parsed;
  }

  resolveEasing(params: AnimationParams): string {
    if (params.easing === 'custom') {
      return params.customEasing || 'cubic-bezier(0.25, 0.1, 0.25, 1)';
    }
    return params.easing;
  }

  generateKeyframes(elementType: 'square' | 'circle', animationId: string): string {
    if (elementType === 'square') {
      return `
@keyframes anim-square-${animationId} {
  0% {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
  50% {
    transform: rotate(180deg) scale(1.1);
    opacity: 0.85;
  }
  100% {
    transform: rotate(360deg) scale(1);
    opacity: 1;
  }
}`;
    } else {
      return `
@keyframes anim-circle-${animationId} {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-40px) scale(1.05);
    opacity: 0.9;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}`;
    }
  }

  toCSSString(elementType: 'square' | 'circle', params: AnimationParams, animationId: string): string {
    const parsed = this.parse(params);
    const easing = this.resolveEasing(parsed);
    const keyframes = this.generateKeyframes(elementType, animationId);
    const animationShorthand = `
.anim-${elementType}-${animationId} {
  animation-name: anim-${elementType}-${animationId};
  animation-duration: ${parsed.duration}s;
  animation-timing-function: ${easing};
  animation-delay: ${parsed.delay}s;
  animation-iteration-count: ${parsed.iterationCount};
  animation-direction: ${parsed.direction};
  animation-fill-mode: both;
}`;
    return keyframes.trim() + '\n' + animationShorthand.trim();
  }
}

export const animationEngine = new AnimationEngine();
