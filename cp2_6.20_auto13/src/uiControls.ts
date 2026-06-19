import { HeatmapManager, TimePeriod, TrendDataPoint } from './heatmapManager';
import { GridCell, CityGrid } from './cityGrid';

export class UIControls {
  private heatmapManager: HeatmapManager;
  private cityGrid: CityGrid;

  private timeButtons: NodeListOf<HTMLButtonElement>;
  private timeLabelValue: HTMLElement;
  private avgTempValue: HTMLElement;
  private infoPanel: HTMLElement;
  private panelRegionId: HTMLElement;
  private panelTempValue: HTMLElement;
  private panelTempLevel: HTMLElement;
  private panelClose: HTMLElement;
  private trendChart: SVGSVGElement;
  private tooltip: HTMLElement;

  private periodLabels: Record<TimePeriod, string> = {
    morning: '早晨',
    noon: '中午',
    evening: '傍晚'
  };

  private isPanelVisible = false;
  private fadeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(heatmapManager: HeatmapManager, cityGrid: CityGrid) {
    this.heatmapManager = heatmapManager;
    this.cityGrid = cityGrid;

    this.timeButtons = document.querySelectorAll('.time-btn') as NodeListOf<HTMLButtonElement>;
    this.timeLabelValue = document.getElementById('time-label-value')!;
    this.avgTempValue = document.getElementById('avg-temp-value')!;
    this.infoPanel = document.getElementById('info-panel')!;
    this.panelRegionId = document.getElementById('panel-region-id')!;
    this.panelTempValue = document.getElementById('panel-temp-value')!;
    this.panelTempLevel = document.getElementById('panel-temp-level')!;
    this.panelClose = document.getElementById('panel-close')!;
    this.trendChart = document.getElementById('trend-chart') as unknown as SVGSVGElement;
    this.tooltip = document.getElementById('tooltip')!;

    this.setupEventListeners();
    this.updateCurrentInfo();
  }

  private setupEventListeners(): void {
    this.timeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const period = button.dataset.time as TimePeriod;
        if (period && period !== this.heatmapManager.getCurrentPeriod()) {
          this.setActiveButton(period);
          this.heatmapManager.setTimePeriod(period);
          this.updateCurrentInfo();
          this.updatePanelIfVisible();
        }
      });
    });

    this.panelClose.addEventListener('click', () => {
      this.hideInfoPanel();
      this.cityGrid.clearSelection();
    });

    this.cityGrid.onCellClick((cell: GridCell) => {
      this.showInfoPanel(cell);
    });

    this.cityGrid.onCellHover((cell: GridCell | null, event: MouseEvent) => {
      if (cell) {
        this.heatmapManager.showTooltip(cell, event, this.tooltip);
      } else {
        this.heatmapManager.hideTooltip(this.tooltip);
      }
    });
  }

  private setActiveButton(period: TimePeriod): void {
    this.timeButtons.forEach(btn => {
      if (btn.dataset.time === period) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateCurrentInfo(): void {
    const period = this.heatmapManager.getCurrentPeriod();
    this.timeLabelValue.textContent = this.periodLabels[period];

    const avgTemp = this.heatmapManager.getAverageTemperature(period);
    this.avgTempValue.textContent = avgTemp.toFixed(1);

    const currentInfo = document.getElementById('current-info');
    if (currentInfo) {
      currentInfo.style.animation = 'none';
      currentInfo.offsetHeight;
      currentInfo.style.animation = 'fadeIn 0.3s ease forwards';
    }
  }

  private updatePanelIfVisible(): void {
    if (this.isPanelVisible) {
      const selectedCell = this.cityGrid.getSelectedCell();
      if (selectedCell) {
        this.updatePanelContent(selectedCell);
      }
    }
  }

  private showInfoPanel(cell: GridCell): void {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
      this.fadeTimeout = null;
    }

    this.updatePanelContent(cell);
    this.isPanelVisible = true;

    requestAnimationFrame(() => {
      this.infoPanel.classList.add('visible');
    });

    this.renderChart(cell);
  }

  private hideInfoPanel(): void {
    this.isPanelVisible = false;
    this.infoPanel.classList.remove('visible');
  }

  private updatePanelContent(cell: GridCell): void {
    const cellData = this.heatmapManager.getCellData(cell.row, cell.col);
    if (!cellData) return;

    this.panelRegionId.textContent = cellData.regionId;
    this.panelTempValue.textContent = `${cellData.temperature.toFixed(1)}°`;

    const level = this.heatmapManager.getTemperatureLevel(cellData.temperature);
    this.panelTempLevel.textContent = level.label;
    this.panelTempLevel.style.color = level.color;
    this.panelTempLevel.style.backgroundColor = level.bgColor;
  }

  private renderChart(cell: GridCell): void {
    const trendData: TrendDataPoint[] = this.heatmapManager.getTrendData(cell.row, cell.col);

    const rect = this.trendChart.getBoundingClientRect();
    const width = rect.width || 264;
    const height = rect.height || 120;

    requestAnimationFrame(() => {
      this.heatmapManager.renderTrendChart(this.trendChart, trendData, width, height);
    });
  }

  public updateTooltipPosition(event: MouseEvent): void {
    const selectedCell = this.cityGrid.getSelectedCell();
    if (selectedCell && this.isPanelVisible) {
      return;
    }
  }

  public getTooltipElement(): HTMLElement {
    return this.tooltip;
  }
}
