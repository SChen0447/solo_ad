import type { HexCell, ResourceType } from './hexMap';

export interface PanelEvents {
  onEfficiencyChange: (cellId: string, efficiency: number) => void;
}

const RESOURCE_NAMES: Record<ResourceType, string> = {
  iron: '铁矿',
  crystal: '水晶',
  gas: '气体',
  obstacle: '障碍物',
};

const RESOURCE_COLORS: Record<ResourceType, string> = {
  iron: '#9ca3af',
  crystal: '#8b5cf6',
  gas: '#a3e635',
  obstacle: '#4b5563',
};

export class ControlPanel {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private currentCell: HexCell | null = null;
  private events: PanelEvents;

  private resourceLabel!: HTMLElement;
  private resourceDot!: HTMLElement;
  private annualOutputEl!: HTMLElement;
  private explorationBar!: HTMLElement;
  private explorationText!: HTMLElement;
  private slider!: HTMLInputElement;
  private efficiencyValueEl!: HTMLElement;
  private currentOutputEl!: HTMLElement;

  private outputRafId: number | null = null;
  private lastDisplayedOutput: number = 0;
  private outputAnimStart: number = 0;

  constructor(container: HTMLElement, events: PanelEvents) {
    this.container = container;
    this.events = events;
    this.panel = this.createPanel();
    this.injectStyles();
    this.container.appendChild(this.panel);
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .panel-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 180px;
        height: 6px;
        background: #374151;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      .panel-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .panel-slider::-webkit-slider-thumb:hover {
        background: #60a5fa;
      }
      .panel-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .panel-slider::-moz-range-thumb:hover {
        background: #60a5fa;
      }
      .output-animated {
        transition: color 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 280px;
      min-width: 280px;
      background: #1f2937;
      border-radius: 12px;
      padding: 24px 20px;
      color: #e5e7eb;
      display: flex;
      flex-direction: column;
      gap: 20px;
      flex-shrink: 0;
      height: 600px;
      overflow-y: auto;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 18px;
      font-weight: 700;
      color: #f9fafb;
      padding-bottom: 12px;
      border-bottom: 1px solid #374151;
    `;
    title.textContent = '矿场控制面板';
    panel.appendChild(title);

    const emptyState = document.createElement('div');
    emptyState.id = 'panel-empty';
    emptyState.style.cssText = `
      color: #6b7280;
      text-align: center;
      padding: 40px 0;
      font-size: 14px;
      line-height: 1.6;
    `;
    emptyState.innerHTML = '请点击地图上的六边形<br/>选择一个矿场位置';
    panel.appendChild(emptyState);

    const content = document.createElement('div');
    content.id = 'panel-content';
    content.style.cssText = `display: none; flex-direction: column; gap: 20px;`;

    const resourceRow = document.createElement('div');
    resourceRow.style.cssText = `display: flex; align-items: center; gap: 10px;`;
    this.resourceDot = document.createElement('span');
    this.resourceDot.style.cssText = `
      width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0;
    `;
    this.resourceLabel = document.createElement('span');
    this.resourceLabel.style.cssText = `font-size: 16px; font-weight: 600;`;
    resourceRow.appendChild(this.resourceDot);
    resourceRow.appendChild(this.resourceLabel);
    content.appendChild(resourceRow);

    const annualBox = this.createInfoBox('预估年产量', '吨/年');
    this.annualOutputEl = annualBox.valueEl;
    content.appendChild(annualBox.box);

    const currentOutputBox = this.createInfoBox('当前产量', '吨/年');
    this.currentOutputEl = currentOutputBox.valueEl;
    this.currentOutputEl.classList.add('output-animated');
    content.appendChild(currentOutputBox.box);

    const explorationSection = document.createElement('div');
    explorationSection.style.cssText = `display: flex; flex-direction: column; gap: 8px;`;
    const explLabel = document.createElement('div');
    explLabel.style.cssText = `
      font-size: 13px; color: #9ca3af; display: flex; justify-content: space-between;
    `;
    const explName = document.createElement('span');
    explName.textContent = '已勘探度';
    this.explorationText = document.createElement('span');
    this.explorationText.style.cssText = `color: #60a5fa; font-weight: 600;`;
    this.explorationText.textContent = '0%';
    explLabel.appendChild(explName);
    explLabel.appendChild(this.explorationText);
    explorationSection.appendChild(explLabel);

    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      width: 100%; height: 8px; background: #374151; border-radius: 4px; overflow: hidden;
    `;
    this.explorationBar = document.createElement('div');
    this.explorationBar.style.cssText = `
      height: 100%; width: 0%; background: linear-gradient(90deg, #3b82f6, #60a5fa);
      border-radius: 4px; transition: width 0.5s ease-out;
    `;
    barContainer.appendChild(this.explorationBar);
    explorationSection.appendChild(barContainer);
    content.appendChild(explorationSection);

    const sliderSection = document.createElement('div');
    sliderSection.style.cssText = `display: flex; flex-direction: column; gap: 12px;`;
    const sliderLabel = document.createElement('div');
    sliderLabel.style.cssText = `
      font-size: 13px; color: #9ca3af; display: flex; justify-content: space-between; align-items: center;
    `;
    const sliderName = document.createElement('span');
    sliderName.textContent = '开采效率系数';
    this.efficiencyValueEl = document.createElement('span');
    this.efficiencyValueEl.style.cssText = `color: #3b82f6; font-weight: 700; font-size: 15px;`;
    this.efficiencyValueEl.textContent = '1.0x';
    sliderLabel.appendChild(sliderName);
    sliderLabel.appendChild(this.efficiencyValueEl);
    sliderSection.appendChild(sliderLabel);

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '0.5';
    this.slider.max = '2.0';
    this.slider.step = '0.1';
    this.slider.value = '1.0';
    this.slider.className = 'panel-slider';
    this.slider.addEventListener('input', () => this.onSliderInput());
    sliderSection.appendChild(this.slider);

    const scaleLabels = document.createElement('div');
    scaleLabels.style.cssText = `
      display: flex; justify-content: space-between; font-size: 11px; color: #6b7280;
    `;
    const minLabel = document.createElement('span');
    minLabel.textContent = '0.5x';
    const midLabel = document.createElement('span');
    midLabel.textContent = '1.0x';
    const maxLabel = document.createElement('span');
    maxLabel.textContent = '2.0x';
    scaleLabels.appendChild(minLabel);
    scaleLabels.appendChild(midLabel);
    scaleLabels.appendChild(maxLabel);
    sliderSection.appendChild(scaleLabels);
    content.appendChild(sliderSection);

    const hint = document.createElement('div');
    hint.style.cssText = `
      margin-top: auto; padding-top: 16px; border-top: 1px solid #374151;
      font-size: 12px; color: #6b7280; line-height: 1.6;
    `;
    hint.innerHTML =
      '💡 提示：调整效率系数会直接影响产量和收入。<br/>效率越高，产出越多！';
    content.appendChild(hint);

    panel.appendChild(content);
    return panel;
  }

  private createInfoBox(label: string, unit: string) {
    const box = document.createElement('div');
    box.style.cssText = `
      background: #111827; border-radius: 8px; padding: 14px 16px;
      display: flex; flex-direction: column; gap: 6px;
    `;
    const labelEl = document.createElement('div');
    labelEl.style.cssText = `font-size: 12px; color: #9ca3af;`;
    labelEl.textContent = label;
    const valueRow = document.createElement('div');
    valueRow.style.cssText = `display: flex; align-items: baseline; gap: 6px;`;
    const valueEl = document.createElement('span');
    valueEl.style.cssText = `font-size: 22px; font-weight: 700; color: #f9fafb;`;
    valueEl.textContent = '0';
    const unitEl = document.createElement('span');
    unitEl.style.cssText = `font-size: 12px; color: #6b7280;`;
    unitEl.textContent = unit;
    valueRow.appendChild(valueEl);
    valueRow.appendChild(unitEl);
    box.appendChild(labelEl);
    box.appendChild(valueRow);
    return { box, valueEl };
  }

  private onSliderInput(): void {
    if (!this.currentCell) return;
    const val = parseFloat(this.slider.value);
    this.efficiencyValueEl.textContent = val.toFixed(1) + 'x';
    this.currentCell.efficiency = val;
    this.animateOutputTo(this.currentCell.annualOutput * val);
    this.events.onEfficiencyChange(this.currentCell.id, val);
  }

  private animateOutputTo(target: number): void {
    this.outputAnimStart = performance.now();
    const startVal = this.lastDisplayedOutput;
    const duration = 300;

    if (this.outputRafId) cancelAnimationFrame(this.outputRafId);

    const animate = (now: number): void => {
      const t = Math.min((now - this.outputAnimStart) / duration, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const val = startVal + (target - startVal) * easeOut;
      this.lastDisplayedOutput = val;
      this.currentOutputEl.textContent = Math.round(val).toString();
      if (t < 1) {
        this.outputRafId = requestAnimationFrame(animate);
      } else {
        this.outputRafId = null;
      }
    };
    this.outputRafId = requestAnimationFrame(animate);
  }

  setCell(cell: HexCell | null): void {
    this.currentCell = cell;
    const empty = this.panel.querySelector('#panel-empty') as HTMLElement;
    const content = this.panel.querySelector('#panel-content') as HTMLElement;

    if (!cell) {
      empty.style.display = 'block';
      content.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    content.style.display = 'flex';

    this.resourceDot.style.background = RESOURCE_COLORS[cell.resource];
    this.resourceLabel.textContent = RESOURCE_NAMES[cell.resource];

    this.annualOutputEl.textContent = cell.annualOutput.toString();
    this.lastDisplayedOutput = cell.annualOutput * cell.efficiency;
    this.currentOutputEl.textContent = Math.round(this.lastDisplayedOutput).toString();

    this.explorationBar.style.width = `${cell.exploration}%`;
    this.explorationText.textContent = `${cell.exploration}%`;

    this.slider.value = cell.efficiency.toString();
    this.efficiencyValueEl.textContent = cell.efficiency.toFixed(1) + 'x';
  }

  updateCell(cell: HexCell): void {
    if (!this.currentCell || this.currentCell.id !== cell.id) return;
    this.currentCell = cell;
    this.explorationBar.style.width = `${cell.exploration}%`;
    this.explorationText.textContent = `${cell.exploration}%`;
  }
}
