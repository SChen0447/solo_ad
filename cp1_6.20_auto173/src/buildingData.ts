import type { BuildingData, FloorData, Room } from './types'

const FLOOR_HEIGHT = 3
const TOTAL_FLOORS = 6
const BUILDING_WIDTH = 16
const BUILDING_DEPTH = 16

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1))
}

function generateRoomsForFloor(floorIndex: number, availableWidth: number, availableDepth: number): Room[] {
  const roomCount = randomInt(4, 6)
  const rooms: Room[] = []
  const margin = 0.5
  const minSize = 2
  const maxSize = 4

  let roomIdCounter = 0

  const rows = Math.ceil(Math.sqrt(roomCount))
  const cols = Math.ceil(roomCount / rows)

  const cellWidth = (availableWidth - margin * 2 - (cols - 1) * 0.2) / cols
  const cellDepth = (availableDepth - margin * 2 - (rows - 1) * 0.2) / rows

  for (let row = 0; row < rows && rooms.length < roomCount; row++) {
    for (let col = 0; col < cols && rooms.length < roomCount; col++) {
      const w = Math.min(maxSize, Math.max(minSize, cellWidth - randomRange(0, 0.8)))
      const d = Math.min(maxSize, Math.max(minSize, cellDepth - randomRange(0, 0.8)))
      const offsetX = randomRange(0, cellWidth - w)
      const offsetZ = randomRange(0, cellDepth - d)

      const room: Room = {
        id: `F${floorIndex + 1}-R${String(roomIdCounter + 1).padStart(2, '0')}`,
        x: margin + col * (cellWidth + 0.2) + offsetX - availableWidth / 2,
        z: margin + row * (cellDepth + 0.2) + offsetZ - availableDepth / 2,
        width: w,
        depth: d,
        area: parseFloat((w * d).toFixed(2)),
      }
      rooms.push(room)
      roomIdCounter++
    }
  }

  return rooms
}

export function generateBuildingData(): BuildingData {
  const floors: FloorData[] = []

  for (let i = 0; i < TOTAL_FLOORS; i++) {
    const floor: FloorData = {
      floorIndex: i,
      y: i * FLOOR_HEIGHT,
      height: FLOOR_HEIGHT,
      rooms: generateRoomsForFloor(i, BUILDING_WIDTH, BUILDING_DEPTH),
    }
    floors.push(floor)
  }

  return {
    totalFloors: TOTAL_FLOORS,
    totalHeight: TOTAL_FLOORS * FLOOR_HEIGHT,
    floors,
    buildingWidth: BUILDING_WIDTH,
    buildingDepth: BUILDING_DEPTH,
  }
}

export const FLOOR_HEIGHT_CONST = FLOOR_HEIGHT
