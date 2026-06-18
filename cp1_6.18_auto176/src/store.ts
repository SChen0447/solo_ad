import { create } from 'zustand'
import {
  DataLayerType,
  DataSourceType,
  SlicePlane,
  StreamLine,
  GeoDataPoint,
  GRID_WIDTH,
  GRID_HEIGHT
} from './types'

interface CameraState {
  targetLat: number
  targetLon: number
  distance: number
}

interface HoverInfo {
  lat: number
  lon: number
  temperature: number
  windSpeed: number
  pressure: number
  visible: boolean
  screenX: number
  screenY: number
}

interface AppState {
  camera: CameraState
  activeLayers: DataLayerType[]
  dataSource: DataSourceType
  currentTimeFrame: number
  isPlaying: boolean
  slicePlane: SlicePlane
  streamLines: StreamLine[]
  temperatureGrid: number[][]
  pressureGrid: number[][]
  windData: GeoDataPoint[]
  hoverInfo: HoverInfo
  transitionProgress: number
  sidebarCollapsed: boolean

  setCamera: (camera: Partial<CameraState>) => void
  toggleLayer: (layer: DataLayerType) => void
  setDataSource: (source: DataSourceType) => void
  setCurrentTimeFrame: (frame: number) => void
  setIsPlaying: (playing: boolean) => void
  setSlicePlane: (plane: Partial<SlicePlane>) => void
  setStreamLines: (lines: StreamLine[]) => void
  setTemperatureGrid: (grid: number[][]) => void
  setPressureGrid: (grid: number[][]) => void
  setWindData: (data: GeoDataPoint[]) => void
  setHoverInfo: (info: Partial<HoverInfo>) => void
  setTransitionProgress: (progress: number) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  camera: {
    targetLat: 20,
    targetLon: 110,
    distance: 5
  },
  activeLayers: ['wind', 'temperature'],
  dataSource: 'averageYear',
  currentTimeFrame: 0,
  isPlaying: false,
  slicePlane: {
    enabled: false,
    height: 2,
    rotationX: 0,
    rotationY: 0
  },
  streamLines: [],
  temperatureGrid: Array.from({ length: GRID_HEIGHT }, () =>
    Array(GRID_WIDTH).fill(0)
  ),
  pressureGrid: Array.from({ length: GRID_HEIGHT }, () =>
    Array(GRID_WIDTH).fill(1013)
  ),
  windData: [],
  hoverInfo: {
    lat: 0,
    lon: 0,
    temperature: 0,
    windSpeed: 0,
    pressure: 1013,
    visible: false,
    screenX: 0,
    screenY: 0
  },
  transitionProgress: 1,
  sidebarCollapsed: false,

  setCamera: (camera) =>
    set((state) => ({ camera: { ...state.camera, ...camera } })),
  toggleLayer: (layer) =>
    set((state) => ({
      activeLayers: state.activeLayers.includes(layer)
        ? state.activeLayers.filter((l) => l !== layer)
        : [...state.activeLayers, layer]
    })),
  setDataSource: (source) => set({ dataSource: source }),
  setCurrentTimeFrame: (frame) => set({ currentTimeFrame: frame }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setSlicePlane: (plane) =>
    set((state) => ({ slicePlane: { ...state.slicePlane, ...plane } })),
  setStreamLines: (lines) => set({ streamLines: lines }),
  setTemperatureGrid: (grid) => set({ temperatureGrid: grid }),
  setPressureGrid: (grid) => set({ pressureGrid: grid }),
  setWindData: (data) => set({ windData: data }),
  setHoverInfo: (info) =>
    set((state) => ({ hoverInfo: { ...state.hoverInfo, ...info } })),
  setTransitionProgress: (progress) => set({ transitionProgress: progress }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
}))
