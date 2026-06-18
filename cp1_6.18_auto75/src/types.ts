export type GeometryType = 'box' | 'sphere' | 'torus' | 'cone'

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Rotation3 {
  pitch: number
  yaw: number
  roll: number
}

export interface MaterialProps {
  metalness: number
  roughness: number
  color: string
}

export interface GeometryItem {
  id: string
  type: GeometryType
  position: Vector3
  rotation: Rotation3
  scale: number
  material: MaterialProps
  createdAt: number
}

export interface DirectionalLightParams {
  azimuth: number
  elevation: number
  intensity: number
}

export interface AmbientLightParams {
  intensity: number
}

export interface PointLightParams {
  color: string
  position: Vector3
  intensity: number
}

export interface LightingParams {
  directional: DirectionalLightParams
  ambient: AmbientLightParams
  point: PointLightParams
}

export enum RecordingState {
  Idle = 'idle',
  Recording = 'recording',
  Processing = 'processing',
}

export interface ConnectionBeam {
  idA: string
  idB: string
  distance: number
  opacity: number
}
