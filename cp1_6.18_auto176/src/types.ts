export interface GeoDataPoint {
  lat: number
  lon: number
  temperature: number
  windSpeed: number
  windDirection: number
  pressure: number
}

export interface StreamLine {
  id: number
  points: Array<{ x: number; y: number; z: number }>
  speed: number
  color: string
}

export interface SurfaceMesh {
  vertices: number[]
  indices: number[]
  colors: number[]
}

export interface SlicePlane {
  enabled: boolean
  height: number
  rotationX: number
  rotationY: number
}

export type DataLayerType = 'wind' | 'temperature' | 'pressure'

export type DataSourceType = 'summerMonsoon' | 'winterCold' | 'averageYear'

export interface DataSourceInfo {
  id: DataSourceType
  name: string
  description: string
}

export const DATA_SOURCES: DataSourceInfo[] = [
  { id: 'summerMonsoon', name: '北半球夏季季风期', description: '北半球夏季季风活动期数据' },
  { id: 'winterCold', name: '南半球冬季寒潮期', description: '南半球冬季寒潮活动期数据' },
  { id: 'averageYear', name: '全球平均气候年景', description: '全球年平均气候基准数据' }
]

export const GRID_WIDTH = 100
export const GRID_HEIGHT = 60
export const MAX_STREAMLINES = 5000
export const STREAMLINE_POINTS = 50
export const TOTAL_TIME_FRAMES = 24
export const EARTH_RADIUS = 1.5
