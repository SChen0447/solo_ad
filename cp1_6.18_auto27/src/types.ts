export type LightType = 'point' | 'spot' | 'directional'

export interface LightData {
  id: string
  type: LightType
  position: [number, number, number]
  intensity: number
  color: string
  distance: number
  decay: number
  angle: number
  penumbra: number
  target: [number, number, number]
}

export interface FurnitureItem {
  type: string
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  rotation: number
}

export interface ScenePreset {
  name: string
  description: string
  furniture: FurnitureItem[]
  lights: LightData[]
  wallColor: string
  floorColor: string
}
