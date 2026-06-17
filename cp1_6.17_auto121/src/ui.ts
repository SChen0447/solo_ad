import { StratumData, DrillData, DisplayMode } from './types';
import { presetData } from './presets';

export class UIManager {
  public onModeChange: ((mode: DisplayMode) => void) | null = null;
  public onStratumEdit: ((drillId: string, strata: StratumData[]) => void) | null = null;
  public onDrillDelete: ((drillId: string) => void) | null = null;
  public onPresetLoad: ((presetData: any[]) => void) | null = null;

  private modeButtons: NodeListOf<HTMLButtonElement>;
  private editPanel: HTMLElement;
  private editPanelTitle: HTMLElement;
  private stratumList: HTMLElement;
  private closeBtn: HTMLElement;
  private addStratumBtn: HTMLElement;
  private deleteDrillBtn: HTMLElement;
  private presetCards: NodeListOf<HTMLElement>;

  private currentDrillId: string | null = null;
  private currentStrata: StratumData[] = [];
  private debounceTimer: number | null = null;

  constructor() {
    this.modeButtons = document.querySelectorAll('.mode-btn');
    this.editPanel = document.getElementById('edit-panel')!;
    this.editPanelTitle = document.getElementById('edit-panel-title')!;
    this.stratumList = document.getElementById('stratum-list')!;
    this.closeBtn = document.getElementById('edit-panel-close')!;
    this.addStratumBtn = document.getElementById('btn-add-stratum')!;
    this.deleteDrillBtn = document.getElementById('btn-delete-drill')!;
    this.presetCards = document.querySelectorAll('.preset-card');

    this.bindEvents();
  }

  private bindEvents(): void {
    this.modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as DisplayMode;
        this.setActiveMode(mode);
        if (this.onModeChange) {
          this.onModeChange(mode);
        }
      });
    });

    this.closeBtn.addEventListener('click', () => {
      this.hideEditPanel();
    });

    this.addStratumBtn.addEventListener('click', () => {
      this.addStratumRow();
    });

    this.deleteDrillBtn.addEventListener('click', () => {
      if (this.currentDrillId && this.onDrillDelete) {
        this.onDrillDelete(this.currentDrillId);
        this.hideEditPanel();
      }
    });

    this.presetCards.forEach((card, index) => {
      card.addEventListener('click', () => {
        this.loadPreset(index);
      });
    });
  }

  private setActiveMode(mode: DisplayMode): void {
    this.modeButtons.forEach((btn) => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  showEditPanel(drill: DrillData): void {
    this.currentDrillId = drill.id;
    this.currentStrata = JSON.parse(JSON.stringify(drill.strata));
    this.editPanelTitle.textContent = `钻孔${drill.name}`;
    this.renderStratumList();
    this.editPanel.classList.add('show');
  }

  hideEditPanel(): void {
    this.editPanel.classList.remove('show');
    this.currentDrillId = null;
    this.currentStrata = [];
  }

  private renderStratumList(): void {
    this.stratumList.innerHTML = '';

    const sortedStrata = [...this.currentStrata].sort((a, b) => a.depth - b.depth);

    sortedStrata.forEach((stratum, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <input type="text" class="stratum-name" value="${stratum.name}" data-index="${index}" />
        </td>
        <td>
          <input type="number" class="stratum-depth" value="${stratum.depth}" min="0.1" step="0.1" data-index="${index}" />
        </td>
        <td>
          <input type="color" class="stratum-color" value="${stratum.color}" data-index="${index}" style="width: 32px; height: 28px; padding: 2px; cursor: pointer;" />
        </td>
        <td>
          <button class="btn-delete-stratum" data-index="${index}">删除</button>
        </td>
      `;
      this.stratumList.appendChild(row);
    });

    this.bindStratumInputEvents();
  }

  private bindStratumInputEvents(): void {
    const nameInputs = this.stratumList.querySelectorAll('.stratum-name');
    const depthInputs = this.stratumList.querySelectorAll('.stratum-depth');
    const colorInputs = this.stratumList.querySelectorAll('.stratum-color');
    const deleteBtns = this.stratumList.querySelectorAll('.btn-delete-stratum');

    nameInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        if (this.currentStrata[index]) {
          this.currentStrata[index].name = target.value;
          this.scheduleUpdate();
        }
      });
    });

    depthInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        const value = parseFloat(target.value);
        if (this.currentStrata[index] && !isNaN(value) && value > 0) {
          this.currentStrata[index].depth = value;
          this.scheduleUpdate();
        }
      });
    });

    colorInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const index = parseInt(target.dataset.index || '0');
        if (this.currentStrata[index]) {
          this.currentStrata[index].color = target.value;
          this.scheduleUpdate();
        }
      });
    });

    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const index = parseInt(target.dataset.index || '0');
        if (this.currentStrata.length > 1) {
          this.currentStrata.splice(index, 1);
          this.renderStratumList();
          this.scheduleUpdate();
        }
      });
    });
  }

  private addStratumRow(): void {
    const maxDepth = this.currentStrata.reduce(
      (max, s) => Math.max(max, s.depth),
      0
    );
    const newStratum: StratumData = {
      name: `新地层${this.currentStrata.length + 1}`,
      depth: Math.min(maxDepth + 2, 15),
      color: '#A0522D'
    };
    this.currentStrata.push(newStratum);
    this.renderStratumList();
    this.scheduleUpdate();
  }

  private scheduleUpdate(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.triggerUpdate();
    }, 150);
  }

  private triggerUpdate(): void {
    if (this.onStratumEdit && this.currentDrillId) {
      this.onStratumEdit(this.currentDrillId, [...this.currentStrata]);
    }
  }

  getCurrentStrata(): StratumData[] {
    return [...this.currentStrata];
  }

  getCurrentDrillId(): string | null {
    return this.currentDrillId;
  }

  private loadPreset(index: number): void {
    const preset = presetData[index];
    if (preset && this.onPresetLoad) {
      this.onPresetLoad(preset.drills);
    }
  }
}
