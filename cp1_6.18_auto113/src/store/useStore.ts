import { create } from 'zustand'
import * as THREE from 'three'

export type BuildingStyle = 'tang' | 'song' | 'mingqing'

export interface BuildingData {
  id: string
  name: string
  style: BuildingStyle
  year: number
  position: [number, number, number]
  size: [number, number, number]
  features: string[]
  dimensions: { width: number; depth: number; height: number }
}

export interface CameraState {
  isAutoRoaming: boolean
  targetPosition: THREE.Vector3 | null
  targetLookAt: THREE.Vector3 | null
}

interface AppState {
  currentYear: number
  startYear: number
  endYear: number
  buildings: BuildingData[]
  selectedBuilding: BuildingData | null
  highlightedBuildingId: string | null
  detailBuilding: BuildingData | null
  isDetailPanelOpen: boolean
  camera: CameraState
  lightingTint: THREE.Color
  isDraggingSlider: boolean
  hoveredBuildingId: string | null

  setCurrentYear: (year: number) => void
  setBuildings: (buildings: BuildingData[]) => void
  selectBuilding: (building: BuildingData | null) => void
  setHighlightedBuilding: (id: string | null) => void
  openDetailPanel: (building: BuildingData) => void
  closeDetailPanel: () => void
  setCameraState: (state: Partial<CameraState>) => void
  setLightingTint: (color: THREE.Color) => void
  setIsDraggingSlider: (dragging: boolean) => void
  setHoveredBuilding: (id: string | null) => void
}

export const HISTORICAL_NODES = [
  { year: 700, label: '唐初', style: 'tang' as BuildingStyle },
  { year: 800, label: '盛唐', style: 'tang' as BuildingStyle },
  { year: 960, label: '北宋', style: 'song' as BuildingStyle },
  { year: 1127, label: '南宋', style: 'song' as BuildingStyle },
  { year: 1368, label: '明初', style: 'mingqing' as BuildingStyle },
  { year: 1644, label: '清初', style: 'mingqing' as BuildingStyle },
  { year: 1850, label: '晚清', style: 'mingqing' as BuildingStyle },
  { year: 1900, label: '清末', style: 'mingqing' as BuildingStyle },
]

export const STYLE_CONFIG = {
  tang: {
    roofColor: new THREE.Color('#5c4a3a'),
    wallColor: new THREE.Color('#d4c4a8'),
    tint: new THREE.Color('#ffcc80'),
    name: '唐代',
    description: '简朴方正，气势恢宏',
  },
  song: {
    roofColor: new THREE.Color('#607d8b'),
    wallColor: new THREE.Color('#e8dcc8'),
    tint: new THREE.Color('#b0bec5'),
    name: '宋代',
    description: '飞檐翘角，典雅秀丽',
  },
  mingqing: {
    roofColor: new THREE.Color('#8b4513'),
    wallColor: new THREE.Color('#f5e6d0'),
    tint: new THREE.Color('#ffab91'),
    name: '明清',
    description: '雕窗红墙，富丽堂皇',
  },
}

export const useStore = create<AppState>((set) => ({
  currentYear: 700,
  startYear: 700,
  endYear: 1900,
  buildings: [],
  selectedBuilding: null,
  highlightedBuildingId: null,
  detailBuilding: null,
  isDetailPanelOpen: false,
  camera: {
    isAutoRoaming: false,
    targetPosition: null,
    targetLookAt: null,
  },
  lightingTint: new THREE.Color('#ffcc80'),
  isDraggingSlider: false,
  hoveredBuildingId: null,

  setCurrentYear: (year) => set({ currentYear: year }),
  setBuildings: (buildings) => set({ buildings }),
  selectBuilding: (building) => set({ selectedBuilding: building }),
  setHighlightedBuilding: (id) => set({ highlightedBuildingId: id }),
  openDetailPanel: (building) =>
    set({ detailBuilding: building, isDetailPanelOpen: true }),
  closeDetailPanel: () =>
    set({ isDetailPanelOpen: false, detailBuilding: null }),
  setCameraState: (state) =>
    set((prev) => ({ camera: { ...prev.camera, ...state } })),
  setLightingTint: (color) => set({ lightingTint: color }),
  setIsDraggingSlider: (dragging) => set({ isDraggingSlider: dragging }),
  setHoveredBuilding: (id) => set({ hoveredBuildingId: id }),
}))
