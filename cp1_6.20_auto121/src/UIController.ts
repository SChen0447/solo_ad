import { StatsPanel, CityStats } from './StatsPanel';
import { BuildingManager, BuildingStyle, BuildingData } from './BuildingManager';

export type ViewMode = 'top' | 'fps';

export interface ViewModeChangeCallback {
  (mode: ViewMode): void;
}

export interface TimeChangeCallback {
  (hour: number): void;
}

export class UIController {
  private statsPanel: StatsPanel;
  private buildingManager: BuildingManager | null = null;

  private timeSlider: HTMLInputElement;
  private btnTopView: HTMLButtonElement;
  private btnFPSView: HTMLButtonElement;
  private buildingPanel: HTMLDivElement;
  private buildingStyleSelect: HTMLSelectElement;
  private buildingHeightSlider: HTMLInputElement;
  private heightValueSpan: HTMLElement;
  private btnDelete: HTMLButtonElement;
  private btnClosePanel: HTMLButtonElement;

  public onViewModeChange: ViewModeChangeCallback | null = null;
  public onTimeChange: TimeChangeCallback | null = null;
  public onRequestCityStats: (() => CityStats) | null = null;

  private selectedBuildingId: number | null = null;
  private currentViewMode: ViewMode = 'top';
  private currentHour: number = 12;
  private lastStatsUpdate: number = 0;
  private statsUpdateInterval: number = 1000;

  constructor() {
    this.statsPanel = new StatsPanel();

    this.timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    this.btnTopView = document.getElementById('btn-topview') as HTMLButtonElement;
    this.btnFPSView = document.getElementById('btn-fpsview') as HTMLButtonElement;
    this.buildingPanel = document.getElementById('building-panel') as HTMLDivElement;
    this.buildingStyleSelect = document.getElementById('building-style') as HTMLSelectElement;
    this.buildingHeightSlider = document.getElementById('building-height') as HTMLInputElement;
    this.heightValueSpan = document.getElementById('height-value') as HTMLElement;
    this.btnDelete = document.getElementById('btn-delete') as HTMLButtonElement;
    this.btnClosePanel = document.getElementById('btn-close-panel') as HTMLButtonElement;

    this.bindEvents();
  }

  public setBuildingManager(bm: BuildingManager): void {
    this.buildingManager = bm;

    bm.onBuildingSelected = (id: number | null, data: BuildingData | null) => {
      this.selectedBuildingId = id;
      if (id !== null && data) {
        this.showBuildingPanel(data);
      } else {
        this.hideBuildingPanel();
      }
    };

    const scheduleStatsUpdate = () => {
      if (this.onRequestCityStats) {
        const stats = this.onRequestCityStats();
        this.statsPanel.update(stats);
      }
    };
    bm.onBuildingPlaced = scheduleStatsUpdate;
    bm.onBuildingRemoved = scheduleStatsUpdate;
    bm.onBuildingChanged = scheduleStatsUpdate;
  }

  public getCurrentHour(): number {
    return this.currentHour;
  }

  public getViewMode(): ViewMode {
    return this.currentViewMode;
  }

  public tick(currentTime: number): void {
    this.statsPanel.tick();

    if (currentTime - this.lastStatsUpdate >= this.statsUpdateInterval) {
      if (this.onRequestCityStats) {
        const stats = this.onRequestCityStats();
        this.statsPanel.update(stats);
      }
      this.lastStatsUpdate = currentTime;
    }
  }

  private bindEvents(): void {
    this.timeSlider.addEventListener('input', () => {
      const hour = parseFloat(this.timeSlider.value);
      this.currentHour = hour;
      if (this.onTimeChange) {
        this.onTimeChange(hour);
      }
      if (this.onRequestCityStats) {
        const stats = this.onRequestCityStats();
        this.statsPanel.update(stats);
      }
    });

    this.btnTopView.addEventListener('click', () => this.setViewMode('top'));
    this.btnFPSView.addEventListener('click', () => this.setViewMode('fps'));

    this.buildingStyleSelect.addEventListener('change', () => {
      if (this.selectedBuildingId !== null && this.buildingManager) {
        const style = this.buildingStyleSelect.value as BuildingStyle;
        this.buildingManager.updateBuildingStyle(this.selectedBuildingId, style);
      }
    });

    this.buildingHeightSlider.addEventListener('input', () => {
      const h = parseInt(this.buildingHeightSlider.value);
      this.heightValueSpan.textContent = h.toString();
    });

    this.buildingHeightSlider.addEventListener('change', () => {
      if (this.selectedBuildingId !== null && this.buildingManager) {
        const height = parseInt(this.buildingHeightSlider.value);
        this.buildingManager.updateBuildingHeight(this.selectedBuildingId, height);
      }
    });

    this.btnDelete.addEventListener('click', () => {
      if (this.selectedBuildingId !== null && this.buildingManager) {
        this.buildingManager.removeBuilding(this.selectedBuildingId);
        this.selectedBuildingId = null;
        this.hideBuildingPanel();
      }
    });

    this.btnClosePanel.addEventListener('click', () => {
      if (this.buildingManager) {
        this.buildingManager.clearSelection();
      }
      this.selectedBuildingId = null;
      this.hideBuildingPanel();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.buildingManager) {
          this.buildingManager.clearSelection();
        }
        this.selectedBuildingId = null;
        this.hideBuildingPanel();
      }
      if (e.key === '1') this.setViewMode('top');
      if (e.key === '2') this.setViewMode('fps');
    });
  }

  private setViewMode(mode: ViewMode): void {
    if (this.currentViewMode === mode) return;
    this.currentViewMode = mode;

    this.btnTopView.classList.toggle('active', mode === 'top');
    this.btnFPSView.classList.toggle('active', mode === 'fps');

    if (this.onViewModeChange) {
      this.onViewModeChange(mode);
    }
  }

  private showBuildingPanel(data: BuildingData): void {
    this.buildingStyleSelect.value = data.style;
    this.buildingHeightSlider.value = data.height.toFixed(0);
    this.heightValueSpan.textContent = data.height.toFixed(0);

    const rect = this.buildingPanel.parentElement!.getBoundingClientRect();
    const baseX = rect.width / 2;
    const baseY = rect.height / 2;

    this.buildingPanel.style.left = `${Math.min(rect.width - 260, baseX + 120)}px`;
    this.buildingPanel.style.top = `${Math.min(rect.height - 300, baseY - 100)}px`;

    this.buildingPanel.classList.add('show');
  }

  private hideBuildingPanel(): void {
    this.buildingPanel.classList.remove('show');
  }
}
