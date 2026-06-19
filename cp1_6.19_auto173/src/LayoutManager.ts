import { v4 as uuidv4 } from 'uuid';
import type { Furniture, FurniturePosition, FurnitureType, FurnitureSize } from './Parser';

export interface LayoutData {
  version: string;
  createdAt: string;
  furniture: Furniture[];
}

type Listener = (furniture: Furniture[]) => void;

export class LayoutManager {
  private furniture: Furniture[] = [];
  private listeners: Set<Listener> = new Set();

  getFurniture(): Furniture[] {
    return [...this.furniture];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = [...this.furniture];
    this.listeners.forEach(listener => listener(snapshot));
  }

  setFurnitureList(list: Furniture[]): void {
    this.furniture = list.map(f => ({ ...f, id: f.id || uuidv4() }));
    this.notify();
  }

  addFurniture(type: FurnitureType, position: FurniturePosition, size: FurnitureSize): Furniture {
    const newFurniture: Furniture = {
      id: uuidv4(),
      type,
      position: { ...position },
      size: { ...size },
    };
    this.furniture.push(newFurniture);
    this.notify();
    return newFurniture;
  }

  removeFurniture(id: string): boolean {
    const index = this.furniture.findIndex(f => f.id === id);
    if (index === -1) return false;
    this.furniture.splice(index, 1);
    this.notify();
    return true;
  }

  moveFurniture(id: string, newPosition: FurniturePosition): boolean {
    const furniture = this.furniture.find(f => f.id === id);
    if (!furniture) return false;
    furniture.position = { ...newPosition };
    this.notify();
    return true;
  }

  duplicateFurniture(id: string): Furniture | null {
    const original = this.furniture.find(f => f.id === id);
    if (!original) return null;

    const copy: Furniture = {
      id: uuidv4(),
      type: original.type,
      position: {
        x: original.position.x + 0.5,
        y: original.position.y,
        z: original.position.z + 0.5,
      },
      size: { ...original.size },
      rotation: original.rotation,
    };

    this.furniture.push(copy);
    this.notify();
    return copy;
  }

  clearAll(): void {
    this.furniture = [];
    this.notify();
  }

  saveLayout(): LayoutData {
    return {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      furniture: this.getFurniture(),
    };
  }

  loadLayout(data: LayoutData): void {
    if (!data || !Array.isArray(data.furniture)) {
      throw new Error('Invalid layout data');
    }
    this.furniture = data.furniture.map(f => ({
      ...f,
      id: f.id || uuidv4(),
    }));
    this.notify();
  }

  exportToJson(): string {
    return JSON.stringify(this.saveLayout(), null, 2);
  }

  importFromJson(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString) as LayoutData;
      this.loadLayout(data);
    } catch (e) {
      throw new Error('Invalid JSON format');
    }
  }

  downloadLayout(filename: string = 'layout.json'): void {
    const json = this.exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
