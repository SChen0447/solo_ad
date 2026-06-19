import * as d3 from 'd3';
import type { PlanetData } from '../data/CelestialData';

interface UIPanelOptions {
  onClose?: () => void;
  onSpeedChange?: (speed: number) => void;
}

interface PlanetPosition {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
}

export class UIPanel {
  private infoPanel: HTMLElement;
  private closeBtn: HTMLElement;
  private speedButtons: NodeListOf<HTMLElement>;
  private minimapSvg: any;
  private viewIndicator: any;
  private minimapSize: number = 180;
  private maxOrbitRadius: number = 250;

  private isPanelVisible: boolean = false;
  private currentSpeed: number = 1;

  onClose: () => void;
  onSpeedChange: (speed: number) => void;

  constructor(options: UIPanelOptions = {}) {
    this.onClose = options.onClose || (() => {});
    this.onSpeedChange = options.onSpeedChange || (() => {});

    const infoPanel = document.getElementById('infoPanel');
    const closeBtn = document.getElementById('closePanel');
    const speedControl = document.getElementById('speedControl');
    const minimapContainer = document.getElementById('minimap');

    if (!infoPanel || !closeBtn || !speedControl || !minimapContainer) {
      throw new Error('Required UI elements not found');
    }

    this.infoPanel = infoPanel;
    this.closeBtn = closeBtn;
    this.speedButtons = speedControl.querySelectorAll('.speed-btn');

    this.minimapSvg = d3.select('#minimap')
      .append('svg')
      .attr('width', this.minimapSize)
      .attr('height', this.minimapSize)
      .attr('viewBox', `0 0 ${this.minimapSize} ${this.minimapSize}`);

    this.setupMinimap();
    this.setupEventListeners();
  }

  private setupMinimap(): void {
    const centerX = this.minimapSize / 2;
    const centerY = this.minimapSize / 2;

    this.minimapSvg.append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', 4)
      .attr('fill', '#fff')
      .attr('opacity', 0.8);

    for (let i = 1; i <= 4; i++) {
      const radius = (i / 4) * (this.minimapSize / 2 - 10);
      this.minimapSvg.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255, 255, 255, 0.1)')
        .attr('stroke-width', 1);
    }

    this.viewIndicator = this.minimapSvg.append('polygon')
      .attr('class', 'view-indicator')
      .attr('fill', 'rgba(255, 215, 0, 0.3)')
      .attr('stroke', '#ffd700')
      .attr('stroke-width', 1.5)
      .attr('points', '');
  }

  updateMinimap(planetPositions: PlanetPosition[], cameraTheta: number, _cameraPhi: number): void {
    const centerX = this.minimapSize / 2;
    const centerY = this.minimapSize / 2;
    const scale = (this.minimapSize / 2 - 15) / this.maxOrbitRadius;

    const mappedPositions = planetPositions.map((p) => ({
      id: p.id,
      x: centerX + p.x * scale,
      y: centerY - p.z * scale,
      color: p.color
    }));

    const dots = this.minimapSvg.selectAll('.planet-dot')
      .data(mappedPositions, (d: any) => d.id);

    dots.enter()
      .append('circle')
      .attr('class', 'planet-dot')
      .attr('r', 5)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y)
      .merge(dots)
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y);

    dots.exit().remove();

    const viewAngle = cameraTheta;
    const viewWidth = 0.6;
    const indicatorRadius = this.minimapSize / 2 - 5;

    const angle1 = viewAngle - viewWidth;
    const angle2 = viewAngle + viewWidth;

    const x1 = centerX + indicatorRadius * Math.sin(angle1);
    const y1 = centerY - indicatorRadius * Math.cos(angle1);
    const x2 = centerX + indicatorRadius * Math.sin(angle2);
    const y2 = centerY - indicatorRadius * Math.cos(angle2);

    this.viewIndicator.attr('points', `${centerX},${centerY} ${x1},${y1} ${x2},${y2}`);
  }

  private setupEventListeners(): void {
    this.closeBtn.addEventListener('click', () => {
      this.hidePanel();
      this.onClose();
    });

    this.speedButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed || '1');
        this.setSpeed(speed);
        this.onSpeedChange(speed);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isPanelVisible) {
        this.hidePanel();
        this.onClose();
      }
    });
  }

  showPanel(planetData: PlanetData): void {
    const nameEl = document.getElementById('celestialName');
    const typeEl = document.getElementById('celestialType');
    const diameterEl = document.getElementById('statDiameter');
    const massEl = document.getElementById('statMass');
    const orbitEl = document.getElementById('statOrbit');
    const distanceEl = document.getElementById('statDistance');
    const descEl = document.getElementById('celestialDesc');

    if (nameEl) nameEl.textContent = planetData.name;
    if (typeEl) typeEl.textContent = planetData.type;
    if (diameterEl) diameterEl.textContent = planetData.diameter;
    if (massEl) massEl.textContent = planetData.mass;
    if (orbitEl) orbitEl.textContent = planetData.orbitPeriod;
    if (distanceEl) distanceEl.textContent = planetData.distance;
    if (descEl) descEl.textContent = planetData.description;

    this.infoPanel.classList.add('visible');
    this.isPanelVisible = true;
  }

  hidePanel(): void {
    this.infoPanel.classList.remove('visible');
    this.isPanelVisible = false;
  }

  setSpeed(speed: number): void {
    this.currentSpeed = speed;
    this.speedButtons.forEach((btn) => {
      const btnSpeed = parseFloat(btn.dataset.speed || '1');
      if (btnSpeed === speed) {
        btn.classList.add('active');
        btn.classList.add('pulse');
        setTimeout(() => btn.classList.remove('pulse'), 300);
      } else {
        btn.classList.remove('active');
      }
    });
  }

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  isVisible(): boolean {
    return this.isPanelVisible;
  }
}
