import * as dat from 'dat.gui';
import { DisplayMode, MoleculeData } from '@/types';
import { parsePDB, WATER_PDB, BENZENE_PDB } from '@/utils/pdbParser';

export interface UIControllerCallbacks {
  onLoadMolecule: (moleculeId: 'mol1' | 'mol2', data: MoleculeData) => void;
  onRemoveMolecule: (moleculeId: 'mol1' | 'mol2') => void;
  onSwitchDisplayMode: (moleculeId: 'mol1' | 'mol2', mode: DisplayMode) => void;
  onToggleDiffHighlight: (visible: boolean) => void;
  onThresholdChange: (threshold: number) => void;
  onRecalculateAlignment: () => void;
}

export class UIController {
  private gui: dat.GUI;
  private callbacks: UIControllerCallbacks;
  private settings: {
    mol1Pdb: string;
    mol2Pdb: string;
    mol1Name: string;
    mol2Name: string;
    mol1Mode: DisplayMode;
    mol2Mode: DisplayMode;
    activeMolecule: 'mol1' | 'mol2';
    showDiffHighlight: boolean;
    rmsdThreshold: number;
  };
  private mol1Folder: dat.GUI;
  private mol2Folder: dat.GUI;
  private controlsFolder: dat.GUI;

  constructor(container: HTMLElement, callbacks: UIControllerCallbacks) {
    this.callbacks = callbacks;
    
    this.settings = {
      mol1Pdb: WATER_PDB,
      mol2Pdb: BENZENE_PDB,
      mol1Name: 'H2O (水)',
      mol2Name: 'C6H6 (苯)',
      mol1Mode: 'stick',
      mol2Mode: 'stick',
      activeMolecule: 'mol1',
      showDiffHighlight: true,
      rmsdThreshold: 0.5,
    };

    this.gui = new dat.GUI({ autoPlace: false, width: 380 });
    container.appendChild(this.gui.domElement);
    this.applyDarkTheme();

    this.mol1Folder = this.gui.addFolder('📊 分子 1');
    this.mol2Folder = this.gui.addFolder('📊 分子 2');
    this.controlsFolder = this.gui.addFolder('⚙️ 控制面板');

    this.setupMoleculeFolder(this.mol1Folder, 'mol1');
    this.setupMoleculeFolder(this.mol2Folder, 'mol2');
    this.setupControlsFolder();

    this.mol1Folder.open();
    this.mol2Folder.open();
    this.controlsFolder.open();
  }

  private applyDarkTheme(): void {
    const style = document.createElement('style');
    style.textContent = `
      .dg {
        background-color: #334155 !important;
        color: #E2E8F0 !important;
        border-radius: 8px !important;
      }
      .dg .main {
        background-color: #334155 !important;
      }
      .dg .folder {
        background-color: #334155 !important;
      }
      .dg .cr {
        background-color: #334155 !important;
        color: #E2E8F0 !important;
        border-bottom: 1px solid #475569 !important;
      }
      .dg .cr:hover {
        background-color: #475569 !important;
      }
      .dg .cr .property-name {
        color: #E2E8F0 !important;
        font-size: 12px !important;
      }
      .dg .cr input[type="number"],
      .dg .cr input[type="text"] {
        background-color: #475569 !important;
        color: #E2E8F0 !important;
        border: 1px solid #64748B !important;
        border-radius: 4px !important;
        font-size: 12px !important;
      }
      .dg .cr input[type="text"] {
        width: 100% !important;
        font-family: monospace !important;
        font-size: 10px !important;
        padding: 4px !important;
      }
      .dg .slider {
        background-color: #475569 !important;
        border-radius: 4px !important;
      }
      .dg .slider-fg {
        background-color: #60A5FA !important;
        border-radius: 4px !important;
      }
      .dg .cr select {
        background-color: #475569 !important;
        color: #E2E8F0 !important;
        border: 1px solid #64748B !important;
        border-radius: 4px !important;
        font-size: 12px !important;
      }
      .dg .cr .boolean-checkbox {
        background-color: #60A5FA !important;
        border: 1px solid #60A5FA !important;
        border-radius: 4px !important;
      }
      .dg .cr.function {
        background-color: #3B82F6 !important;
        border-radius: 6px !important;
        margin: 8px 4px !important;
        padding: 6px 12px !important;
        text-align: center !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }
      .dg .cr.function:hover {
        background-color: #2563EB !important;
        transform: translateY(-1px) !important;
      }
      .dg .cr.function .property-name {
        color: #FFFFFF !important;
        width: 100% !important;
        text-align: center !important;
      }
      .dg .close-button {
        background-color: #EF4444 !important;
        color: #FFFFFF !important;
      }
      .dg .title {
        background-color: #1E293B !important;
        color: #E2E8F0 !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        padding: 8px 12px !important;
      }
    `;
    document.head.appendChild(style);
  }

  private setupMoleculeFolder(folder: dat.GUI, moleculeId: 'mol1' | 'mol2'): void {
    const isMol1 = moleculeId === 'mol1';
    const nameKey = isMol1 ? 'mol1Name' : 'mol2Name';
    const pdbKey = isMol1 ? 'mol1Pdb' : 'mol2Pdb';
    const modeKey = isMol1 ? 'mol1Mode' : 'mol2Mode';

    folder.add(this.settings, nameKey)
      .name('分子名称')
      .listen();

    folder.add(this.settings, pdbKey)
      .name('PDB 数据')
      .onChange(() => {
        this.loadMolecule(moleculeId);
      });

    folder.add(this.settings, modeKey, ['wireframe', 'stick'] as DisplayMode[])
      .name('显示模式')
      .onChange((value: DisplayMode) => {
        this.callbacks.onSwitchDisplayMode(moleculeId, value);
      });

    const loadButton = {
      [`加载${isMol1 ? '分子1' : '分子2'}`]: () => this.loadMolecule(moleculeId),
    };
    folder.add(loadButton, Object.keys(loadButton)[0])
      .name('🔄 重新加载');

    const removeButton = {
      [`移除${isMol1 ? '分子1' : '分子2'}`]: () => this.removeMolecule(moleculeId),
    };
    folder.add(removeButton, Object.keys(removeButton)[0])
      .name('❌ 移除分子');

    const presetButtons = {
      '加载水分子 (H2O)': () => {
        this.settings[pdbKey as 'mol1Pdb' | 'mol2Pdb'] = WATER_PDB;
        this.settings[nameKey as 'mol1Name' | 'mol2Name'] = 'H2O (水)';
        this.loadMolecule(moleculeId);
        this.updateDisplay();
      },
      '加载苯分子 (C6H6)': () => {
        this.settings[pdbKey as 'mol1Pdb' | 'mol2Pdb'] = BENZENE_PDB;
        this.settings[nameKey as 'mol1Name' | 'mol2Name'] = 'C6H6 (苯)';
        this.loadMolecule(moleculeId);
        this.updateDisplay();
      },
    };
    folder.add(presetButtons, '加载水分子 (H2O)').name('💧 预设: 水');
    folder.add(presetButtons, '加载苯分子 (C6H6)').name('💎 预设: 苯');
  }

  private setupControlsFolder(): void {
    this.controlsFolder.add(this.settings, 'activeMolecule', ['mol1', 'mol2'] as const)
      .name('激活分子')
      .onChange((value: 'mol1' | 'mol2') => {
      });

    this.controlsFolder.add(this.settings, 'showDiffHighlight')
      .name('显示差异高亮')
      .onChange((value: boolean) => {
        this.callbacks.onToggleDiffHighlight(value);
      });

    this.controlsFolder.add(this.settings, 'rmsdThreshold', 0.1, 2.0, 0.1)
      .name('RMSD 阈值 (Å)')
      .onChange((value: number) => {
        this.callbacks.onThresholdChange(value);
      });

    const recalculateButton = {
      '重新计算比对': () => this.callbacks.onRecalculateAlignment(),
    };
    this.controlsFolder.add(recalculateButton, '重新计算比对')
      .name('🧮 重新计算');

    const resetViewButton = {
      '重置视角': () => this.resetView(),
    };
    this.controlsFolder.add(resetViewButton, '重置视角')
      .name('🔄 重置视角');
  }

  private loadMolecule(moleculeId: 'mol1' | 'mol2'): void {
    const isMol1 = moleculeId === 'mol1';
    const pdbKey = isMol1 ? 'mol1Pdb' : 'mol2Pdb';
    const nameKey = isMol1 ? 'mol1Name' : 'mol2Name';

    try {
      this.showLoading(true);
      setTimeout(() => {
        try {
          const pdbText = this.settings[pdbKey as 'mol1Pdb' | 'mol2Pdb'];
          const name = this.settings[nameKey as 'mol1Name' | 'mol2Name'];
          const data = parsePDB(pdbText, name);
          
          if (data.atoms.length === 0) {
            alert('PDB 解析失败：未找到任何原子');
            this.showLoading(false);
            return;
          }
          
          this.callbacks.onLoadMolecule(moleculeId, data);
          this.showLoading(false);
        } catch (error) {
          console.error('PDB 解析错误:', error);
          alert(`PDB 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
          this.showLoading(false);
        }
      }, 50);
    } catch (error) {
      console.error('加载分子失败:', error);
      this.showLoading(false);
    }
  }

  private removeMolecule(moleculeId: 'mol1' | 'mol2'): void {
    this.callbacks.onRemoveMolecule(moleculeId);
  }

  private resetView(): void {
    window.dispatchEvent(new CustomEvent('resetView'));
  }

  private showLoading(show: boolean): void {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      if (show) {
        loadingIndicator.classList.remove('hidden');
      } else {
        loadingIndicator.classList.add('hidden');
      }
    }
  }

  private updateDisplay(): void {
    for (const folder of [this.mol1Folder, this.mol2Folder]) {
      folder.__controllers.forEach((ctrl: any) => {
        ctrl.updateDisplay();
      });
    }
  }

  getSettings() {
    return this.settings;
  }

  setMoleculePdb(moleculeId: 'mol1' | 'mol2', pdb: string): void {
    if (moleculeId === 'mol1') {
      this.settings.mol1Pdb = pdb;
    } else {
      this.settings.mol2Pdb = pdb;
    }
    this.updateDisplay();
  }

  setMoleculeName(moleculeId: 'mol1' | 'mol2', name: string): void {
    if (moleculeId === 'mol1') {
      this.settings.mol1Name = name;
    } else {
      this.settings.mol2Name = name;
    }
    this.updateDisplay();
  }

  setDisplayMode(moleculeId: 'mol1' | 'mol2', mode: DisplayMode): void {
    if (moleculeId === 'mol1') {
      this.settings.mol1Mode = mode;
    } else {
      this.settings.mol2Mode = mode;
    }
    this.updateDisplay();
  }

  setDiffHighlightVisible(visible: boolean): void {
    this.settings.showDiffHighlight = visible;
    this.updateDisplay();
  }

  setThreshold(threshold: number): void {
    this.settings.rmsdThreshold = threshold;
    this.updateDisplay();
  }

  dispose(): void {
    this.gui.destroy();
  }

  loadDefaultMolecules(): void {
    this.loadMolecule('mol1');
    this.loadMolecule('mol2');
  }
}
