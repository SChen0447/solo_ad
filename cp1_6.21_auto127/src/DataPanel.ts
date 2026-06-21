import { PlanetData } from './Planet';

export class DataPanel {
  private panel: HTMLElement;
  private nameEl: HTMLElement;
  private diameterEl: HTMLElement;
  private periodEl: HTMLElement;
  private distanceEl: HTMLElement;
  private descEl: HTMLElement;
  private closeBtn: HTMLElement;
  private currentPlanet: PlanetData | null = null;

  constructor() {
    this.panel = document.getElementById('data-panel')!;
    this.nameEl = document.getElementById('panel-name')!;
    this.diameterEl = document.getElementById('panel-diameter')!;
    this.periodEl = document.getElementById('panel-period')!;
    this.distanceEl = document.getElementById('panel-distance')!;
    this.descEl = document.getElementById('panel-desc')!;
    this.closeBtn = document.getElementById('close-panel')!;

    this.closeBtn.addEventListener('click', () => this.hide());
  }

  public show(data: PlanetData): void {
    if (this.currentPlanet && this.currentPlanet.name === data.name) return;
    this.currentPlanet = data;

    this.nameEl.textContent = `${data.nameCn} (${data.name})`;
    this.diameterEl.textContent = data.diameter;
    this.periodEl.textContent = data.period;
    this.distanceEl.textContent = data.distanceFromSun;
    this.descEl.textContent = data.description;

    this.panel.classList.add('visible');
  }

  public hide(): void {
    this.currentPlanet = null;
    this.panel.classList.remove('visible');
  }

  public updateHoverLabel(name: string): void {
    const label = document.getElementById('hover-label')!;
    label.textContent = name ? `当前视角: ${name}` : '';
  }

  public isVisible(): boolean {
    return this.panel.classList.contains('visible');
  }

  public getCurrentPlanet(): PlanetData | null {
    return this.currentPlanet;
  }
}
