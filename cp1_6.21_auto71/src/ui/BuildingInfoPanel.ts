import { Building, BuildingType, getBuildingHeight } from '../data/BuildingData';

const TYPE_LABELS: Record<BuildingType, string> = {
  commercial: '商业建筑',
  residential: '住宅建筑',
  public: '公共设施'
};

export class BuildingInfoPanel {
  private panel: HTMLElement;
  private titleEl: HTMLElement;
  private yearEl: HTMLElement;
  private heightEl: HTMLElement;
  private typeEl: HTMLElement;
  private closeBtn: HTMLElement;

  private currentBuilding: Building | null = null;
  private currentEra: number = 1990;
  private isVisible: boolean = false;

  public onClose: (() => void) | null = null;

  constructor() {
    this.panel = document.getElementById('info-panel') as HTMLElement;
    this.titleEl = document.getElementById('info-title') as HTMLElement;
    this.yearEl = document.getElementById('info-year') as HTMLElement;
    this.heightEl = document.getElementById('info-height') as HTMLElement;
    this.typeEl = document.getElementById('info-type') as HTMLElement;
    this.closeBtn = document.getElementById('info-close') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.closeBtn.addEventListener('click', () => {
      this.hide();
    });

    document.addEventListener('click', (e) => {
      if (!this.isVisible) return;

      const target = e.target as HTMLElement;
      const isInPanel = this.panel.contains(target);
      const isInTimeline = target.closest('.timeline-wrapper');
      const isPlayBtn = target.closest('.play-btn');

      if (!isInPanel && !isInTimeline && !isPlayBtn) {
        this.hide();
      }
    });
  }

  public show(building: Building): void {
    this.currentBuilding = building;
    this.updateContent();

    requestAnimationFrame(() => {
      this.panel.classList.add('visible');
      this.isVisible = true;
    });
  }

  public hide(): void {
    this.panel.classList.remove('visible');
    this.isVisible = false;

    if (this.onClose) {
      this.onClose();
    }
  }

  public updateEra(era: number): void {
    this.currentEra = era;
    if (this.currentBuilding) {
      this.updateHeight();
    }
  }

  private updateContent(): void {
    if (!this.currentBuilding) return;

    this.titleEl.textContent = this.currentBuilding.name;
    this.yearEl.textContent = this.currentBuilding.buildYear.toString() + '年';

    this.typeEl.textContent = TYPE_LABELS[this.currentBuilding.type];
    this.typeEl.className = 'info-type-badge ' + this.currentBuilding.type;

    this.updateHeight();
  }

  private updateHeight(): void {
    if (!this.currentBuilding) return;

    const height = getBuildingHeight(this.currentBuilding, this.currentEra);
    if (this.currentBuilding.buildYear > this.currentEra) {
      this.heightEl.textContent = '未建造';
    } else {
      this.heightEl.textContent = Math.round(height).toString() + ' 米';
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  public getCurrentBuilding(): Building | null {
    return this.currentBuilding;
  }
}
