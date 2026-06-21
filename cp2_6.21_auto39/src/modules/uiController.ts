import { eventBus } from '@/utils/eventBus';
import type { PlanetData } from '@/modules/planetManager';

export class UIController {
  private planetGrid: HTMLElement;
  private orbitSpeedSlider: HTMLInputElement;
  private rotationSpeedSlider: HTMLInputElement;
  private orbitSpeedValue: HTMLElement;
  private rotationSpeedValue: HTMLElement;
  private orbitFill: HTMLElement;
  private rotationFill: HTMLElement;
  private orbitTooltip: HTMLElement;
  private rotationTooltip: HTMLElement;
  private textureButtons: NodeListOf<HTMLButtonElement>;
  private compareBtn: HTMLButtonElement;
  private exitCompareBtn: HTMLButtonElement;
  private infoContent: HTMLElement;
  private compareContent: HTMLElement;
  private compareName1: HTMLElement;
  private compareName2: HTMLElement;
  private barChart: HTMLElement;
  private hamburgerBtn: HTMLElement;
  private infoPanel: HTMLElement;
  private controlPanel: HTMLElement;

  private selectedPlanets: string[] = [];
  private isCompareMode: boolean = false;
  private planetDataList: PlanetData[] = [];

  constructor() {
    this.planetGrid = document.getElementById('planet-grid')!;
    this.orbitSpeedSlider = document.getElementById('orbit-speed') as HTMLInputElement;
    this.rotationSpeedSlider = document.getElementById('rotation-speed') as HTMLInputElement;
    this.orbitSpeedValue = document.getElementById('orbit-speed-value')!;
    this.rotationSpeedValue = document.getElementById('rotation-speed-value')!;
    this.orbitFill = document.getElementById('orbit-fill')!;
    this.rotationFill = document.getElementById('rotation-fill')!;
    this.orbitTooltip = document.getElementById('orbit-tooltip')!;
    this.rotationTooltip = document.getElementById('rotation-tooltip')!;
    this.textureButtons = document.querySelectorAll('[data-texture]') as NodeListOf<HTMLButtonElement>;
    this.compareBtn = document.getElementById('compare-btn') as HTMLButtonElement;
    this.exitCompareBtn = document.getElementById('exit-compare-btn') as HTMLButtonElement;
    this.infoContent = document.getElementById('info-content')!;
    this.compareContent = document.getElementById('compare-content')!;
    this.compareName1 = document.getElementById('compare-name1')!;
    this.compareName2 = document.getElementById('compare-name2')!;
    this.barChart = document.getElementById('bar-chart')!;
    this.hamburgerBtn = document.getElementById('hamburger-btn')!;
    this.infoPanel = document.getElementById('info-panel')!;
    this.controlPanel = document.getElementById('control-panel')!;

    this.setupEventListeners();
  }

  public setPlanetList(planets: PlanetData[]): void {
    this.planetDataList = planets;
    this.renderPlanetGrid();
  }

  private renderPlanetGrid(): void {
    this.planetGrid.innerHTML = '';

    this.planetDataList.forEach((planet) => {
      const card = document.createElement('div');
      card.className = 'planet-thumb';
      card.dataset.planet = planet.name;
      card.title = planet.nameCN;

      const dot = document.createElement('div');
      dot.className = 'planet-dot';
      dot.style.background = `radial-gradient(circle at 30% 30%, ${this.lightenColor(planet.color, 0.35)}, #${planet.color.toString(16).padStart(6, '0')} 70%, ${this.darkenColor(planet.color, 0.2)})`;

      const nameText = document.createElement('div');
      nameText.className = 'planet-name-text';
      nameText.textContent = planet.nameCN;

      card.appendChild(dot);
      card.appendChild(nameText);

      card.addEventListener('click', () => {
        this.togglePlanetSelection(planet.name);
      });

      this.planetGrid.appendChild(card);
    });
  }

  private lightenColor(hex: number, amount: number): string {
    const r = Math.min(255, ((hex >> 16) & 255) + 255 * amount);
    const g = Math.min(255, ((hex >> 8) & 255) + 255 * amount);
    const b = Math.min(255, (hex & 255) + 255 * amount);
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  private darkenColor(hex: number, amount: number): string {
    const r = Math.max(0, ((hex >> 16) & 255) * (1 - amount));
    const g = Math.max(0, ((hex >> 8) & 255) * (1 - amount));
    const b = Math.max(0, (hex & 255) * (1 - amount));
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  private colorToHex(hex: number): string {
    return `#${hex.toString(16).padStart(6, '0')}`;
  }

  private setupEventListeners(): void {
    const orbitMin = parseFloat(this.orbitSpeedSlider.min);
    const orbitMax = parseFloat(this.orbitSpeedSlider.max);
    const rotMin = parseFloat(this.rotationSpeedSlider.min);
    const rotMax = parseFloat(this.rotationSpeedSlider.max);

    const updateSliderUI = (slider: HTMLInputElement, fill: HTMLElement, tooltip: HTMLElement, valueEl: HTMLElement, min: number, max: number, suffix: string = 'x') => {
      const value = parseFloat(slider.value);
      const pct = ((value - min) / (max - min)) * 100;
      fill.style.width = `${pct}%`;
      tooltip.style.left = `${pct}%`;
      tooltip.textContent = `${value.toFixed(1)}${suffix}`;
      valueEl.textContent = `${value.toFixed(1)}${suffix}`;
    };

    this.orbitSpeedSlider.addEventListener('input', (e) => {
      const slider = e.target as HTMLInputElement;
      const value = parseFloat(slider.value);
      updateSliderUI(slider, this.orbitFill, this.orbitTooltip, this.orbitSpeedValue, orbitMin, orbitMax);
      slider.classList.add('slider-dragging');
      this.orbitTooltip.classList.add('show');
      eventBus.emit('orbitSpeedChange', value);
    });

    this.orbitSpeedSlider.addEventListener('pointerdown', () => {
      this.orbitTooltip.classList.add('show');
      this.orbitSpeedSlider.classList.add('slider-dragging');
    });

    this.orbitSpeedSlider.addEventListener('pointerup', () => {
      setTimeout(() => {
        this.orbitTooltip.classList.remove('show');
        this.orbitSpeedSlider.classList.remove('slider-dragging');
      }, 400);
    });

    this.rotationSpeedSlider.addEventListener('input', (e) => {
      const slider = e.target as HTMLInputElement;
      const value = parseFloat(slider.value);
      updateSliderUI(slider, this.rotationFill, this.rotationTooltip, this.rotationSpeedValue, rotMin, rotMax);
      slider.classList.add('slider-dragging');
      this.rotationTooltip.classList.add('show');
      eventBus.emit('rotationSpeedChange', value);
    });

    this.rotationSpeedSlider.addEventListener('pointerdown', () => {
      this.rotationTooltip.classList.add('show');
      this.rotationSpeedSlider.classList.add('slider-dragging');
    });

    this.rotationSpeedSlider.addEventListener('pointerup', () => {
      setTimeout(() => {
        this.rotationTooltip.classList.remove('show');
        this.rotationSpeedSlider.classList.remove('slider-dragging');
      }, 400);
    });

    this.textureButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const texture = btn.dataset.texture as 'realistic' | 'cartoon' | 'wireframe';
        this.setTextureStyle(texture);
        eventBus.emit('textureStyleChange', texture);
      });
    });

    this.compareBtn.addEventListener('click', () => {
      if (this.selectedPlanets.length === 2) {
        this.enterCompareMode();
        eventBus.emit('enterCompareMode');
      }
    });

    this.exitCompareBtn.addEventListener('click', () => {
      this.exitCompareMode();
      eventBus.emit('exitCompareMode');
    });

    this.hamburgerBtn.addEventListener('click', () => {
      this.infoPanel.classList.toggle('show');
    });

    eventBus.on('compareButtonState', (enabled: boolean) => {
      this.compareBtn.disabled = !enabled;
    });

    eventBus.on('infoPanelUpdate', (planet: PlanetData | null) => {
      this.updateInfoPanel(planet);
    });

    eventBus.on('compareDataReady', (data: any) => {
      this.updateComparePanel(data);
    });

    eventBus.on('planetHover', (_planetData: PlanetData) => {});

    eventBus.on('planetClicked', (planetData: PlanetData) => {
      if (!this.isCompareMode) {
        const idx = this.selectedPlanets.indexOf(planetData.name);
        if (idx === -1) {
          if (this.selectedPlanets.length < 2) {
            this.selectedPlanets.push(planetData.name);
            this.updatePlanetThumbs();
            this.updateCompareButtonState();
            this.updateInfoPanel(planetData);
          }
        }
      }
    });
  }

  private setTextureStyle(style: 'realistic' | 'cartoon' | 'wireframe'): void {
    this.textureButtons.forEach((btn) => {
      btn.classList.remove('active');
      if (btn.dataset.texture === style) {
        btn.classList.add('active');
      }
    });
  }

  private togglePlanetSelection(planetName: string): void {
    if (this.isCompareMode) return;

    const idx = this.selectedPlanets.indexOf(planetName);

    if (idx > -1) {
      this.selectedPlanets.splice(idx, 1);
      eventBus.emit('planetDeselected', planetName);
    } else if (this.selectedPlanets.length < 2) {
      this.selectedPlanets.push(planetName);
      eventBus.emit('planetSelected', planetName);
    }

    this.updatePlanetThumbs();
    this.updateCompareButtonState();

    if (this.selectedPlanets.length > 0) {
      const lastSelected = this.planetDataList.find(p => p.name === this.selectedPlanets[this.selectedPlanets.length - 1]);
      if (lastSelected) {
        this.updateInfoPanel(lastSelected);
      }
    } else {
      this.updateInfoPanel(null);
    }
  }

  private updatePlanetThumbs(): void {
    const thumbs = this.planetGrid.querySelectorAll('.planet-thumb');
    thumbs.forEach((thumb) => {
      const planetName = thumb.getAttribute('data-planet');
      if (planetName && this.selectedPlanets.includes(planetName)) {
        thumb.classList.add('selected');
      } else {
        thumb.classList.remove('selected');
      }
    });
  }

  private updateCompareButtonState(): void {
    this.compareBtn.disabled = this.selectedPlanets.length !== 2;
  }

  private updateInfoPanel(planet: PlanetData | null): void {
    if (!planet) {
      this.infoContent.innerHTML = '<div class="info-empty">选择行星以查看详情</div>';
      return;
    }

    const typeClass = planet.textureType || 'rocky';
    const typeLabel = this.getTextureTypeLabel(planet.textureType);
    const previewBg = `radial-gradient(circle at 30% 30%, ${this.lightenColor(planet.color, 0.4)}, #${planet.color.toString(16).padStart(6, '0')} 60%, ${this.darkenColor(planet.color, 0.3)})`;
    const colorHex = this.colorToHex(planet.color);

    this.infoContent.innerHTML = `
      <div class="planet-header">
        <div class="planet-color-preview" style="background: ${previewBg};"></div>
        <div class="planet-title-wrap">
          <div class="planet-name">${planet.nameCN}</div>
          <span class="planet-type-tag ${typeClass}">${typeLabel}</span>
        </div>
      </div>
      <div class="info-list">
        <div class="info-row">
          <div class="info-label-wrap">
            <div class="info-icon orbit">🪐</div>
            <span class="info-label">轨道半径</span>
          </div>
          <div class="info-value-wrap">
            <div class="info-color-block" style="background: #4ECDC4;"></div>
            <span class="info-value">${planet.orbitRadius.toFixed(1)} 单位</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label-wrap">
            <div class="info-icon diameter">📏</div>
            <span class="info-label">行星直径</span>
          </div>
          <div class="info-value-wrap">
            <div class="info-color-block" style="background: #F9A826;"></div>
            <span class="info-value">${planet.diameter.toFixed(2)} 单位</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label-wrap">
            <div class="info-icon speed">⚡</div>
            <span class="info-label">公转速度</span>
          </div>
          <div class="info-value-wrap">
            <div class="info-color-block" style="background: #45B7D1;"></div>
            <span class="info-value">${planet.orbitSpeed.toFixed(2)} rad/s</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label-wrap">
            <div class="info-icon tilt">📐</div>
            <span class="info-label">自转倾角</span>
          </div>
          <div class="info-value-wrap">
            <div class="info-color-block" style="background: #DDA0DD;"></div>
            <span class="info-value">${planet.axialTilt.toFixed(2)}°</span>
          </div>
        </div>
        <div class="info-row">
          <div class="info-label-wrap">
            <div class="info-icon texture">🎨</div>
            <span class="info-label">代表色</span>
          </div>
          <div class="info-value-wrap">
            <div class="info-color-block" style="background: ${colorHex}; border: 1px solid rgba(255,255,255,0.2);"></div>
            <span class="info-value">${colorHex.toUpperCase()}</span>
          </div>
        </div>
      </div>
    `;
  }

  private getTextureTypeLabel(type?: string): string {
    switch (type) {
      case 'gas': return '气态巨星';
      case 'rocky': return '岩质行星';
      case 'ice': return '冰巨星';
      default: return '未知';
    }
  }

  private enterCompareMode(): void {
    this.isCompareMode = true;
    this.compareBtn.style.display = 'none';
    this.exitCompareBtn.style.display = 'block';
    this.compareContent.style.display = 'block';
  }

  private exitCompareMode(): void {
    this.isCompareMode = false;
    this.compareBtn.style.display = 'block';
    this.exitCompareBtn.style.display = 'none';
    this.compareContent.style.display = 'none';
  }

  private updateComparePanel(data: { planet1: PlanetData; planet2: PlanetData; ratios: any }): void {
    const { planet1, planet2 } = data;

    this.compareName1.textContent = planet1.nameCN;
    this.compareName2.textContent = planet2.nameCN;

    const maxDiameter = Math.max(planet1.diameter, planet2.diameter);
    const maxOrbitPeriod = Math.max(1 / planet1.orbitSpeed, 1 / planet2.orbitSpeed);
    const maxAxialTilt = Math.max(planet1.axialTilt, planet2.axialTilt, 1);

    const diameter1Pct = (planet1.diameter / maxDiameter) * 100;
    const diameter2Pct = (planet2.diameter / maxDiameter) * 100;

    const orbit1Pct = ((1 / planet1.orbitSpeed) / maxOrbitPeriod) * 100;
    const orbit2Pct = ((1 / planet2.orbitSpeed) / maxOrbitPeriod) * 100;

    const tilt1Pct = (planet1.axialTilt / maxAxialTilt) * 100;
    const tilt2Pct = (planet2.axialTilt / maxAxialTilt) * 100;

    this.barChart.innerHTML = `
      <div class="bar-item">
        <div class="bar-label">直径比</div>
        <div class="bar-row">
          <div class="bar value1" style="width: ${diameter1Pct}%"></div>
          <span class="bar-value">${planet1.diameter.toFixed(2)}</span>
        </div>
        <div class="bar-row">
          <div class="bar value2" style="width: ${diameter2Pct}%"></div>
          <span class="bar-value">${planet2.diameter.toFixed(2)}</span>
        </div>
      </div>
      <div class="bar-item">
        <div class="bar-label">公转周期 (相对)</div>
        <div class="bar-row">
          <div class="bar value1" style="width: ${orbit1Pct}%"></div>
          <span class="bar-value">${(1 / planet1.orbitSpeed).toFixed(1)}</span>
        </div>
        <div class="bar-row">
          <div class="bar value2" style="width: ${orbit2Pct}%"></div>
          <span class="bar-value">${(1 / planet2.orbitSpeed).toFixed(1)}</span>
        </div>
      </div>
      <div class="bar-item">
        <div class="bar-label">自转倾角 (°)</div>
        <div class="bar-row">
          <div class="bar value1" style="width: ${tilt1Pct}%"></div>
          <span class="bar-value">${planet1.axialTilt.toFixed(1)}</span>
        </div>
        <div class="bar-row">
          <div class="bar value2" style="width: ${tilt2Pct}%"></div>
          <span class="bar-value">${planet2.axialTilt.toFixed(1)}</span>
        </div>
      </div>
      <div class="bar-item">
        <div class="bar-label">倾角差</div>
        <div class="bar-row">
          <div class="bar value1" style="width: 100%; background: #FF6B6B;"></div>
          <span class="bar-value">${Math.abs(planet1.axialTilt - planet2.axialTilt).toFixed(2)}°</span>
        </div>
      </div>
    `;
  }

  public dispose(): void {}
}

export default UIController;
