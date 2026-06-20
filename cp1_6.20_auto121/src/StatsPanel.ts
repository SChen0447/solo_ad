export interface CityStats {
  buildingCount: number;
  maxHeight: number;
  timeOfDay: number;
}

export class StatsPanel {
  private countEl: HTMLElement;
  private heightEl: HTMLElement;
  private timeEl: HTMLElement;
  private fpsEl: HTMLElement;

  private lastUpdate: number = 0;
  private frameCount: number = 0;
  private updateInterval: number = 1000;

  constructor() {
    this.countEl = document.getElementById('stat-count')!;
    this.heightEl = document.getElementById('stat-height')!;
    this.timeEl = document.getElementById('stat-time')!;
    this.fpsEl = document.getElementById('stat-fps')!;
  }

  public tick(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastUpdate >= this.updateInterval) {
      const fps = Math.round(this.frameCount * 1000 / (now - this.lastUpdate));
      this.fpsEl.textContent = fps.toString();
      this.frameCount = 0;
      this.lastUpdate = now;
    }
  }

  public update(stats: CityStats): void {
    this.countEl.textContent = stats.buildingCount.toString();
    this.heightEl.textContent = `${stats.maxHeight.toFixed(0)} u`;
    this.timeEl.textContent = this.getTimeLabel(stats.timeOfDay);
  }

  private getTimeLabel(hour: number): string {
    if (hour >= 5 && hour < 7) return '黎明';
    if (hour >= 7 && hour < 10) return '早晨';
    if (hour >= 10 && hour < 14) return '白天';
    if (hour >= 14 && hour < 17) return '下午';
    if (hour >= 17 && hour < 19) return '黄昏';
    if (hour >= 19 && hour < 21) return '傍晚';
    return '夜晚';
  }
}
