export interface Room {
  id: string
  x: number
  z: number
  width: number
  depth: number
  area: number
}

export interface FloorData {
  floorIndex: number
  y: number
  height: number
  rooms: Room[]
}

export interface BuildingData {
  totalFloors: number
  totalHeight: number
  floors: FloorData[]
  buildingWidth: number
  buildingDepth: number
}

export interface Furniture {
  type: 'box' | 'cylinder'
  color: string
  size: number
}
