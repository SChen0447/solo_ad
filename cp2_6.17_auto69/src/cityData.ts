export enum BuildingType {
  RESIDENTIAL = 'residential',
  COMMERCIAL = 'commercial',
  PARK = 'park',
  STREETLIGHT = 'streetlight',
}

export interface BuildingData {
  id: string;
  name: string;
  type: BuildingType;
  position: { x: number; y: number; z: number };
  rotation: { y: number };
  scale: { x: number; y: number; z: number };
}

let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `building_${idCounter}`;
}

const typeNames: Record<BuildingType, string> = {
  [BuildingType.RESIDENTIAL]: '住宅',
  [BuildingType.COMMERCIAL]: '商业楼',
  [BuildingType.PARK]: '公园',
  [BuildingType.STREETLIGHT]: '路灯',
};

export function getTypeName(type: BuildingType): string {
  return typeNames[type];
}

export function createBuildingData(
  type: BuildingType,
  position: { x: number; y: number; z: number }
): BuildingData {
  return {
    id: generateId(),
    name: `${typeNames[type]} ${idCounter}`,
    type,
    position: { ...position },
    rotation: { y: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

export class CityDataStore {
  private buildings: Map<string, BuildingData> = new Map();
  private deletedStack: BuildingData[] = [];

  add(data: BuildingData): void {
    this.buildings.set(data.id, { ...data });
  }

  remove(id: string): BuildingData | undefined {
    const data = this.buildings.get(id);
    if (data) {
      this.buildings.delete(id);
      this.deletedStack.push({ ...data });
      if (this.deletedStack.length > 3) {
        this.deletedStack.shift();
      }
      return data;
    }
    return undefined;
  }

  undoDelete(): BuildingData | undefined {
    return this.deletedStack.pop();
  }

  getUndoCount(): number {
    return this.deletedStack.length;
  }

  update(id: string, partial: Partial<BuildingData>): void {
    const data = this.buildings.get(id);
    if (data) {
      Object.assign(data, partial);
    }
  }

  get(id: string): BuildingData | undefined {
    const data = this.buildings.get(id);
    return data ? { ...data } : undefined;
  }

  getAll(): BuildingData[] {
    return Array.from(this.buildings.values()).map((d) => ({ ...d }));
  }

  has(id: string): boolean {
    return this.buildings.has(id);
  }
}
