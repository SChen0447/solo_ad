import { LyricLine, AnimationType, AnimationState } from '../types';

const FADE_DURATION = 0.3;
const SLIDE_DISTANCE = 50;

export function getAnimationState(
  line: LyricLine,
  currentTime: number
): AnimationState {
  const { startTime, endTime, animation } = line;
  const totalDuration = endTime - startTime;
  const elapsed = currentTime - startTime;

  if (elapsed <= 0) {
    return getInitialState(animation);
  }

  if (elapsed >= totalDuration) {
    return getFinalState(animation);
  }

  const fadeInProgress = Math.min(elapsed / FADE_DURATION, 1);
  const fadeOutStart = Math.max(totalDuration - FADE_DURATION, 0);
  const fadeOutProgress = elapsed > fadeOutStart 
    ? 1 - Math.min((elapsed - fadeOutStart) / FADE_DURATION, 1)
    : 1;

  switch (animation) {
    case 'fade':
      return {
        opacity: easeInOutQuad(Math.min(fadeInProgress, fadeOutProgress)),
        scale: 1,
        translateX: 0
      };

    case 'scale': {
      const scaleProgress = easeInOutQuad(fadeInProgress);
      const baseScale = 0.5 + 0.5 * scaleProgress;
      const pulseScale = 1 + 0.05 * Math.sin(elapsed * Math.PI * 4);
      return {
        opacity: easeInOutQuad(Math.min(fadeInProgress, fadeOutProgress)),
        scale: baseScale * pulseScale,
        translateX: 0
      };
    }

    case 'slide': {
      const slideProgress = easeOutCubic(fadeInProgress);
      return {
        opacity: easeInOutQuad(Math.min(fadeInProgress, fadeOutProgress)),
        scale: 1,
        translateX: SLIDE_DISTANCE * (1 - slideProgress)
      };
    }

    default:
      return { opacity: 1, scale: 1, translateX: 0 };
  }
}

function getInitialState(animation: AnimationType): AnimationState {
  switch (animation) {
    case 'fade':
      return { opacity: 0, scale: 1, translateX: 0 };
    case 'scale':
      return { opacity: 0, scale: 0.5, translateX: 0 };
    case 'slide':
      return { opacity: 0, scale: 1, translateX: SLIDE_DISTANCE };
    default:
      return { opacity: 0, scale: 1, translateX: 0 };
  }
}

function getFinalState(animation: AnimationType): AnimationState {
  return { opacity: 0, scale: animation === 'scale' ? 0.5 : 1, translateX: 0 };
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function isLineActive(line: LyricLine, currentTime: number): boolean {
  return currentTime >= line.startTime && currentTime < line.endTime;
}

export function isLinePast(line: LyricLine, currentTime: number): boolean {
  return currentTime >= line.endTime;
}

export function isLineFuture(line: LyricLine, currentTime: number): boolean {
  return currentTime < line.startTime;
}

export function getLineProgress(line: LyricLine, currentTime: number): number {
  const total = line.endTime - line.startTime;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, (currentTime - line.startTime) / total));
}
