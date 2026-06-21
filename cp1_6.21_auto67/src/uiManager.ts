import * as THREE from 'three';
import type { PlanetObject } from './solarSystem';
import type { PlanetData } from './planetData';

export interface UIManagerCallbacks {
  onSpeedChange: (speed: number) => void;
  onResetView: () => void;
}

export class UIManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private planets: PlanetObject[];
  private callbacks: UIManagerCallbacks;
  private canvas: HTMLCanvasElement;

  private infoCard: HTMLElement;
  private cardName: HTMLElement;
  private cardRadius: HTMLElement;
  private cardPeriod: HTMLElement;
  private cardDistance: HTMLElement;
  private cardColorDot: HTMLElement;
  private cardClose: HTMLElement;
  private tooltip: HTMLElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private resetBtn: HTMLElement;

  private hoveredPlanet: PlanetObject | null = null;
  private selectedPlanet: PlanetObject | null = null;
  private speed: number = 1;

  constructor(
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    planets: PlanetObject[],
    callbacks: UIManagerCallbacks
  ) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    this.canvas = canvas;
    this.planets = planets;
    this.callbacks = callbacks;

    this.infoCard = document.getElementById('info-card')!;
    this.cardName = document.getElementById('card-name')!;
    this.cardRadius = document.getElementById('card-radius')!;
    this.cardPeriod = document.getElementById('card-period')!;
    this.cardDistance = document.getElementById('card-distance')!;
    this.cardColorDot = document.getElementById('card-color-dot')!;
    this.cardClose = document.getElementById('info-card-close')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value')!;
    this.resetBtn = document.getElementById('reset-btn')!;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('click', this.onClick);
    this.speedSlider.addEventListener('input', this.onSpeedSliderChange);
    this.resetBtn.addEventListener('click', this.onResetClick);
    this.cardClose.addEventListener('click', this.closeInfoCard);
    this.canvas.addEventListener('mouseleave', this.hideTooltip);
  }

  private onMouseMove = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkHover();

    if (this.hoveredPlanet) {
      this.showTooltip(event.clientX, event.clientY, this.hoveredPlanet.data.nameZh);
    } else {
      this.hideTooltip();
    }
  };

  private onClick = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.planets.map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const planet = this.planets.find(p => p.mesh === clickedMesh);
      if (planet) {
        this.selectedPlanet = planet;
        this.showInfoCard(planet.data);
      }
    }
  };

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.planets.map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hoveredMesh = intersects[0].object as THREE.Mesh;
      const planet = this.planets.find(p => p.mesh === hoveredMesh);
      if (planet) {
        this.hoveredPlanet = planet;
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }

    this.hoveredPlanet = null;
    this.canvas.style.cursor = 'default';
  }

  private showTooltip(x: number, y: number, text: string): void {
    this.tooltip.textContent = text;
    this.tooltip.style.left = `${x + 12}px`;
    this.tooltip.style.top = `${y + 12}px`;
    this.tooltip.classList.add('visible');
  }

  private hideTooltip = (): void => {
    this.tooltip.classList.remove('visible');
  };

  private showInfoCard(data: PlanetData): void {
    this.cardName.textContent = data.nameZh;
    this.cardRadius.textContent = `${data.radiusScale.toFixed(2)} (地球=1)`;
    this.cardPeriod.textContent = `${data.orbitalPeriod.toLocaleString()} 地球日`;
    this.cardDistance.textContent = `${data.distanceFromSun.toFixed(2)} AU`;

    const colorHex = '#' + data.color.toString(16).padStart(6, '0');
    this.cardColorDot.style.backgroundColor = colorHex;
    this.cardColorDot.style.color = colorHex;

    this.infoCard.classList.add('visible');
  }

  private closeInfoCard = (): void => {
    this.infoCard.classList.remove('visible');
    this.selectedPlanet = null;
  };

  private onSpeedSliderChange = (): void => {
    this.speed = parseFloat(this.speedSlider.value);
    this.speedValue.textContent = `${this.speed.toFixed(1)}x`;
    this.callbacks.onSpeedChange(this.speed);
  };

  private onResetClick = (): void => {
    this.callbacks.onResetView();
  };

  public update(): void {
  }

  public getSpeed(): number {
    return this.speed;
  }

  public getSelectedPlanet(): PlanetObject | null {
    return this.selectedPlanet;
  }

  public setPlanets(planets: PlanetObject[]): void {
    this.planets = planets;
  }

  public dispose(): void {
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('click', this.onClick);
    this.speedSlider.removeEventListener('input', this.onSpeedSliderChange);
    this.resetBtn.removeEventListener('click', this.onResetClick);
    this.cardClose.removeEventListener('click', this.closeInfoCard);
    this.canvas.removeEventListener('mouseleave', this.hideTooltip);
  }
}
