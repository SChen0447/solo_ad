import { Renderer, HoverCallbackData, ClickCallbackData } from './engine/Renderer';
import { DisplayMode } from './engine/ModelManager';
import { MoleculeLoader, ParsedMolecule } from './parser/MoleculeLoader';
import { moleculeNames } from './parser/SampleData';

const ELEMENT_NAMES: Record<string, string> = {
  C: '碳',
  H: '氢',
  O: '氧',
  N: '氮',
  S: '硫',
  P: '磷'
};

class App {
  private renderer: Renderer;
  private loader: MoleculeLoader;
  private currentMolecule: ParsedMolecule | null;
  private currentMode: DisplayMode;
  private justClickedAtom: boolean;

  private moleculeNameEl: HTMLElement;
  private moleculeFormulaEl: HTMLElement;
  private tooltipEl: HTMLElement;
  private detailPanelEl: HTMLElement;
  private detailElementEl: HTMLElement;
  private detailXEl: HTMLElement;
  private detailYEl: HTMLElement;
  private detailZEl: HTMLElement;
  private detailNeighborsEl: HTMLElement;
  private closeDetailBtn: HTMLElement;
  private resetViewBtn: HTMLElement;
  private mobileToggleBtn: HTMLElement;
  private controlPanelEl: HTMLElement;

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');

    this.renderer = new Renderer(container);
    this.loader = new MoleculeLoader();
    this.currentMolecule = null;
    this.currentMode = 'ballstick';
    this.justClickedAtom = false;

    this.moleculeNameEl = document.getElementById('molecule-name')!;
    this.moleculeFormulaEl = document.getElementById('molecule-formula')!;
    this.tooltipEl = document.getElementById('atom-tooltip')!;
    this.detailPanelEl = document.getElementById('atom-detail')!;
    this.detailElementEl = document.getElementById('detail-element')!;
    this.detailXEl = document.getElementById('detail-x')!;
    this.detailYEl = document.getElementById('detail-y')!;
    this.detailZEl = document.getElementById('detail-z')!;
    this.detailNeighborsEl = document.getElementById('detail-neighbors')!;
    this.closeDetailBtn = document.getElementById('close-detail')!;
    this.resetViewBtn = document.getElementById('reset-view')!;
    this.mobileToggleBtn = document.getElementById('mobile-toggle')!;
    this.controlPanelEl = document.getElementById('control-panel')!;

    this.setupUI();
    this.setupCallbacks();
    this.loadMolecule('benzene');
  }

  private setupUI(): void {
    document.querySelectorAll('[data-molecule]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.molecule;
        if (key) {
          this.setActiveMoleculeButton(key);
          this.loadMolecule(key);
        }
      });
    });

    document.querySelectorAll('[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = (btn as HTMLElement).dataset.mode as DisplayMode;
        if (mode) {
          this.setActiveModeButton(mode);
          this.setMode(mode);
        }
      });
    });

    this.closeDetailBtn.addEventListener('click', () => {
      this.detailPanelEl.classList.remove('visible');
    });

    this.resetViewBtn.addEventListener('click', () => {
      this.renderer.resetView();
    });

    this.mobileToggleBtn.addEventListener('click', () => {
      this.controlPanelEl.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (this.justClickedAtom) {
        this.justClickedAtom = false;
        return;
      }

      const target = e.target as HTMLElement;
      const isPanelClick = this.detailPanelEl.contains(target);
      const isControlPanelClick = this.controlPanelEl.contains(target);
      const isMoleculeInfoClick = target.closest('.molecule-info');
      const isMobileToggle = this.mobileToggleBtn.contains(target);
      const isResetBtn = target.closest('#reset-view');

      if (!isPanelClick && !isControlPanelClick && !isMoleculeInfoClick && !isMobileToggle && !isResetBtn) {
        this.detailPanelEl.classList.remove('visible');
      }
    });
  }

  private setupCallbacks(): void {
    this.renderer.onHover((data: HoverCallbackData | null) => {
      this.handleHover(data);
    });

    this.renderer.onClick((data: ClickCallbackData) => {
      this.handleClick(data);
    });
  }

  private setActiveMoleculeButton(key: string): void {
    document.querySelectorAll('[data-molecule]').forEach((btn) => {
      const btnKey = (btn as HTMLElement).dataset.molecule;
      if (btnKey === key) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private setActiveModeButton(mode: DisplayMode): void {
    document.querySelectorAll('[data-mode]').forEach((btn) => {
      const btnMode = (btn as HTMLElement).dataset.mode;
      if (btnMode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private loadMolecule(key: string): void {
    const parsed = this.loader.loadMolecule(key, this.currentMode);
    if (!parsed) return;

    this.currentMolecule = parsed;

    const molInfo = moleculeNames.find((m) => m.key === key);
    if (molInfo) {
      this.moleculeNameEl.textContent = molInfo.name;
      this.moleculeFormulaEl.textContent = molInfo.formula;
    } else {
      this.moleculeNameEl.textContent = parsed.name;
      this.moleculeFormulaEl.textContent = parsed.formula;
    }

    const neighborMap = new Map<number, number>();
    parsed.atoms.forEach((atom) => {
      neighborMap.set(atom.index, atom.neighborCount);
    });

    this.renderer.addModel(parsed.group, neighborMap, true);
  }

  private setMode(mode: DisplayMode): void {
    this.currentMode = mode;
    this.renderer.setMode(mode);
    if (this.currentMolecule) {
      this.loader.updateMode(this.currentMolecule, mode);
    }
  }

  private handleHover(data: HoverCallbackData | null): void {
    if (!data) {
      this.tooltipEl.classList.remove('visible');
      return;
    }

    const name = ELEMENT_NAMES[data.element] || data.element;
    const x = data.position.x.toFixed(3);
    const y = data.position.y.toFixed(3);
    const z = data.position.z.toFixed(3);

    this.tooltipEl.innerHTML = `
      <div><strong>${name}</strong> (${data.element})</div>
      <div>坐标: (${x}, ${y}, ${z})</div>
    `;

    const tooltipWidth = this.tooltipEl.offsetWidth || 160;
    const tooltipHeight = this.tooltipEl.offsetHeight || 50;

    let left = data.screenX + 14;
    let top = data.screenY + 14;

    if (left + tooltipWidth > window.innerWidth - 10) {
      left = data.screenX - tooltipWidth - 14;
    }
    if (top + tooltipHeight > window.innerHeight - 10) {
      top = data.screenY - tooltipHeight - 14;
    }

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
    this.tooltipEl.classList.add('visible');
  }

  private handleClick(data: ClickCallbackData): void {
    this.justClickedAtom = true;
    const name = ELEMENT_NAMES[data.element] || data.element;
    this.detailElementEl.textContent = `${name} (${data.element})`;
    this.detailXEl.textContent = data.position.x.toFixed(4);
    this.detailYEl.textContent = data.position.y.toFixed(4);
    this.detailZEl.textContent = data.position.z.toFixed(4);
    this.detailNeighborsEl.textContent = String(data.neighborCount);
    this.detailPanelEl.classList.add('visible');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
