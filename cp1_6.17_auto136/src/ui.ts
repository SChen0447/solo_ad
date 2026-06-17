import { ATOM_DATA } from './atom';
import { GROUP_PRESETS } from './molecule';
import { MoleculeManager } from './molecule';

export interface UICallbacks {
  onAddAtom: (symbol: string) => void;
  onAddGroup: (groupKey: string) => void;
  onOptimize: () => void;
  onToggleRotate: () => void;
  onClear: () => void;
  onDragStart: (type: 'atom' | 'group', key: string) => void;
  onDragEnd: () => void;
}

export class UIController {
  private moleculeManager: MoleculeManager;
  private callbacks: UICallbacks;
  private isRotating: boolean = false;
  private isDragging: boolean = false;

  constructor(moleculeManager: MoleculeManager, callbacks: UICallbacks) {
    this.moleculeManager = moleculeManager;
    this.callbacks = callbacks;
    this.init();
  }

  private init(): void {
    this.buildAtomPanel();
    this.buildGroupPanel();
    this.bindButtons();
    this.moleculeManager.onStructureChange = () => this.updatePropertyPanel();
  }

  private buildAtomPanel(): void {
    const grid = document.getElementById('atom-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const symbols = ['H', 'C', 'N', 'O', 'P', 'S'];
    symbols.forEach(symbol => {
      const data = ATOM_DATA[symbol];
      const colorHex = '#' + data.color.toString(16).padStart(6, '0');

      const item = document.createElement('div');
      item.className = 'atom-item';
      item.draggable = true;
      item.innerHTML = `
        <div class="atom-sphere-preview" style="background: radial-gradient(circle at 30% 30%, ${this.lightenColor(colorHex, 30)}, ${colorHex} 60%, ${this.darkenColor(colorHex, 30)});"></div>
        <div class="atom-label">${data.symbol}</div>
        <div class="atom-valence">价: ${data.valence}</div>
      `;

      item.addEventListener('click', () => {
        if (!this.isDragging) {
          this.callbacks.onAddAtom(symbol);
        }
      });

      item.addEventListener('dragstart', (e) => {
        this.isDragging = true;
        item.classList.add('dragging');
        this.callbacks.onDragStart('atom', symbol);
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', `atom:${symbol}`);
          e.dataTransfer.effectAllowed = 'copy';
        }
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        this.isDragging = false;
        this.callbacks.onDragEnd();
        setTimeout(() => { this.isDragging = false; }, 50);
      });

      grid.appendChild(item);
    });
  }

  private buildGroupPanel(): void {
    const grid = document.getElementById('group-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.entries(GROUP_PRESETS).forEach(([key, preset]) => {
      const item = document.createElement('div');
      item.className = 'group-item';
      item.draggable = true;
      item.innerHTML = `
        <div class="group-label">${preset.name}</div>
        <div class="group-formula">${preset.formula}</div>
      `;

      item.addEventListener('click', () => {
        if (!this.isDragging) {
          this.callbacks.onAddGroup(key);
        }
      });

      item.addEventListener('dragstart', (e) => {
        this.isDragging = true;
        this.callbacks.onDragStart('group', key);
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', `group:${key}`);
          e.dataTransfer.effectAllowed = 'copy';
        }
      });

      item.addEventListener('dragend', () => {
        this.isDragging = false;
        this.callbacks.onDragEnd();
        setTimeout(() => { this.isDragging = false; }, 50);
      });

      grid.appendChild(item);
    });
  }

  private bindButtons(): void {
    const btnOptimize = document.getElementById('btn-optimize');
    if (btnOptimize) {
      btnOptimize.addEventListener('click', () => this.callbacks.onOptimize());
    }

    const btnRotate = document.getElementById('btn-rotate');
    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        this.isRotating = !this.isRotating;
        btnRotate.textContent = this.isRotating ? '停止旋转' : '开始旋转';
        this.callbacks.onToggleRotate();
      });
    }

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => this.callbacks.onClear());
    }
  }

  public updatePropertyPanel(): void {
    const formulaEl = document.getElementById('prop-formula');
    const massEl = document.getElementById('prop-mass');
    const atomsEl = document.getElementById('prop-atoms');
    const bondsEl = document.getElementById('prop-bonds');
    const completeEl = document.getElementById('prop-complete');

    if (formulaEl) formulaEl.textContent = this.moleculeManager.getFormula();
    if (massEl) massEl.textContent = `${this.moleculeManager.getMolecularMass().toFixed(3)} g/mol`;
    if (atomsEl) atomsEl.textContent = this.moleculeManager.atoms.size.toString();
    if (bondsEl) bondsEl.textContent = this.moleculeManager.bonds.size.toString();

    if (completeEl) {
      const isComplete = this.moleculeManager.isStructureComplete();
      completeEl.textContent = this.moleculeManager.atoms.size === 0 ? '-' : (isComplete ? '是' : '否');
      completeEl.className = 'property-value ' +
        (this.moleculeManager.atoms.size === 0 ? '' : (isComplete ? 'complete' : 'incomplete'));
    }
  }

  public showLoading(show: boolean): void {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.toggle('show', show);
    }
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(2.55 * percent));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent));
    const b = Math.min(255, (num & 0xff) + Math.round(2.55 * percent));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent));
    return `rgb(${r}, ${g}, ${b})`;
  }

  public resetRotateButton(): void {
    this.isRotating = false;
    const btnRotate = document.getElementById('btn-rotate');
    if (btnRotate) btnRotate.textContent = '开始旋转';
  }

  public isRotationEnabled(): boolean {
    return this.isRotating;
  }
}
