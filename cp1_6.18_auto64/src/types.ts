export type ObjectCategory = 'tree' | 'bench' | 'lamp'

export type TreeType = 'sphere' | 'cone' | 'umbrella'
export type BenchType = 'long' | 'ring'
export type LampType = 'default'

export type ObjectSubType = TreeType | BenchType | LampType

export interface LightParams {
  colorTemperature: number
  brightness: number
  coneAngle: number
}

export interface PlacedObject {
  id: string
  category: ObjectCategory
  subType: ObjectSubType
  position: [number, number, number]
  lightParams?: LightParams
  createdAt: number
}

export interface LayoutScheme {
  id: string
  name: string
  objects: PlacedObject[]
  createdAt: number
}

export const DEFAULT_LIGHT_PARAMS: LightParams = {
  colorTemperature: 4000,
  brightness: 1,
  coneAngle: 45,
}

export const COLOR_TEMP_MIN = 2700
export const COLOR_TEMP_MAX = 6500
export const BRIGHTNESS_MIN = 0
export const BRIGHTNESS_MAX = 2
export const CONE_ANGLE_MIN = 10
export const CONE_ANGLE_MAX = 80

export const MAX_SCHEMES = 5

export function colorTemperatureToRGB(kelvin: number): [number, number, number] {
  const temp = kelvin / 100
  let red: number, green: number, blue: number

  if (temp <= 66) {
    red = 255
    green = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661))
  } else {
    red = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)))
    green = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)))
  }

  if (temp >= 66) {
    blue = 255
  } else if (temp <= 19) {
    blue = 0
  } else {
    blue = Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307))
  }

  return [red / 255, green / 255, blue / 255]
}

export const easeOutBounce = (t: number): number => {
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

export const easeInOut = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
