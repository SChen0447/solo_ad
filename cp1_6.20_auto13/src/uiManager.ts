import { StarData } from './galaxyGenerator';

export class UIManager {
  private panel: HTMLElement;
  private closeBtn: HTMLElement;
  private starNameEl: HTMLElement;
  private starSpectralEl: HTMLElement;
  private starTempEl: HTMLElement;
  private starRadiusEl: HTMLElement;
  private starLuminosityEl: HTMLElement;
  private isVisible: boolean = false;
  private currentStar: StarData | null = null;

  constructor() {
    this.panel = document.getElementById('info-panel')!;
    this.closeBtn = document.getElementById('close-panel')!;
    this.starNameEl = document.getElementById('star-name')!;
    this.starSpectralEl = document.getElementById('star-spectral')!;
    this.starTempEl = document.getElementById('star-temp')!;
    this.starRadiusEl = document.getElementById('star-radius')!;
    this.starLuminosityEl = document.getElementById('star-luminosity')!;

    this.closeBtn.addEventListener('click', () => {
      this.hidePanel();
    });
  }

  public showPanel(star: StarData): void {
    if (this.isVisible && this.currentStar === star) return;

    this.currentStar = star;
    this.updateStarInfo(star);
    this.panel.classList.add('visible');
    this.isVisible = true;
  }

  public hidePanel(): void {
    if (!this.isVisible) return;
    this.panel.classList.remove('visible');
    this.isVisible = false;
    this.currentStar = null;
  }

  public togglePanel(star: StarData): void {
    if (this.isVisible && this.currentStar === star) {
      this.hidePanel();
    } else {
      this.showPanel(star);
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  public getCurrentStar(): StarData | null {
    return this.currentStar;
  }

  private updateStarInfo(star: StarData): void {
    this.starNameEl.textContent = star.name;
    this.starSpectralEl.textContent = star.spectralType;
    this.starTempEl.textContent = this.formatTemperature(star.temperature);
    this.starRadiusEl.textContent = this.formatRadius(star.radius);
    this.starLuminosityEl.textContent = this.formatLuminosity(star.luminosity);
  }

  private formatTemperature(temp: number): string {
    return `${Math.round(temp).toLocaleString()} K`;
  }

  private formatRadius(radius: number): string {
    return `${radius.toFixed(2)} R☉`;
  }

  private formatLuminosity(lum: number): string {
    if (lum >= 1000) {
      return `${(lum / 1000).toFixed(2)} × 10³ L☉`;
    }
    return `${lum.toFixed(1)} L☉`;
  }

  public setCursorPointer(isPointer: boolean): void {
    document.body.style.cursor = isPointer ? 'pointer' : 'default';
  }

  public handleResize(): void {
    // 响应式调整逻辑
    const panel = this.panel;
    const viewportWidth = window.innerWidth;

    if (viewportWidth < 400) {
      panel.style.width = '200px';
    } else {
      panel.style.width = '250px';
    }
  }
}
