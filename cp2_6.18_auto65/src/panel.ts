import type { HexCell } from './hexMap';
import { HexMap } from './hexMap';

export interface PanelOptions {
  container: HTMLElement;
}

export class Panel {
  private container: HTMLElement;
  private panelElement: HTMLElement | null = null;
  private resourceBadge: HTMLElement | null = null;
  private annualOutputEl: HTMLElement | null = null;
  private explorationValueEl: HTMLElement | null = null;
  private explorationBarEl: HTMLElement | null = null;
  private slider: HTMLInputElement | null = null;
  private sliderValueEl: HTMLElement | null = null;
  private currentOutputEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private emptyEl: HTMLElement | null = null;

  private currentHex: HexCell | null = null;

  public onEfficiencyChange?: (q: number, r: number, efficiency: number) => void;

  constructor(options: PanelOptions) {
    this.container = options.container;
    this.createPanel();
  }

  private createPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'right-panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '矿场详情';
    panel.appendChild(title);

    this.emptyEl = document.createElement('div');
    this.emptyEl.className = 'empty-panel';
    this.emptyEl.textContent = '请点击六边形选择矿场';
    panel.appendChild(this.emptyEl);

    this.contentEl = document.createElement('div');
    this.contentEl.style.display = 'none';

    const resourceRow = document.createElement('div');
    resourceRow.className = 'panel-info-row';
    const resourceLabel = document.createElement('span');
    resourceLabel.className = 'panel-info-label';
    resourceLabel.textContent = '资源类型';
    this.resourceBadge = document.createElement('span');
    this.resourceBadge.className = 'resource-badge';
    resourceRow.appendChild(resourceLabel);
    resourceRow.appendChild(this.resourceBadge);
    this.contentEl.appendChild(resourceRow);

    const outputRow = document.createElement('div');
    outputRow.className = 'panel-info-row';
    const outputLabel = document.createElement('span');
    outputLabel.className = 'panel-info-label';
    outputLabel.textContent = '预估年产量';
    this.annualOutputEl = document.createElement('span');
    this.annualOutputEl.className = 'panel-info-value';
    outputRow.appendChild(outputLabel);
    outputRow.appendChild(this.annualOutputEl);
    this.contentEl.appendChild(outputRow);

    const currentOutputRow = document.createElement('div');
    currentOutputRow.className = 'panel-info-row';
    const currentOutputLabel = document.createElement('span');
    currentOutputLabel.className = 'panel-info-label';
    currentOutputLabel.textContent = '当前产量';
    this.currentOutputEl = document.createElement('span');
    this.currentOutputEl.className = 'panel-info-value';
    this.currentOutputEl.style.color = '#3b82f6';
    currentOutputRow.appendChild(currentOutputLabel);
    currentOutputRow.appendChild(this.currentOutputEl);
    this.contentEl.appendChild(currentOutputRow);

    const explorationRow = document.createElement('div');
    explorationRow.className = 'panel-info-row';
    explorationRow.style.flexDirection = 'column';
    explorationRow.style.alignItems = 'stretch';
    const explorationLabelRow = document.createElement('div');
    explorationLabelRow.style.display = 'flex';
    explorationLabelRow.style.justifyContent = 'space-between';
    const explorationLabel = document.createElement('span');
    explorationLabel.className = 'panel-info-label';
    explorationLabel.textContent = '勘探度';
    this.explorationValueEl = document.createElement('span');
    this.explorationValueEl.className = 'panel-info-value';
    explorationLabelRow.appendChild(explorationLabel);
    explorationLabelRow.appendChild(this.explorationValueEl);
    explorationRow.appendChild(explorationLabelRow);

    const barContainer = document.createElement('div');
    barContainer.className = 'exploration-bar-container';
    this.explorationBarEl = document.createElement('div');
    this.explorationBarEl.className = 'exploration-bar-fill';
    this.explorationBarEl.style.width = '0%';
    barContainer.appendChild(this.explorationBarEl);
    explorationRow.appendChild(barContainer);
    this.contentEl.appendChild(explorationRow);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    const sliderLabelRow = document.createElement('div');
    sliderLabelRow.className = 'slider-label';
    const sliderLabel = document.createElement('span');
    sliderLabel.textContent = '开采效率';
    this.sliderValueEl = document.createElement('span');
    this.sliderValueEl.className = 'slider-value';
    this.sliderValueEl.textContent = '1.0x';
    sliderLabelRow.appendChild(sliderLabel);
    sliderLabelRow.appendChild(this.sliderValueEl);
    sliderContainer.appendChild(sliderLabelRow);

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '0.5';
    this.slider.max = '2.0';
    this.slider.step = '0.1';
    this.slider.value = '1.0';
    this.slider.addEventListener('input', this.handleSliderInput.bind(this));
    sliderContainer.appendChild(this.slider);

    this.contentEl.appendChild(sliderContainer);

    panel.appendChild(this.contentEl);
    this.panelElement = panel;
    this.container.appendChild(panel);
  }

  private handleSliderInput(e: Event): void {
    if (!this.slider || !this.currentHex) return;
    const value = parseFloat(this.slider.value);
    this.sliderValueEl!.textContent = value.toFixed(1) + 'x';
    this.updateCurrentOutput(value);

    if (this.onEfficiencyChange) {
      this.onEfficiencyChange(this.currentHex.q, this.currentHex.r, value);
    }
  }

  private updateCurrentOutput(efficiency: number): void {
    if (!this.currentHex || !this.currentOutputEl) return;
    const output = Math.round(this.currentHex.annualOutput * efficiency);
    this.currentOutputEl.textContent = output + ' 吨/年';
  }

  public updateSelectedHex(hex: HexCell | null): void {
    this.currentHex = hex;

    if (!hex) {
      if (this.emptyEl) this.emptyEl.style.display = 'block';
      if (this.contentEl) this.contentEl.style.display = 'none';
      return;
    }

    if (this.emptyEl) this.emptyEl.style.display = 'none';
    if (this.contentEl) this.contentEl.style.display = 'block';

    if (this.resourceBadge) {
      this.resourceBadge.textContent = HexMap.getResourceLabel(hex.resource);
      this.resourceBadge.className = 'resource-badge resource-' + hex.resource;
    }

    if (this.annualOutputEl) {
      this.annualOutputEl.textContent = hex.annualOutput + ' 吨/年';
    }

    if (this.explorationValueEl) {
      this.explorationValueEl.textContent = hex.exploration + '%';
    }
    if (this.explorationBarEl) {
      this.explorationBarEl.style.width = hex.exploration + '%';
    }

    if (this.slider) {
      this.slider.value = hex.efficiency.toString();
    }
    if (this.sliderValueEl) {
      this.sliderValueEl.textContent = hex.efficiency.toFixed(1) + 'x';
    }

    this.updateCurrentOutput(hex.efficiency);
  }

  public updateExploration(hex: HexCell): void {
    if (this.currentHex && this.currentHex.q === hex.q && this.currentHex.r === hex.r) {
      if (this.explorationValueEl) {
        this.explorationValueEl.textContent = hex.exploration + '%';
      }
      if (this.explorationBarEl) {
        this.explorationBarEl.style.width = hex.exploration + '%';
      }
    }
  }

  public destroy(): void {
    if (this.panelElement) {
      this.panelElement.remove();
    }
  }
}
