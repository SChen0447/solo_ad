export type EasingType = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'

export interface KeyframeProperties {
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
}

export class Keyframe {
  frame: number
  properties: Partial<KeyframeProperties>
  easing: EasingType

  constructor(frame: number, properties: Partial<KeyframeProperties> = {}, easing: EasingType = 'easeOutCubic') {
    this.frame = frame
    this.properties = { ...properties }
    this.easing = easing
  }

  clone(): Keyframe {
    return new Keyframe(this.frame, { ...this.properties }, this.easing)
  }
}

export function ease(t: number, easingType: EasingType): number {
  switch (easingType) {
    case 'linear':
      return t
    case 'easeIn':
    case 'easeInQuad':
      return t * t
    case 'easeOut':
    case 'easeOutQuad':
      return 1 - (1 - t) * (1 - t)
    case 'easeInOut':
    case 'easeInOutQuad':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    case 'easeInCubic':
      return t * t * t
    case 'easeOutCubic':
      return 1 - Math.pow(1 - t, 3)
    case 'easeInOutCubic':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    default:
      return t
  }
}

export function interpolateProperty(
  startValue: number,
  endValue: number,
  t: number,
  easingType: EasingType
): number {
  const easedT = ease(t, easingType)
  return startValue + (endValue - startValue) * easedT
}
