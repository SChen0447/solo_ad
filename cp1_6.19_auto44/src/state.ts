import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  Furniture,
  FurnitureType,
  Room,
  Stats,
  FURNITURE_TEMPLATES,
  DEFAULT_ROOM,
  GRID_SIZE,
  ROTATION_STEP,
  POSITION_STEP,
} from './types'

interface AppState {
  room: Room
  furnitureList: Furniture[]
  selectedFurnitureId: string | null
  isDragging: boolean
  stats: Stats
  setRoom: (room: Room) => void
  addFurniture: (type: FurnitureType, position: [number, number, number]) => void
  removeFurniture: (id: string) => void
  moveFurniture: (id: string, position: [number, number, number]) => void
  rotateFurniture: (id: string, direction: 1 | -1) => void
  nudgeFurniture: (id: string, direction: 'left' | 'right' | 'forward' | 'backward') => void
  selectFurniture: (id: string | null) => void
  setDragging: (dragging: boolean) => void
  snapToGrid: (value: number) => number
  calculateStats: () => void
  loadRoomFromJSON: (json: Room) => void
}

const calculateOcclusionRate = (room: Room, furnitureList: Furniture[]): number => {
  const door = room.doors[0]
  if (!door) return 0

  const doorPos: [number, number] = [door.position[0], door.position[1]]
  const sampleCount = 50
  let occludedCount = 0

  for (let i = 0; i < sampleCount; i++) {
    const t = (i + 1) / (sampleCount + 1)
    const targetX = room.width * t
    const targetZ = room.depth * (0.2 + Math.random() * 0.6)

    let occluded = false
    for (const furniture of furnitureList) {
      const template = FURNITURE_TEMPLATES[furniture.type]
      const halfW = (template.width * furniture.scale) / 2
      const halfD = (template.depth * furniture.scale) / 2

      const fx = furniture.position[0]
      const fz = furniture.position[2]

      if (
        targetX >= fx - halfW &&
        targetX <= fx + halfW &&
        targetZ >= fz - halfD &&
        targetZ <= fz + halfD
      ) {
        const dx = targetX - doorPos[0]
        const dz = targetZ - doorPos[1]
        const len = Math.sqrt(dx * dx + dz * dz)
        if (len > 0.5) {
          occluded = true
          break
        }
      }
    }

    if (occluded) occludedCount++
  }

  return (occludedCount / sampleCount) * 100
}

export const useAppStore = create<AppState>((set, get) => ({
  room: DEFAULT_ROOM,
  furnitureList: [],
  selectedFurnitureId: null,
  isDragging: false,
  stats: {
    totalArea: DEFAULT_ROOM.width * DEFAULT_ROOM.depth,
    occupiedArea: 0,
    furnitureCount: 0,
    occlusionRate: 0,
  },

  setRoom: (room) => {
    set({ room })
    get().calculateStats()
  },

  addFurniture: (type, position) => {
    const template = FURNITURE_TEMPLATES[type]
    const newFurniture: Furniture = {
      id: uuidv4(),
      type,
      position: [position[0], template.height / 2, position[2]],
      rotation: 0,
      scale: 1,
    }
    set((state) => ({ furnitureList: [...state.furnitureList, newFurniture] }))
    get().calculateStats()
  },

  removeFurniture: (id) => {
    set((state) => ({
      furnitureList: state.furnitureList.filter((f) => f.id !== id),
      selectedFurnitureId: state.selectedFurnitureId === id ? null : state.selectedFurnitureId,
    }))
    get().calculateStats()
  },

  moveFurniture: (id, position) => {
    set((state) => ({
      furnitureList: state.furnitureList.map((f) =>
        f.id === id ? { ...f, position } : f
      ),
    }))
  },

  rotateFurniture: (id, direction) => {
    set((state) => ({
      furnitureList: state.furnitureList.map((f) =>
        f.id === id ? { ...f, rotation: f.rotation + ROTATION_STEP * direction } : f
      ),
    }))
    get().calculateStats()
  },

  nudgeFurniture: (id, direction) => {
    const state = get()
    const furniture = state.furnitureList.find((f) => f.id === id)
    if (!furniture) return

    const rotation = furniture.rotation
    let dx = 0
    let dz = 0

    switch (direction) {
      case 'left':
        dx = -POSITION_STEP
        break
      case 'right':
        dx = POSITION_STEP
        break
      case 'forward':
        dz = -POSITION_STEP
        break
      case 'backward':
        dz = POSITION_STEP
        break
    }

    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    const rotatedDx = dx * cos - dz * sin
    const rotatedDz = dx * sin + dz * cos

    const newPosition: [number, number, number] = [
      furniture.position[0] + rotatedDx,
      furniture.position[1],
      furniture.position[2] + rotatedDz,
    ]

    get().moveFurniture(id, newPosition)
    get().calculateStats()
  },

  selectFurniture: (id) => {
    set({ selectedFurnitureId: id })
  },

  setDragging: (dragging) => {
    set({ isDragging: dragging })
  },

  snapToGrid: (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  },

  calculateStats: () => {
    const state = get()
    const { room, furnitureList } = state

    const totalArea = room.width * room.depth

    let occupiedArea = 0
    for (const furniture of furnitureList) {
      const template = FURNITURE_TEMPLATES[furniture.type]
      occupiedArea += template.width * template.depth * furniture.scale * furniture.scale
    }

    const occlusionRate = calculateOcclusionRate(room, furnitureList)

    set({
      stats: {
        totalArea,
        occupiedArea,
        furnitureCount: furnitureList.length,
        occlusionRate,
      },
    })
  },

  loadRoomFromJSON: (json: Room) => {
    set({ room: json })
    get().calculateStats()
  },
}))
