import { AnimationClip, applyEasing } from './KeyframeGenerator';

export function getTotalDuration(clips: AnimationClip[]): number {
  if (clips.length === 0) return 0;
  return Math.max(...clips.map((clip) => clip.startTime + clip.duration));
}

export function computeTransformValue(clip: AnimationClip, localProgress: number): string {
  const easedProgress = applyEasing(localProgress, clip.easing);
  const value = clip.startValue + (clip.endValue - clip.startValue) * easedProgress;

  switch (clip.type) {
    case 'translate':
      return `translateX(${value}px)`;
    case 'rotate':
      return `rotate(${value}deg)`;
    case 'scale':
      return `scale(${value})`;
    case 'opacity':
      return `${value}`;
    default:
      return '';
  }
}

function getAdjustedProgress(clip: AnimationClip, time: number): number | null {
  if (!isClipActive(clip, time)) return null;
  const localProgress = Math.min(Math.max((time - clip.startTime) / clip.duration, 0), 1);
  if (clip.direction === 'reverse') {
    return 1 - localProgress;
  }
  if (clip.direction === 'alternate') {
    const iteration = Math.floor(localProgress * clip.iterationCount);
    return iteration % 2 === 1 ? 1 - localProgress : localProgress;
  }
  return localProgress;
}

export function computeFrameStyle(clips: AnimationClip[], time: number): Record<string, string> {
  return computeFrameStylesForAll(clips, time);
}

export function computeFrameStylesForAll(clips: AnimationClip[], time: number): Record<string, string> {
  const translateParts: string[] = [];
  const rotateParts: string[] = [];
  const scaleParts: string[] = [];
  let opacity: string | null = null;

  for (const clip of clips) {
    const adjustedProgress = getAdjustedProgress(clip, time);
    if (adjustedProgress === null) continue;

    const value = computeTransformValue(clip, adjustedProgress);

    switch (clip.type) {
      case 'translate':
        translateParts.push(value);
        break;
      case 'rotate':
        rotateParts.push(value);
        break;
      case 'scale':
        scaleParts.push(value);
        break;
      case 'opacity':
        opacity = value;
        break;
    }
  }

  const transforms = [...translateParts, ...rotateParts, ...scaleParts];
  const result: Record<string, string> = {};
  if (transforms.length > 0) {
    result.transform = transforms.join(' ');
  }
  if (opacity !== null) {
    result.opacity = opacity;
  }
  return result;
}

export function isClipActive(clip: AnimationClip, time: number): boolean {
  return time >= clip.startTime && time <= clip.startTime + clip.duration;
}
