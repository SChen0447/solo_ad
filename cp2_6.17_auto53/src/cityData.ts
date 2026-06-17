export type BuildingType = 'residential' | 'commercial' | 'park' | 'streetlight';

export interface BuildingData {
  id: string;
  name: string;
  type: BuildingType;
  position: { x: number; y: number; z: number };
  rotation: number;
  scale: number;
  meshId: string | null;
}

export interface DeleteRecord {
  data: BuildingData;
  timestamp: number;
}

let nextId = 0;

function generateId(): string {
  return `building_${++nextId}_${Date.now()}`;
}

const DEFAULT_NAMES: Record<BuildingType, string> = {
  residential: '住宅',
  commercial: '商业楼',
  park: '公园',
  streetlight: '路灯',
};

const buildings: Map<string, BuildingData> = new Map();
const deleteHistory: DeleteRecord[] = [];
const MAX_UNDO = 3;

export function addBuilding(
  type: BuildingType,
  position: { x: number; y: number; z: number },
  rotation: number = 0,
  scale: number = 1,
  name?: string,
): BuildingData {
  const id = generateId();
  const building: BuildingData = {
    id,
    name: name ?? `${DEFAULT_NAMES[type]} ${nextId}`,
    type,
    position: { ...position },
    rotation,
    scale,
    meshId: null,
  };
  buildings.set(id, building);
  return building;
}

export function removeBuilding(id: string): BuildingData | null {
  const data = buildings.get(id);
  if (!data) return null;
  buildings.delete(id);
  deleteHistory.push({ data: { ...data }, timestamp: Date.now() });
  if (deleteHistory.length > MAX_UNDO) {
    deleteHistory.shift();
  }
  return data;
}

export function undoDelete(): BuildingData | null {
  if (deleteHistory.length === 0) return null;
  const record = deleteHistory.pop()!;
  const restored: BuildingData = {
    ...record.data,
    id: generateId(),
    meshId: null,
  };
  buildings.set(restored.id, restored);
  return restored;
}

export function getBuilding(id: string): BuildingData | undefined {
  return buildings.get(id);
}

export function updateBuilding(
  id: string,
  updates: Partial<Pick<BuildingData, 'name' | 'position' | 'rotation' | 'scale' | 'meshId'>>,
): BuildingData | null {
  const data = buildings.get(id);
  if (!data) return null;
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.position !== undefined) data.position = { ...updates.position };
  if (updates.rotation !== undefined) data.rotation = updates.rotation;
  if (updates.scale !== undefined) data.scale = updates.scale;
  if (updates.meshId !== undefined) data.meshId = updates.meshId;
  return data;
}

export function getAllBuildings(): BuildingData[] {
  return Array.from(buildings.values());
}

export function getDeleteHistoryCount(): number {
  return deleteHistory.length;
}
