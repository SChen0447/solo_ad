export interface GridCell {
  x: number
  y: number
  buildingHeight: number
}

export interface TimeSeriesData {
  grid: GridCell[]
  timePoints: number
  densities: number[][]
}

export interface ProcessedCell extends GridCell {
  index: number
  currentDensity: number
  targetDensity: number
  color: [number, number, number]
  targetColor: [number, number, number]
  heightScale: number
  targetHeightScale: number
  history: number[]
}

export interface CameraState {
  offsetX: number
  offsetZ: number
  zoom: number
}

export interface AppState {
  currentTimeIndex: number
  totalTimePoints: number
  isPlaying: boolean
  isLooping: boolean
  selectedCellIndex: number | null
  cameraOffset: { x: number; z: number }
}
