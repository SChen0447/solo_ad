export interface Building {
  id: string
  position: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  color: string
}

export interface SunPositionData {
  azimuth: number
  altitude: number
  x: number
  y: number
  z: number
}

export interface ShadowDataPoint {
  hour: number
  coveragePercent: number
  coverageArea: number
}

export interface ShadowAnalysisResult {
  hourly: ShadowDataPoint[]
  averageCoverage: number
  totalArea: number
}

export interface SceneData {
  id?: string
  name?: string
  buildings: Building[]
  date: number
  time: number
  cameraPosition?: { x: number; y: number; z: number }
  createdAt?: string
}

export type ViewPreset = 'top' | 'side' | 'orbit'

export interface AppState {
  buildings: Building[]
  selectedBuildingId: string | null
  date: number
  time: number
  viewPreset: ViewPreset
}
