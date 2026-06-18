import type { HexTile, ResourceType } from './hexMap';

const RESOURCE_NAMES: Record<ResourceType, string> = {
  iron: '铁矿',
  crystal: '水晶',
  gas: '气体',
  obstacle: '障碍物',
  empty: '空地'
};

export interface PanelCallbacks {
  onEfficiencyChange: (tileId: string, efficiency: number) => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private callbacks: PanelCallbacks;
  private currentTile: HexTile | null = null;

  private resourceEl!: HTMLElement;
  private outputEl!: HTMLElement;
  private explorationEl!: HTMLElement;
  private sliderEl!: HTMLInputElement;
  private efficiencyValEl!: HTMLElement;
  private currentOutputEl!: HTMLElement;

  private lastOutputValue = 0;
  private outputAnimationId: number | null = null;

  constructor(container: HTMLElement, callbacks: PanelCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.createPanel();
  }

  private createPanel(): void {
    this.container.innerHTML = '';
    this.container.className = 'control-panel';

    const title = document.createElement('h2');
    title.className = 'panel-title';
    title.textContent = '矿场控制面板';
    this.container.appendChild(title);

    const infoSection = document.createElement('div');
    infoSection.className = 'panel-section';

    const resourceRow = document.createElement('div');
    resourceRow.className = 'info-row';
    resourceRow.innerHTML = '<span class="info-label">资源类型:</span>';
    this.resourceEl = document.createElement('span');
    this.resourceEl.className = 'info-value resource-value';
    this.resourceEl.textContent = '--';
    resourceRow.appendChild(this.resourceEl);
    infoSection.appendChild(resourceRow);

    const outputRow = document.createElement('div');
    outputRow.className = 'info-row';
    outputRow.innerHTML = '<span class="info-label">预估年产量:</span>';
    this.outputEl = document.createElement('span');
    this.outputEl.className = 'info-value';
    this.outputEl.textContent = '--';
    outputRow.appendChild(this.outputEl);
    infoSection.appendChild(outputRow);

    const explorationRow = document.createElement('div');
    explorationRow.className = 'info-row';
    explorationRow.innerHTML = '<span class="info-label">勘探度:</span>';
    this.explorationEl = document.createElement('span');
    this.explorationEl.className = 'info-value';
    this.explorationEl.textContent = '--';
    explorationRow.appendChild(this.explorationEl);
    infoSection.appendChild(explorationRow);

    this.container.appendChild(infoSection);

    const sliderSection = document.createElement('div');
    sliderSection.className = 'panel-section slider-section';

    const sliderLabel = document.createElement('div');
    sliderLabel.className = 'info-row';
    sliderLabel.innerHTML = '<span class="info-label">开采效率:</span>';
    this.efficiencyValEl = document.createElement('span');
    this.efficiencyValEl.className = 'info-value efficiency-value';
    this.efficiencyValEl.textContent = '1.0x';
    sliderLabel.appendChild(this.efficiencyValEl);
    sliderSection.appendChild(sliderLabel);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    this.sliderEl = document.createElement('input');
    this.sliderEl.type = 'range';
    this.sliderEl.min = '0.5';
    this.sliderEl.max = '2.0';
    this.sliderEl.step = '0.1';
    this.sliderEl.value = '1.0';
    this.sliderEl.className = 'efficiency-slider';
    this.sliderEl.disabled = true;

    sliderContainer.appendChild(this.sliderEl);
    sliderSection.appendChild(sliderContainer);

    const currentOutputRow = document.createElement('div');
    currentOutputRow.className = 'info-row current-output-row';
    currentOutputRow.innerHTML = '<span class="info-label">当前产量:</span>';
    this.currentOutputEl = document.createElement('span');
    this.currentOutputEl.className = 'info-value output-animate';
    this.currentOutputEl.textContent = '--';
    currentOutputRow.appendChild(this.currentOutputEl);
    sliderSection.appendChild(currentOutputRow);

    this.container.appendChild(sliderSection);

    const hint = document.createElement('div');
    hint.className = 'panel-hint';
    hint.textContent = '点击六边形选择矿场位置';
    this.container.appendChild(hint);

    this.sliderEl.addEventListener('input', this.handleSliderInput.bind(this));
  }

  private handleSliderInput(e: Event): void {
    if (!this.currentTile) return;
    const value = parseFloat((e.target as HTMLInputElement).value);
    this.efficiencyValEl.textContent = value.toFixed(1) + 'x';
    this.callbacks.onEfficiencyChange(this.currentTile.id, value);
    this.updateCurrentOutput(value);
  }

  private updateCurrentOutput(efficiency: number): void {
    if (!this.currentTile || this.currentTile.resource === 'obstacle') {
      this.currentOutputEl.textContent = '--';
      return;
    }
    const explorationFactor = this.currentTile.exploration / 100;
    const currentOutput = this.currentTile.annualOutput * efficiency * explorationFactor;
    this.animateOutputValue(currentOutput);
  }

  private animateOutputValue(targetValue: number): void {
    if (this.outputAnimationId) {
      cancelAnimationFrame(this.outputAnimationId);
    }

    const startValue = this.lastOutputValue;
    const diff = targetValue - startValue;
    const duration = 300;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * eased;

      this.currentOutputEl.textContent = Math.round(current).toString() + '/年';
      this.lastOutputValue = current;

      if (progress < 1) {
        this.outputAnimationId = requestAnimationFrame(animate);
      }
    };

    this.outputAnimationId = requestAnimationFrame(animate);
  }

  public updateTile(tile: HexTile | null): void {
    this.currentTile = tile;

    if (!tile || tile.resource === 'obstacle') {
      this.resourceEl.textContent = '--';
      this.outputEl.textContent = '--';
      this.explorationEl.textContent = '--';
      this.sliderEl.disabled = true;
      this.sliderEl.value = '1.0';
      this.efficiencyValEl.textContent = '1.0x';
      this.currentOutputEl.textContent = '--';
      this.lastOutputValue = 0;
      return;
    }

    this.resourceEl.textContent = RESOURCE_NAMES[tile.resource];
    this.outputEl.textContent = tile.annualOutput + '/年';
    this.explorationEl.textContent = tile.exploration + '%';
    this.sliderEl.disabled = false;
    this.sliderEl.value = tile.efficiency.toString();
    this.efficiencyValEl.textContent = tile.efficiency.toFixed(1) + 'x';

    const explorationFactor = tile.exploration / 100;
    const currentOutput = tile.annualOutput * tile.efficiency * explorationFactor;
    this.lastOutputValue = currentOutput;
    this.currentOutputEl.textContent = Math.round(currentOutput).toString() + '/年';
  }

  public updateExploration(tileId: string, exploration: number): void {
    if (this.currentTile?.id === tileId) {
      this.explorationEl.textContent = exploration + '%';
      if (this.currentTile) {
        const explorationFactor = exploration / 100;
        const currentOutput = this.currentTile.annualOutput * this.currentTile.efficiency * explorationFactor;
        this.animateOutputValue(currentOutput);
      }
    }
  }
}
