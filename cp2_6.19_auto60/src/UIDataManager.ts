export interface VoxelData {
  x: number;
  y: number;
  z: number;
  color: string;
}

export type ToolMode = 'add' | 'remove' | 'select';

interface HistoryAction {
  type: 'add' | 'remove';
  voxel: VoxelData;
}

export const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#a16207',
  '#6b7280',
  '#ffffff',
  '#000000'
];

export class UIDataManager {
  private voxels: Map<string, VoxelData> = new Map();
  private history: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private currentColor: string = PRESET_COLORS[3];
  private currentMode: ToolMode = 'add';
  private readonly MAX_HISTORY = 50;

  private onVoxelAdded?: (voxel: VoxelData, animate: boolean) => void;
  private onVoxelRemoved?: (voxel: VoxelData, animate: boolean) => void;
  private onHistoryChanged?: () => void;
  private onModeChanged?: (mode: ToolMode) => void;
  private onColorChanged?: (color: string) => void;
  private onVoxelSelected?: (voxel: VoxelData) => void;

  constructor() {
    this.setupUI();
    this.setupKeyboardShortcuts();
  }

  setOnVoxelAdded(callback: (voxel: VoxelData, animate: boolean) => void): void {
    this.onVoxelAdded = callback;
  }

  setOnVoxelRemoved(callback: (voxel: VoxelData, animate: boolean) => void): void {
    this.onVoxelRemoved = callback;
  }

  setOnHistoryChanged(callback: () => void): void {
    this.onHistoryChanged = callback;
  }

  setOnModeChanged(callback: (mode: ToolMode) => void): void {
    this.onModeChanged = callback;
  }

  setOnColorChanged(callback: (color: string) => void): void {
    this.onColorChanged = callback;
  }

  setOnVoxelSelected(callback: (voxel: VoxelData) => void): void {
    this.onVoxelSelected = callback;
  }

  getCurrentMode(): ToolMode {
    return this.currentMode;
  }

  getCurrentColor(): string {
    return this.currentColor;
  }

  getVoxelKey(x: number, y: number, z: number): string {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  }

  getVoxel(x: number, y: number, z: number): VoxelData | undefined {
    return this.voxels.get(this.getVoxelKey(x, y, z));
  }

  hasVoxel(x: number, y: number, z: number): boolean {
    return this.voxels.has(this.getVoxelKey(x, y, z));
  }

  getAllVoxels(): VoxelData[] {
    return Array.from(this.voxels.values());
  }

  addVoxel(x: number, y: number, z: number, color?: string, animate: boolean = true): boolean {
    const key = this.getVoxelKey(x, y, z);
    if (this.voxels.has(key)) return false;

    const voxel: VoxelData = {
      x: Math.floor(x),
      y: Math.floor(y),
      z: Math.floor(z),
      color: color || this.currentColor
    };

    this.voxels.set(key, voxel);
    this.pushToHistory({ type: 'add', voxel });

    if (this.onVoxelAdded) {
      this.onVoxelAdded(voxel, animate);
    }

    return true;
  }

  removeVoxel(x: number, y: number, z: number, animate: boolean = true): VoxelData | null {
    const key = this.getVoxelKey(x, y, z);
    const voxel = this.voxels.get(key);

    if (!voxel) return null;

    this.voxels.delete(key);
    this.pushToHistory({ type: 'remove', voxel });

    if (this.onVoxelRemoved) {
      this.onVoxelRemoved(voxel, animate);
    }

    return voxel;
  }

  selectVoxel(x: number, y: number, z: number): void {
    const voxel = this.getVoxel(x, y, z);
    if (voxel) {
      this.setCurrentColor(voxel.color);
      if (this.onVoxelSelected) {
        this.onVoxelSelected(voxel);
      }
      this.showToast(`已选取颜色: ${voxel.color}`);
    }
  }

  setCurrentColor(color: string): void {
    this.currentColor = color;
    this.updateColorPaletteUI();
    if (this.onColorChanged) {
      this.onColorChanged(color);
    }
  }

  setMode(mode: ToolMode): void {
    this.currentMode = mode;
    this.updateModeButtonsUI();
    this.updateCursor();
    if (this.onModeChanged) {
      this.onModeChanged(mode);
    }
  }

  undo(): void {
    const action = this.history.pop();
    if (!action) return;

    this.redoStack.push(action);

    if (action.type === 'add') {
      const voxel = action.voxel;
      this.voxels.delete(this.getVoxelKey(voxel.x, voxel.y, voxel.z));
      if (this.onVoxelRemoved) {
        this.onVoxelRemoved(voxel, true);
      }
    } else {
      const voxel = action.voxel;
      this.voxels.set(this.getVoxelKey(voxel.x, voxel.y, voxel.z), voxel);
      if (this.onVoxelAdded) {
        this.onVoxelAdded(voxel, true);
      }
    }

    this.notifyHistoryChanged();
  }

  redo(): void {
    const action = this.redoStack.pop();
    if (!action) return;

    this.history.push(action);

    if (action.type === 'add') {
      const voxel = action.voxel;
      this.voxels.set(this.getVoxelKey(voxel.x, voxel.y, voxel.z), voxel);
      if (this.onVoxelAdded) {
        this.onVoxelAdded(voxel, true);
      }
    } else {
      const voxel = action.voxel;
      this.voxels.delete(this.getVoxelKey(voxel.x, voxel.y, voxel.z));
      if (this.onVoxelRemoved) {
        this.onVoxelRemoved(voxel, true);
      }
    }

    this.notifyHistoryChanged();
  }

  getUndoCount(): number {
    return this.history.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }

  exportToJSON(): string {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      voxels: this.getAllVoxels()
    };
    return JSON.stringify(data, null, 2);
  }

  async importFromJSON(jsonString: string): Promise<void> {
    try {
      const data = JSON.parse(jsonString);
      if (!data.voxels || !Array.isArray(data.voxels)) {
        throw new Error('无效的地形数据格式');
      }

      this.clearAll(true);

      const voxelsByY = new Map<number, VoxelData[]>();
      for (const voxel of data.voxels) {
        const y = Math.floor(voxel.y);
        if (!voxelsByY.has(y)) {
          voxelsByY.set(y, []);
        }
        voxelsByY.get(y)!.push(voxel);
      }

      const sortedY = Array.from(voxelsByY.keys()).sort((a, b) => a - b);

      for (const y of sortedY) {
        const layerVoxels = voxelsByY.get(y)!;
        for (const voxel of layerVoxels) {
          const key = this.getVoxelKey(voxel.x, voxel.y, voxel.z);
          if (!this.voxels.has(key)) {
            this.voxels.set(key, {
              x: Math.floor(voxel.x),
              y: Math.floor(voxel.y),
              z: Math.floor(voxel.z),
              color: voxel.color
            });
            if (this.onVoxelAdded) {
              this.onVoxelAdded(this.voxels.get(key)!, false);
            }
          }
        }
        await this.delay(20);
      }

      this.history = [];
      this.redoStack = [];
      this.notifyHistoryChanged();
      this.showToast(`成功导入 ${data.voxels.length} 个像素块`);
    } catch (error) {
      console.error('导入失败:', error);
      this.showToast('导入失败: ' + (error as Error).message);
      throw error;
    }
  }

  clearAll(silent: boolean = false): void {
    const allVoxels = this.getAllVoxels();
    for (const voxel of allVoxels) {
      if (!silent && this.onVoxelRemoved) {
        this.onVoxelRemoved(voxel, false);
      }
    }
    this.voxels.clear();
    if (!silent) {
      this.history = [];
      this.redoStack = [];
      this.notifyHistoryChanged();
    }
  }

  private pushToHistory(action: HistoryAction): void {
    this.history.push(action);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    }
    this.redoStack = [];
    this.notifyHistoryChanged();
  }

  private notifyHistoryChanged(): void {
    this.updateHistoryButtonsUI();
    if (this.onHistoryChanged) {
      this.onHistoryChanged();
    }
  }

  private setupUI(): void {
    this.setupColorPalette();
    this.setupModeButtons();
    this.setupHistoryButtons();
    this.setupExportImportButtons();
  }

  private setupColorPalette(): void {
    const palette = document.getElementById('color-palette');
    if (!palette) return;

    palette.innerHTML = '';
    PRESET_COLORS.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      if (index === 3) swatch.classList.add('selected');
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.title = color;
      swatch.addEventListener('click', () => {
        this.setCurrentColor(color);
      });
      palette.appendChild(swatch);
    });
  }

  private setupModeButtons(): void {
    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach(btn => {
      const htmlBtn = btn as HTMLElement;
      htmlBtn.addEventListener('click', () => {
        const mode = htmlBtn.dataset.mode as ToolMode;
        if (mode) {
          this.setMode(mode);
        }
      });
    });
  }

  private setupHistoryButtons(): void {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', () => this.redo());
    }
  }

  private setupExportImportButtons(): void {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExport());
    }

    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleImport(e));
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
        return;
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.redo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'a':
          this.setMode('add');
          break;
        case 'd':
          this.setMode('remove');
          break;
        case 's':
          this.setMode('select');
          break;
      }
    });
  }

  private updateColorPaletteUI(): void {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
      const htmlSwatch = swatch as HTMLElement;
      if (htmlSwatch.dataset.color === this.currentColor) {
        htmlSwatch.classList.add('selected');
      } else {
        htmlSwatch.classList.remove('selected');
      }
    });
  }

  private updateModeButtonsUI(): void {
    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach(btn => {
      const htmlBtn = btn as HTMLElement;
      if (htmlBtn.dataset.mode === this.currentMode) {
        htmlBtn.classList.add('active');
      } else {
        htmlBtn.classList.remove('active');
      }
    });
  }

  private updateHistoryButtonsUI(): void {
    const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
    const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
    const undoCount = document.getElementById('undo-count');
    const redoCount = document.getElementById('redo-count');

    if (undoBtn) {
      undoBtn.disabled = this.history.length === 0;
    }
    if (redoBtn) {
      redoBtn.disabled = this.redoStack.length === 0;
    }
    if (undoCount) {
      undoCount.textContent = this.history.length.toString();
    }
    if (redoCount) {
      redoCount.textContent = this.redoStack.length.toString();
    }
  }

  private updateCursor(): void {
    const body = document.body;
    switch (this.currentMode) {
      case 'add':
        body.style.cursor = 'crosshair';
        break;
      case 'remove':
        body.style.cursor = 'not-allowed';
        break;
      case 'select':
        body.style.cursor = 'pointer';
        break;
      default:
        body.style.cursor = 'default';
    }
  }

  private async handleExport(): Promise<void> {
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    if (!exportBtn) return;

    const icon = exportBtn.querySelector('.btn-icon');
    const text = exportBtn.querySelector('span:not(.btn-icon)');

    exportBtn.classList.add('loading');
    if (icon) icon.textContent = '⟳';

    await this.delay(1000);

    const jsonData = this.exportToJSON();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `terrain_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    exportBtn.classList.remove('loading');
    exportBtn.classList.add('success');
    if (icon) icon.textContent = '✓';
    if (text) text.textContent = '导出成功';

    this.showToast('地形已导出为 JSON 文件');

    await this.delay(2000);

    exportBtn.classList.remove('success');
    if (icon) icon.textContent = '⬇';
    if (text) text.textContent = '导出 JSON';
  }

  private async handleImport(e: Event): Promise<void> {
    const fileInput = e.target as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      await this.importFromJSON(text);
    } catch (error) {
      console.error('读取文件失败:', error);
    } finally {
      fileInput.value = '';
    }
  }

  showToast(message: string): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
