import { useTransformStore } from '../store/useTransformStore';
import { TransformParams, ModelPreset, PARAM_CONFIG } from '../types';
import { SceneModule } from '../scene/SceneModule';

type ParamKey = keyof TransformParams;

export class TransformControlsModule {
  private sceneModule: SceneModule;
  private matrixCells: HTMLDivElement[][] = [];
  private prevMatrix: number[][] = [];
  private highlightTimeouts: ReturnType<typeof setTimeout>[] = [];

  constructor(sceneModule: SceneModule) {
    this.sceneModule = sceneModule;
    this.initSliders();
    this.initModelButtons();
    this.initMatrixToggle();
    this.initMatrixDisplay();
    this.initDrawerToggle();
    this.subscribeToStore();
  }

  private initSliders(): void {
    const keys: ParamKey[] = ['translateX', 'rotateY', 'scale', 'shearX'];

    for (const key of keys) {
      const slider = document.getElementById(`slider-${key}`) as HTMLInputElement;
      const input = document.getElementById(`input-${key}`) as HTMLInputElement;

      if (!slider || !input) continue;

      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        input.value = slider.value;
        this.onParamChange(key, val);
      });

      input.addEventListener('input', () => {
        const config = PARAM_CONFIG[key];
        let val = parseFloat(input.value);
        if (isNaN(val)) return;
        val = Math.max(config.min, Math.min(config.max, val));
        slider.value = val.toString();
        this.onParamChange(key, val);
      });

      input.addEventListener('blur', () => {
        const config = PARAM_CONFIG[key];
        let val = parseFloat(input.value);
        if (isNaN(val)) val = config.min;
        val = Math.max(config.min, Math.min(config.max, val));
        input.value = val.toString();
        slider.value = val.toString();
      });
    }
  }

  private onParamChange(key: ParamKey, value: number): void {
    const store = useTransformStore.getState();
    store.setParams({ [key]: value });
    this.sceneModule.applyTransform(useTransformStore.getState().params);
  }

  private initModelButtons(): void {
    const buttons = document.querySelectorAll('.model-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const model = (btn as HTMLElement).dataset.model as ModelPreset;
        if (!model) return;

        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        useTransformStore.getState().setActiveModel(model);
        this.sceneModule.switchModel(model);
      });
    });
  }

  private initMatrixToggle(): void {
    const toggle = document.getElementById('toggle-matrix') as HTMLInputElement;
    const display = document.getElementById('matrix-display');
    if (!toggle || !display) return;

    toggle.addEventListener('change', () => {
      useTransformStore.getState().toggleMatrix();
      if (toggle.checked) {
        display.classList.add('visible');
      } else {
        display.classList.remove('visible');
      }
    });
  }

  private initMatrixDisplay(): void {
    const grid = document.getElementById('matrix-display')!.querySelector('.matrix-grid') as HTMLElement;
    grid.innerHTML = '';
    this.matrixCells = [];
    this.prevMatrix = [];

    for (let i = 0; i < 4; i++) {
      const row: HTMLDivElement[] = [];
      const prevRow: number[] = [];
      for (let j = 0; j < 4; j++) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';
        cell.textContent = '0.000';
        grid.appendChild(cell);
        row.push(cell);
        prevRow.push(0);
      }
      this.matrixCells.push(row);
      this.prevMatrix.push(prevRow);
    }

    this.updateMatrixDisplay(useTransformStore.getState().combinedMatrix);
  }

  private initDrawerToggle(): void {
    const toggle = document.getElementById('drawer-toggle');
    const panel = document.getElementById('control-panel');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', () => {
      panel.classList.toggle('open');
    });
  }

  private subscribeToStore(): void {
    useTransformStore.subscribe((state) => {
      this.updateMatrixDisplay(state.combinedMatrix);
    });
  }

  private updateMatrixDisplay(matrix: number[][]): void {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const val = matrix[i][j];
        const rounded = Math.round(val * 1000) / 1000;
        const prev = this.prevMatrix[i][j];
        const cell = this.matrixCells[i][j];

        cell.textContent = rounded.toFixed(3);

        if (Math.abs(rounded - prev) > 0.0005) {
          cell.classList.add('highlight');
          this.clearHighlight(cell);
        }

        this.prevMatrix[i][j] = rounded;
      }
    }
  }

  private clearHighlight(cell: HTMLDivElement): void {
    const timeout = setTimeout(() => {
      cell.classList.remove('highlight');
    }, 200);
    this.highlightTimeouts.push(timeout);
  }

  syncFromStore(): void {
    const { params } = useTransformStore.getState();
    const keys: ParamKey[] = ['translateX', 'rotateY', 'scale', 'shearX'];

    for (const key of keys) {
      const slider = document.getElementById(`slider-${key}`) as HTMLInputElement;
      const input = document.getElementById(`input-${key}`) as HTMLInputElement;
      if (slider) slider.value = params[key].toString();
      if (input) input.value = params[key].toString();
    }
  }
}
