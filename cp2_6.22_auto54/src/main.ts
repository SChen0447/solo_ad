import './style.css';
import { SceneManager, HoverInfo } from '@/renderer/SceneManager';
import { AlignAnalyzer } from '@/analysis/AlignAnalyzer';
import { ChartRenderer } from '@/analysis/ChartRenderer';
import { UIController } from '@/controls/UIController';
import { MoleculeData, DisplayMode, AlignmentResult } from '@/types';

class MoleculeVisualizerApp {
  private sceneManager: SceneManager;
  private alignAnalyzer: AlignAnalyzer;
  private chartRenderer: ChartRenderer;
  private uiController: UIController;
  
  private moleculeMap: Map<'mol1' | 'mol2', string | null>;
  private currentAlignment: AlignmentResult | null;
  private isPanelCollapsed: boolean;
  private isDragging: boolean;
  private dragStartY: number;
  private panelStartHeight: number;
  private readonly MOBILE_BREAKPOINT = 1024;

  constructor() {
    this.moleculeMap = new Map([
      ['mol1', null],
      ['mol2', null],
    ]);
    this.currentAlignment = null;
    this.isPanelCollapsed = false;
    this.isDragging = false;
    this.dragStartY = 0;
    this.panelStartHeight = 200;

    this.init();
  }

  private init(): void {
    const sceneContainer = document.getElementById('scene-container');
    const guiContainer = document.getElementById('gui-container');

    if (!sceneContainer || !guiContainer) {
      console.error('缺少必要的DOM元素');
      return;
    }

    this.sceneManager = new SceneManager(sceneContainer!);
    this.alignAnalyzer = new AlignAnalyzer();
    this.chartRenderer = new ChartRenderer({
      barChartSelector: '#bar-chart',
      gaugeChartSelector: '#gauge-chart',
      onBarClick: (atomIndex: number) => {
        this.handleBarClick(atomIndex);
      },
    });

    this.uiController = new UIController(guiContainer!, {
      onLoadMolecule: (moleculeId, data) => this.handleLoadMolecule(moleculeId, data),
      onRemoveMolecule: (moleculeId) => this.handleRemoveMolecule(moleculeId),
      onSwitchDisplayMode: (moleculeId, mode) => this.handleSwitchDisplayMode(moleculeId, mode),
      onToggleDiffHighlight: (visible) => this.handleToggleDiffHighlight(visible),
      onThresholdChange: (threshold) => this.handleThresholdChange(threshold),
      onRecalculateAlignment: () => this.handleRecalculateAlignment(),
    });

    this.setupSceneCallbacks();
    this.setupEventListeners();
    this.setupResponsiveLayout();
    this.chartRenderer.clearCharts();

    setTimeout(() => {
      this.uiController.loadDefaultMolecules();
    }, 100);
  }

  private setupSceneCallbacks(): void {
    this.sceneManager.setOnHoverCallback((info: HoverInfo | null) => {
      this.updateAtomInfo(info);
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
    
    window.addEventListener('resetView', () => {
      this.resetView();
    });

    const panelHandle = document.getElementById('panel-handle');
    const panelToggle = document.getElementById('panel-toggle');
    const rightPanel = document.getElementById('right-panel');

    if (panelHandle) {
      panelHandle.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.dragStartY = e.clientY;
        this.panelStartHeight = rightPanel!.offsetHeight;
        e.preventDefault();
      });
    }

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging && rightPanel) {
        const deltaY = this.dragStartY - e.clientY;
        const newHeight = Math.max(24, Math.min(window.innerHeight * 0.8, this.panelStartHeight + deltaY);
        rightPanel.style.flexBasis = `${newHeight}px`;
        rightPanel.style.height = `${newHeight}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    if (panelToggle) {
      panelToggle.addEventListener('click', () => {
        this.togglePanel();
      });
    }

    if (panelHandle) {
      panelHandle.addEventListener('click', (e) => {
        if (!this.isDragging) return;
        this.togglePanel();
      });
    }
  }

  private setupResponsiveLayout(): void {
    this.handleResize();
  }

  private handleLoadMolecule(moleculeId: 'mol1' | 'mol2', data: MoleculeData): void {
    const existingId = this.moleculeMap.get(moleculeId);
    if (existingId) {
      this.sceneManager.removeMolecule(existingId);
    }

    const mode: DisplayMode = moleculeId === 'mol1' 
      ? this.uiController.getSettings().mol1Mode 
      : this.uiController.getSettings().mol2Mode;

    const newId = this.sceneManager.addMolecule(data, mode);
    this.moleculeMap.set(moleculeId, newId);

    this.tryAlignMolecules();
  }

  private handleRemoveMolecule(moleculeId: 'mol1' | 'mol2'): void {
    const id = this.moleculeMap.get(moleculeId);
    if (id) {
      this.sceneManager.removeMolecule(id);
      this.moleculeMap.set(moleculeId, null);
    }

    this.currentAlignment = null;
    this.chartRenderer.update(null);
    this.sceneManager.clearDiffMarkers();
  }

  private async handleSwitchDisplayMode(moleculeId: 'mol1' | 'mol2', mode: DisplayMode): Promise<void> {
    const id = this.moleculeMap.get(moleculeId);
    if (id) {
      await this.sceneManager.switchDisplayMode(id, mode);
    }
  }

  private handleToggleDiffHighlight(visible: boolean): void {
    this.sceneManager.setDiffHighlightVisible(visible);
  }

  private handleThresholdChange(threshold: number): void {
    this.alignAnalyzer.setThreshold(threshold);
    this.tryAlignMolecules();
  }

  private handleRecalculateAlignment(): void {
    this.tryAlignMolecules();
  }

  private handleBarClick(atomIndex: number): void {
    this.sceneManager.triggerFastBlink(atomIndex, 2000);
    this.chartRenderer.highlightBar(atomIndex);
  }

  private tryAlignMolecules(): void {
    const mol1Id = this.moleculeMap.get('mol1');
    const mol2Id = this.moleculeMap.get('mol2');

    if (!mol1Id || !mol2Id) {
      this.currentAlignment = null;
      this.chartRenderer.update(null);
      this.sceneManager.clearDiffMarkers();
      return;
    }

    const data1 = this.sceneManager.getMoleculeData(mol1Id);
    const data2 = this.sceneManager.getMoleculeData(mol2Id);

    if (!data1 || !data2) {
      this.currentAlignment = null;
      this.chartRenderer.update(null);
      return;
    }

    const coords1 = this.alignAnalyzer.atomsToCoords(data1.atoms);
    const coords2 = this.alignAnalyzer.atomsToCoords(data2.atoms);

    this.currentAlignment = this.alignAnalyzer.align(coords1, coords2);
    
    this.chartRenderer.update(this.currentAlignment);
    this.sceneManager.updateDiffMarkers(this.currentAlignment, mol2Id);
  }

  private updateAtomInfo(info: HoverInfo | null): void {
    const atomInfoElement = document.getElementById('atom-info');
    if (!atomInfoElement) return;

    if (info) {
      atomInfoElement.innerHTML = `
        <div><strong>${info.atomType}</strong> - ${info.moleculeName}</div>
        <div style="margin-top: 4px; color: #94A3B8; font-size: 12px;">
          X: ${info.x.toFixed(3)} Å | Y: ${info.y.toFixed(3)} Å | Z: ${info.z.toFixed(3)} Å
        </div>
      `;
      atomInfoElement.classList.remove('hidden');
    } else {
      atomInfoElement.classList.add('hidden');
    }
  }

  private handleResize(): void {
    const sceneContainer = document.getElementById('scene-container');
    const rightPanel = document.getElementById('right-panel');
    const panelHandle = document.getElementById('panel-handle');
    const panelToggle = document.getElementById('panel-toggle');

    if (!sceneContainer || !rightPanel) return;

    const width = window.innerWidth;
    const isMobile = width <= this.MOBILE_BREAKPOINT;

    if (isMobile) {
      rightPanel.style.flexBasis = `${this.panelStartHeight}px`;
      rightPanel.style.height = `${this.panelStartHeight}px`;
      rightPanel.style.position = 'absolute';
      rightPanel.style.bottom = '0';
      rightPanel.style.left = '0';
      rightPanel.style.right = '0';
      rightPanel.style.flex = 'none';
      rightPanel.style.width = '100%';
      
      panelHandle?.classList.remove('hidden');
      panelToggle?.classList.remove('hidden');
      
      sceneContainer.style.flex = '1';
      sceneContainer.style.width = '100%';
      sceneContainer.style.height = `calc(100% - ${this.panelStartHeight}px)`;
      sceneContainer.style.flexBasis = 'auto';
      
      const chartWidth = Math.min(420, width - 32);
      this.chartRenderer.resize(chartWidth, 280);
    } else {
      rightPanel.style.flexBasis = '420px';
      rightPanel.style.height = '100%';
      rightPanel.style.position = 'relative';
      rightPanel.style.bottom = 'auto';
      rightPanel.style.left = 'auto';
      rightPanel.style.right = 'auto';
      rightPanel.style.width = '420px';
      rightPanel.style.flex = '0 0 420px';
      rightPanel.classList.remove('collapsed');
      
      panelHandle?.classList.add('hidden');
      panelToggle?.classList.add('hidden');
      
      sceneContainer.style.flex = '0 0 70%';
      sceneContainer.style.width = '70%';
      sceneContainer.style.height = '100%';
      sceneContainer.style.flexBasis = '70%';
      
      this.chartRenderer.resize(420, 320);
    }

    const rect = sceneContainer.getBoundingClientRect();
    this.sceneManager.resize(rect.width, rect.height);
  }

  private togglePanel(): void {
    const rightPanel = document.getElementById('right-panel');
    if (!rightPanel) return;

    this.isPanelCollapsed = !this.isPanelCollapsed;
    
    if (this.isPanelCollapsed) {
      rightPanel.classList.add('collapsed');
    } else {
      rightPanel.classList.remove('collapsed');
    }
  }

  private resetView(): void {
    const mol1Id = this.moleculeMap.get('mol1');
    const mol2Id = this.moleculeMap.get('mol2');
    
    this.sceneManager.clearDiffMarkers();
    this.tryAlignMolecules();
    
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('resize'));
    }, 100);
  }

  public dispose(): void {
    this.sceneManager.dispose();
    this.chartRenderer.dispose();
    this.uiController.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MoleculeVisualizerApp();
});
