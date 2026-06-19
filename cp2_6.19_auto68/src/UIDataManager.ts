export type ToolMode = 'add' | 'remove' | 'select';

export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface HistoryAction {
  type: 'add' | 'remove';
  voxels: VoxelData[];
}

export const PRESET_COLORS: string[] = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
  '#92400e',
  '#6b7280',
  '#ffffff',
  '#000000'
];

const MAX_HISTORY = 50;

export class UIDataManager {
  private voxels: Map<string, VoxelData> = new Map();
  private undoStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private currentColor: string = PRESET_COLORS[0];
  private currentMode: ToolMode = 'add';

  private onVoxelsChange?: () => void;
  private onModeChange?: (mode: ToolMode) => void;
  private onColorChange?: (color: string) => void;
  private onHistoryChange?: () => void;
  private onToast?: (message: string) => void;

  constructor() {
    this.initUI();
    this.initKeyboardShortcuts();
  }

  setVoxelsChangeCallback(cb: () => void): void {
    this.onVoxelsChange = cb;
  }

  setModeChangeCallback(cb: (mode: ToolMode) => void): void {
    this.onModeChange = cb;
  }

  setColorChangeCallback(cb: (color: string) => void): void {
    this.onColorChange = cb;
  }

  setHistoryChangeCallback(cb: () => void): void {
    this.onHistoryChange = cb;
  }

  setToastCallback(cb: (message: string) => void): void {
    this.onToast = cb;
  }

  private toast(message: string): void {
    if (this.onToast) this.onToast(message);
  }

  private getVoxelKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  getAllVoxels(): VoxelData[] {
    return Array.from(this.voxels.values());
  }

  hasVoxel(x: number, y: number, z: number): boolean {
    return this.voxels.has(this.getVoxelKey(x, y, z));
  }

  getVoxel(x: number, y: number, z: number): VoxelData | undefined {
    return this.voxels.get(this.getVoxelKey(x, y, z));
  }

  getCurrentColor(): string {
    return this.currentColor;
  }

  getCurrentMode(): ToolMode {
    return this.currentMode;
  }

  addVoxel(x: number, y: number, z: number, color: string, recordHistory: boolean = true): VoxelData | null {
    const key = this.getVoxelKey(x, y, z);
    if (this.voxels.has(key)) return null;

    const voxel: VoxelData = { x, y, z, color };
    this.voxels.set(key, voxel);

    if (recordHistory) {
      this.pushHistory({ type: 'add', voxels: [voxel] });
    }

    this.notifyVoxelsChange();
    return voxel;
  }

  removeVoxel(x: number, y: number, z: number, recordHistory: boolean = true): VoxelData | null {
    const key = this.getVoxelKey(x, y, z);
    const voxel = this.voxels.get(key);
    if (!voxel) return null;

    this.voxels.delete(key);

    if (recordHistory) {
      this.pushHistory({ type: 'remove', voxels: [voxel] });
    }

    this.notifyVoxelsChange();
    return voxel;
  }

  private pushHistory(action: HistoryAction): void {
    this.undoStack.push(action);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notifyHistoryChange();
  }

  private notifyVoxelsChange(): void {
    if (this.onVoxelsChange) this.onVoxelsChange();
  }

  private notifyHistoryChange(): void {
    if (this.onHistoryChange) this.onHistoryChange();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }

  undo(): HistoryAction | null {
    if (!this.canUndo()) return null;
    const action = this.undoStack.pop()!;
    this.redoStack.push(action);

    if (action.type === 'add') {
      for (const v of action.voxels) {
        this.removeVoxel(v.x, v.y, v.z, false);
      }
      this.toast('已撤销添加');
    } else {
      for (const v of action.voxels) {
        this.addVoxel(v.x, v.y, v.z, v.color, false);
      }
      this.toast('已撤销移除');
    }

    this.notifyHistoryChange();
    this.notifyVoxelsChange();
    return action;
  }

  redo(): HistoryAction | null {
    if (!this.canRedo()) return null;
    const action = this.redoStack.pop()!;
    this.undoStack.push(action);

    if (action.type === 'add') {
      for (const v of action.voxels) {
        this.addVoxel(v.x, v.y, v.z, v.color, false);
      }
      this.toast('已重做添加');
    } else {
      for (const v of action.voxels) {
        this.removeVoxel(v.x, v.y, v.z, false);
      }
      this.toast('已重做移除');
    }

    this.notifyHistoryChange();
    this.notifyVoxelsChange();
    return action;
  }

  setMode(mode: ToolMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    if (this.onModeChange) this.onModeChange(mode);
    this.updateModeButtons();
  }

  setColor(color: string): void {
    this.currentColor = color;
    if (this.onColorChange) this.onColorChange(color);
    this.updateColorSwatches();
  }

  private initUI(): void {
    this.initColorPanel();
    this.initModeButtons();
    this.initHistoryButtons();
    this.initExportImportButtons();
  }

  private initColorPanel(): void {
    const panel = document.getElementById('color-panel');
    if (!panel) return;

    panel.innerHTML = '';
    PRESET_COLORS.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (index === 0 ? ' active' : '');
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.title = color;
      swatch.addEventListener('click', () => {
        this.setColor(color);
      });
      panel.appendChild(swatch);
    });
  }

  private updateColorSwatches(): void {
    const swatches = document.querySelectorAll<HTMLElement>('.color-swatch');
    swatches.forEach((sw) => {
      if (sw.dataset.color === this.currentColor) {
        sw.classList.add('active');
      } else {
        sw.classList.remove('active');
      }
    });
  }

  private initModeButtons(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.mode-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as ToolMode;
        if (mode) this.setMode(mode);
      });
    });
  }

  private updateModeButtons(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.mode-btn');
    buttons.forEach((btn) => {
      if (btn.dataset.mode === this.currentMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private initHistoryButtons(): void {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this.redo());
    }
    this.updateHistoryButtons();
  }

  updateHistoryButtons(): void {
    const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;
    const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null;
    const undoCount = document.getElementById('undo-count');
    const redoCount = document.getElementById('redo-count');

    if (undoBtn) undoBtn.disabled = !this.canUndo();
    if (redoBtn) redoBtn.disabled = !this.canRedo();
    if (undoCount) undoCount.textContent = String(this.getUndoCount());
    if (redoCount) redoCount.textContent = String(this.getRedoCount());
  }

  private initKeyboardShortcuts(): void {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this.undo();
        } else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y')) {
          e.preventDefault();
          this.redo();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'a') this.setMode('add');
      else if (key === 'd') this.setMode('remove');
      else if (key === 's') this.setMode('select');
    });
  }

  private initExportImportButtons(): void {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('file-input') as HTMLInputElement | null;

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportJSON());
    }
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          this.importJSON(target.files[0]);
          target.value = '';
        }
      });
    }
  }

  private exportJSON(): void {
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement | null;
    const exportIcon = document.getElementById('export-icon');
    const exportText = document.getElementById('export-text');

    if (!exportBtn || !exportIcon || !exportText) return;

    exportBtn.disabled = true;
    exportIcon.innerHTML = '<div class="spinner"></div>';
    exportText.textContent = '导出中...';

    setTimeout(() => {
      const data = this.getAllVoxels();
      const json = JSON.stringify({ voxels: data }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terrain_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      exportIcon.textContent = '✓';
      exportText.textContent = '已导出';
      this.toast('地形导出成功！');

      setTimeout(() => {
        exportIcon.textContent = '⬇';
        exportText.textContent = '导出 JSON';
        exportBtn.disabled = false;
      }, 1000);
    }, 1000);
  }

  private async importJSON(file: File): Promise<void> {
    const importBtn = document.getElementById('import-btn') as HTMLButtonElement | null;
    const importText = document.getElementById('import-text');

    if (!importBtn || !importText) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.voxels || !Array.isArray(data.voxels)) {
        throw new Error('无效的地形文件格式');
      }

      importBtn.disabled = true;
      importText.textContent = '导入中...';

      this.voxels.clear();
      this.undoStack = [];
      this.redoStack = [];
      this.notifyVoxelsChange();
      this.notifyHistoryChange();

      const sorted = [...data.voxels].sort((a, b) => a.y - b.y);
      const layers: Map<number, VoxelData[]> = new Map();

      for (const v of sorted) {
        if (!layers.has(v.y)) layers.set(v.y, []);
        layers.get(v.y)!.push(v);
      }

      const layerYs = Array.from(layers.keys()).sort((a, b) => a - b);
      const allImported: VoxelData[] = [];

      for (let i = 0; i < layerYs.length; i++) {
        const y = layerYs[i];
        const layerVoxels = layers.get(y)!;
        for (const v of layerVoxels) {
          this.voxels.set(this.getVoxelKey(v.x, v.y, v.z), v);
          allImported.push(v);
        }
        this.notifyVoxelsChange();
        await new Promise((res) => setTimeout(res, 20));
      }

      this.pushHistory({ type: 'add', voxels: allImported });
      this.toast(`成功导入 ${allImported.length} 个体素`);

      importText.textContent = '导入';
      importBtn.disabled = false;
    } catch (err) {
      this.toast('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
      importText.textContent = '导入';
      importBtn.disabled = false;
    }
  }
}
