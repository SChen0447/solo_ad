export interface Layer {
  id: number
  name: string
  color: string
  thickness: number
  topDepth: number
  bottomDepth: number
}

export interface LithologyItem {
  layerId: number
  layerName: string
  color: string
  thickness: number
}

export interface Drill {
  id: number
  wellNo: string
  x: number
  y: number
  z: number
  depth: number
  sampleTime: string
  lithology: LithologyItem[]
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface AppData {
  layers: Layer[]
  drills: Drill[]
}
