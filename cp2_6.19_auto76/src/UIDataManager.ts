export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface HistoryAction {
  type: 'add' | 'remove';
  voxel: VoxelData;
}

export type ToolMode = 'add' | 'remove' | 'select';

export const PRESET_COLORS: string[] = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#92400e',
  '#6b7280',
  '#ffffff',
  '#000000',
];

const MAX_HISTORY = 50;

type ChangeCallback = () => void;

export class UIDataManager {
  private voxels: Map<string, VoxelData> = new Map();
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private currentColor: string = PRESET_COLORS[0];
  private currentMode: ToolMode = 'add';
  private changeCallbacks: ChangeCallback[] = [];
  private suppressNotify: boolean = false;

  private static key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  onChange(cb: ChangeCallback): void {
    this.changeCallbacks.push(cb);
  }

  private notify(): void {
    if (this.suppressNotify) return;
    for (const cb of this.changeCallbacks) {
      cb();
    }
  }

  batch(fn: () => void): void {
    this.suppressNotify = true;
    try {
      fn();
    } finally {
      this.suppressNotify = false;
      this.notify();
    }
  }

  getColor(): string {
    return this.currentColor;
  }

  setColor(color: string): void {
    this.currentColor = color;
  }

  getMode(): ToolMode {
    return this.currentMode;
  }

  setMode(mode: ToolMode): void {
    this.currentMode = mode;
  }

  getAllVoxels(): VoxelData[] {
    return Array.from(this.voxels.values());
  }

  getVoxel(x: number, y: number, z: number): VoxelData | undefined {
    return this.voxels.get(UIDataManager.key(x, y, z));
  }

  hasVoxel(x: number, y: number, z: number): boolean {
    return this.voxels.has(UIDataManager.key(x, y, z));
  }

  addVoxel(x: number, y: number, z: number, color: string, recordHistory: boolean = true): VoxelData | null {
    const key = UIDataManager.key(x, y, z);
    if (this.voxels.has(key)) return null;
    const voxel: VoxelData = { x, y, z, color };
    this.voxels.set(key, voxel);
    if (recordHistory) {
      this.undoStack.push({ type: 'add', voxel: { ...voxel } });
      this.redoStack = [];
      if (this.undoStack.length > MAX_HISTORY) {
        this.undoStack.shift();
      }
    }
    this.notify();
    return voxel;
  }

  removeVoxel(x: number, y: number, z: number, recordHistory: boolean = true): VoxelData | null {
    const key = UIDataManager.key(x, y, z);
    const voxel = this.voxels.get(key);
    if (!voxel) return null;
    this.voxels.delete(key);
    if (recordHistory) {
      this.undoStack.push({ type: 'remove', voxel: { ...voxel } });
      this.redoStack = [];
      if (this.undoStack.length > MAX_HISTORY) {
        this.undoStack.shift();
      }
    }
    this.notify();
    return voxel;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undoCount(): number {
    return this.undoStack.length;
  }

  redoCount(): number {
    return this.redoStack.length;
  }

  undo(): HistoryAction | null {
    const action = this.undoStack.pop();
    if (!action) return null;
    const key = UIDataManager.key(action.voxel.x, action.voxel.y, action.voxel.z);
    if (action.type === 'add') {
      this.voxels.delete(key);
      this.redoStack.push(action);
    } else {
      this.voxels.set(key, { ...action.voxel });
      this.redoStack.push(action);
    }
    this.notify();
    return action;
  }

  redo(): HistoryAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;
    const key = UIDataManager.key(action.voxel.x, action.voxel.y, action.voxel.z);
    if (action.type === 'add') {
      this.voxels.set(key, { ...action.voxel });
      this.undoStack.push(action);
    } else {
      this.voxels.delete(key);
      this.undoStack.push(action);
    }
    this.notify();
    return action;
  }

  exportJSON(): string {
    const data = this.getAllVoxels().map(v => ({
      position: [v.x, v.y, v.z],
      color: v.color,
    }));
    return JSON.stringify({ version: 1, voxels: data }, null, 2);
  }

  importJSON(json: string): VoxelData[] {
    const parsed = JSON.parse(json);
    const imported: VoxelData[] = [];
    if (parsed.voxels && Array.isArray(parsed.voxels)) {
      for (const item of parsed.voxels) {
        const [x, y, z] = item.position;
        const color = item.color;
        const key = UIDataManager.key(x, y, z);
        if (!this.voxels.has(key)) {
          const voxel: VoxelData = { x, y, z, color };
          this.voxels.set(key, voxel);
          imported.push(voxel);
        }
      }
    }
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
    return imported;
  }

  clearAll(): void {
    this.voxels.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }
}
