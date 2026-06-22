export type EasingType = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInSine'
  | 'easeOutSine'
  | 'easeInOutSine'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo'
  | 'easeInElastic'
  | 'easeOutElastic'
  | 'easeInOutElastic'
  | 'easeInBounce'
  | 'easeOutBounce'
  | 'easeInOutBounce'
  | 'custom'

export type EasingFunction = (t: number) => number

export const EASING_FUNCTIONS: Record<Exclude<EasingType, 'custom'>, EasingFunction> = {
  linear: (t: number) => t,

  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,

  easeInSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,

  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,

  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,

  easeInExpo: (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t: number) =>
    t === 0
      ? 0
      : t === 1
      ? 1
      : t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2,

  easeInElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)
  },
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  easeInOutElastic: (t: number) => {
    const c5 = (2 * Math.PI) / 4.5
    return t === 0
      ? 0
      : t === 1
      ? 1
      : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1
  },

  easeInBounce: (t: number) => 1 - bounceOut(1 - t),
  easeOutBounce: (t: number) => bounceOut(t),
  easeInOutBounce: (t: number) =>
    t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2
}

function bounceOut(t: number): number {
  const n1 = 7.5625
  const d1 = 2.75

  if (t < 1 / d1) {
    return n1 * t * t
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  }
}

export const EASING_LIST: { value: EasingType; label: string }[] = [
  { value: 'linear', label: '线性 (Linear)' },
  { value: 'easeInSine', label: '正弦缓入 (Sine In)' },
  { value: 'easeOutSine', label: '正弦缓出 (Sine Out)' },
  { value: 'easeInOutSine', label: '正弦缓入缓出 (Sine In Out)' },
  { value: 'easeInQuad', label: '二次缓入 (Quad In)' },
  { value: 'easeOutQuad', label: '二次缓出 (Quad Out)' },
  { value: 'easeInOutQuad', label: '二次缓入缓出 (Quad In Out)' },
  { value: 'easeInCubic', label: '三次缓入 (Cubic In)' },
  { value: 'easeOutCubic', label: '三次缓出 (Cubic Out)' },
  { value: 'easeInOutCubic', label: '三次缓入缓出 (Cubic In Out)' },
  { value: 'easeInQuart', label: '四次缓入 (Quart In)' },
  { value: 'easeOutQuart', label: '四次缓出 (Quart Out)' },
  { value: 'easeInOutQuart', label: '四次缓入缓出 (Quart In Out)' },
  { value: 'easeInExpo', label: '指数缓入 (Expo In)' },
  { value: 'easeOutExpo', label: '指数缓出 (Expo Out)' },
  { value: 'easeInOutExpo', label: '指数缓入缓出 (Expo In Out)' },
  { value: 'easeInElastic', label: '弹性缓入 (Elastic In)' },
  { value: 'easeOutElastic', label: '弹性缓出 (Elastic Out)' },
  { value: 'easeInOutElastic', label: '弹性缓入缓出 (Elastic In Out)' },
  { value: 'easeInBounce', label: '弹跳缓入 (Bounce In)' },
  { value: 'easeOutBounce', label: '弹跳缓出 (Bounce Out)' },
  { value: 'easeInOutBounce', label: '弹跳缓入缓出 (Bounce In Out)' }
]

export interface KeyframeProperties {
  x: number
  y: number
  rotation: number
  scale: number
  opacity: number
}

export type PropertyValueDict = Partial<KeyframeProperties>

export const PROPERTY_KEYS: (keyof KeyframeProperties)[] = ['x', 'y', 'rotation', 'scale', 'opacity']

export interface PropertyConfig {
  key: keyof KeyframeProperties
  label: string
  min: number
  max: number
  step: number
  unit: string
}

export const PROPERTY_CONFIGS: PropertyConfig[] = [
  { key: 'x', label: 'X 位移', min: -1000, max: 1000, step: 1, unit: 'px' },
  { key: 'y', label: 'Y 位移', min: -1000, max: 1000, step: 1, unit: 'px' },
  { key: 'rotation', label: '旋转', min: -720, max: 720, step: 1, unit: '°' },
  { key: 'scale', label: '缩放', min: 0.01, max: 5, step: 0.01, unit: 'x' },
  { key: 'opacity', label: '不透明度', min: 0, max: 1, step: 0.01, unit: '' }
]

export interface KeyframeData {
  frame: number
  properties: PropertyValueDict
  easing: EasingType
  customEasingFn?: EasingFunction
}

export class Keyframe {
  frame: number
  properties: PropertyValueDict
  easing: EasingType
  customEasingFn: EasingFunction | null = null

  constructor(
    frame: number,
    properties: PropertyValueDict = {},
    easing: EasingType = 'easeOutCubic',
    customEasingFn?: EasingFunction
  ) {
    this.frame = frame
    this.properties = { ...properties }
    this.easing = easing
    if (customEasingFn) {
      this.customEasingFn = customEasingFn
    }
  }

  setCustomEasing(fn: EasingFunction): void {
    this.easing = 'custom'
    this.customEasingFn = fn
  }

  getEasedValue(t: number): number {
    if (this.easing === 'custom' && this.customEasingFn) {
      return this.customEasingFn(t)
    }
    const easingFn = EASING_FUNCTIONS[this.easing as Exclude<EasingType, 'custom'>]
    return easingFn ? easingFn(t) : t
  }

  clone(): Keyframe {
    const kf = new Keyframe(this.frame, { ...this.properties }, this.easing)
    if (this.customEasingFn) {
      kf.customEasingFn = this.customEasingFn
    }
    return kf
  }
}

export function ease(t: number, easingType: EasingType, customFn?: EasingFunction): number {
  if (easingType === 'custom' && customFn) {
    return customFn(t)
  }
  const easingFn = EASING_FUNCTIONS[easingType as Exclude<EasingType, 'custom'>]
  return easingFn ? easingFn(t) : t
}

export function interpolateProperty(
  startValue: number,
  endValue: number,
  t: number,
  easingType: EasingType,
  customFn?: EasingFunction
): number {
  const clampedT = Math.max(0, Math.min(1, t))
  const easedT = ease(clampedT, easingType, customFn)
  return startValue + (endValue - startValue) * easedT
}

export function interpolateProperties(
  startProps: PropertyValueDict,
  endProps: PropertyValueDict,
  t: number,
  easingType: EasingType,
  customFn?: EasingFunction
): PropertyValueDict {
  const result: PropertyValueDict = {}
  const keys = [...new Set([...Object.keys(startProps), ...Object.keys(endProps)])] as (keyof KeyframeProperties)[]

  for (const key of keys) {
    const startVal = startProps[key]
    const endVal = endProps[key]
    if (startVal !== undefined && endVal !== undefined) {
      result[key] = interpolateProperty(startVal, endVal, t, easingType, customFn)
    } else if (startVal !== undefined) {
      result[key] = startVal
    } else if (endVal !== undefined) {
      result[key] = endVal
    }
  }

  return result
}

export function mergeProperties(
  base: KeyframeProperties,
  overrides: PropertyValueDict
): KeyframeProperties {
  return {
    ...base,
    ...overrides
  }
}
