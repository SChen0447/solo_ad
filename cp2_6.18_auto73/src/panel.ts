import {
  HexCell,
  GameEvent,
  EventListener,
  RESOURCE_NAMES,
} from './types';

export class ControlPanel {
  private container: HTMLElement;
  private panelElement: HTMLElement;
  private selectedCell: HexCell | null = null;
  private listeners: EventListener[] = [];
  private displayedOutput: number = 0;
  private targetOutput: number = 0;
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'panel';
    this.container.appendChild(this.panelElement);
    this.renderEmpty();
  }

  private renderEmpty(): void {
    this.panelElement.innerHTML = `
      <div class="panel-title">矿场信息</div>
      <div class="empty-panel">
        点击地图上的六边形选择矿场位置
      </div>
    `;
  }

  private renderCell(cell: HexCell): void {
    const resourceName = RESOURCE_NAMES[cell.type as Exclude<typeof cell.type, 'obstacle'>];
    const resourceClass = `resource-${cell.type}`;
    const currentOutput = Math.floor(cell.annualOutput * cell.efficiency * (cell.explored / 100));
    this.displayedOutput = currentOutput;
    this.targetOutput = currentOutput;

    this.panelElement.innerHTML = `
      <div class="panel-title">矿场信息</div>
      
      <div class="panel-section">
        <div class="panel-label">资源类型</div>
        <span class="resource-badge ${resourceClass}">${resourceName}</span>
      </div>
      
      <div class="panel-section">
        <div class="panel-label">预估年产量</div>
        <div class="panel-value" id="output-value">${currentOutput}</div>
      </div>
      
      <div class="panel-section">
        <div class="panel-label">勘探度</div>
        <div class="exploration-bar-container">
          <div class="exploration-bar" id="exploration-bar" style="width: ${cell.explored}%"></div>
        </div>
        <div class="exploration-text" id="exploration-text">${cell.explored}%</div>
      </div>
      
      <div class="panel-section">
        <div class="panel-label">开采效率系数</div>
        <div class="slider-container">
          <input 
            type="range" 
            class="efficiency-slider" 
            id="efficiency-slider"
            min="0.5" 
            max="2.0" 
            step="0.1" 
            value="${cell.efficiency}"
          />
          <span class="efficiency-value" id="efficiency-value">${cell.efficiency.toFixed(1)}</span>
        </div>
      </div>
    `;

    this.bindSliderEvents(cell.id);
    this.startOutputAnimation();
  }

  private bindSliderEvents(cellId: string): void {
    const slider = this.panelElement.querySelector('#efficiency-slider') as HTMLInputElement;
    const efficiencyValue = this.panelElement.querySelector('#efficiency-value') as HTMLElement;
    const outputValue = this.panelElement.querySelector('#output-value') as HTMLElement;

    if (!slider || !efficiencyValue || !outputValue) return;

    let lastUpdate = 0;
    const throttleInterval = 16;

    const handleInput = () => {
      const now = performance.now();
      if (now - lastUpdate < throttleInterval) return;
      lastUpdate = now;

      const value = parseFloat(slider.value);
      const steppedValue = Math.round(value * 10) / 10;
      efficiencyValue.textContent = steppedValue.toFixed(1);
      
      if (this.selectedCell) {
        this.selectedCell.efficiency = steppedValue;
        this.targetOutput = Math.floor(
          this.selectedCell.annualOutput * steppedValue * (this.selectedCell.explored / 100)
        );
      }

      this.emit({
        type: 'efficiency-changed',
        data: { cellId, efficiency: steppedValue },
      });
    };

    slider.addEventListener('input', handleInput);
    slider.addEventListener('change', handleInput);
  }

  private startOutputAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const animate = () => {
      if (!this.selectedCell) return;

      const outputValue = this.panelElement.querySelector('#output-value') as HTMLElement;
      if (!outputValue) return;

      const diff = this.targetOutput - this.displayedOutput;
      if (Math.abs(diff) > 0.1) {
        this.displayedOutput += diff * 0.15;
        outputValue.textContent = Math.floor(this.displayedOutput).toString();
      } else {
        this.displayedOutput = this.targetOutput;
        outputValue.textContent = this.targetOutput.toString();
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  public handleEvent(event: GameEvent): void {
    switch (event.type) {
      case 'cell-selected':
        this.selectedCell = event.data as HexCell;
        this.renderCell(this.selectedCell);
        break;
      case 'cell-deselected':
        this.selectedCell = null;
        this.stopOutputAnimation();
        this.renderEmpty();
        break;
      case 'exploration-updated':
        if (this.selectedCell && event.data) {
          const updatedCell = event.data as HexCell;
          this.selectedCell.explored = updatedCell.explored;
          this.updateExplorationDisplay();
          this.updateTargetOutput();
        }
        break;
      case 'efficiency-changed':
        if (this.selectedCell && event.data) {
          const data = event.data as { cellId: string; efficiency: number };
          if (data.cellId === this.selectedCell.id) {
            this.selectedCell.efficiency = data.efficiency;
            this.updateTargetOutput();
          }
        }
        break;
    }
  }

  private updateExplorationDisplay(): void {
    if (!this.selectedCell) return;
    const explorationBar = this.panelElement.querySelector('#exploration-bar') as HTMLElement;
    const explorationText = this.panelElement.querySelector('#exploration-text') as HTMLElement;
    
    if (explorationBar) {
      explorationBar.style.width = `${this.selectedCell.explored}%`;
    }
    if (explorationText) {
      explorationText.textContent = `${this.selectedCell.explored}%`;
    }
  }

  private updateTargetOutput(): void {
    if (!this.selectedCell) return;
    this.targetOutput = Math.floor(
      this.selectedCell.annualOutput * 
      this.selectedCell.efficiency * 
      (this.selectedCell.explored / 100)
    );
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public addEventListener(listener: EventListener): void {
    this.listeners.push(listener);
  }

  public removeEventListener(listener: EventListener): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private stopOutputAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public getSelectedCell(): HexCell | null {
    return this.selectedCell;
  }

  public destroy(): void {
    this.stopOutputAnimation();
    this.listeners = [];
    this.panelElement.remove();
  }
}
