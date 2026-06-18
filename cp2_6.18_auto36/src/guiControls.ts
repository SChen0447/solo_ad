import * as dat from 'dat.gui';
import { ParticleCloud } from './particleCloud';
import { InteractionManager } from './interactions';
import { AQIDataPoint, getAvailableCities, loadCityData, getCityDisplayName } from './dataLoader';

export interface GUIControlsOptions {
  initialCity?: string;
}

export interface GUIControlsCallbacks {
  onCityChange?: (cityName: string, data: AQIDataPoint[]) => void;
}

export class GUIControls {
  private gui: dat.GUI;
  private particleCloud: ParticleCloud;
  private interactionManager: InteractionManager;
  private callbacks: GUIControlsCallbacks;

  private params = {
    rotationSpeed: 0.002,
    sizeScale: 1.0,
    city: 'beijing',
    selectedPoint: '--',
    selectedAqi: 0,
    resetCamera: () => this.interactionManager.resetCamera()
  };

  private cityFolder: dat.GUI;
  private particleFolder: dat.GUI;
  private infoFolder: dat.GUI;

  constructor(
    particleCloud: ParticleCloud,
    interactionManager: InteractionManager,
    options: GUIControlsOptions = {},
    callbacks: GUIControlsCallbacks = {}
  ) {
    this.particleCloud = particleCloud;
    this.interactionManager = interactionManager;
    this.callbacks = callbacks;
    this.params.city = options.initialCity || 'beijing';

    this.gui = new dat.GUI();
    this.gui.domElement.classList.add('dark-theme');
    (this.gui as any).domElement.style.transition = 'opacity 0.2s ease';

    this.cityFolder = this.gui.addFolder('城市');
    this.particleFolder = this.gui.addFolder('粒子效果');
    this.infoFolder = this.gui.addFolder('选中点信息');

    this.setupCityControls();
    this.setupParticleControls();
    this.setupInfoControls();

    this.gui.add(this.params, 'resetCamera').name('重置视角');
  }

  private setupCityControls(): void {
    const cities = getAvailableCities();
    const cityOptions: Record<string, string> = {};
    cities.forEach(c => {
      cityOptions[c.displayName] = c.name;
    });

    this.cityFolder
      .add(this.params, 'city', cityOptions)
      .name('切换城市')
      .onChange(async (value: string) => {
        await this.switchCity(value);
      });
  }

  private setupParticleControls(): void {
    this.particleFolder
      .add(this.params, 'rotationSpeed', 0, 0.01)
      .name('自转速度')
      .step(0.0001)
      .onChange((value: number) => {
        this.particleCloud.setRotationSpeed(value);
      });

    this.particleFolder
      .add(this.params, 'sizeScale', 0.5, 2.0)
      .name('大小缩放')
      .step(0.1)
      .onChange((value: number) => {
        this.particleCloud.setSizeScale(value);
      });
  }

  private setupInfoControls(): void {
    this.infoFolder
      .add(this.params, 'selectedPoint')
      .name('采样点')
      .listen();

    this.infoFolder
      .add(this.params, 'selectedAqi')
      .name('AQI')
      .listen();

    this.infoFolder.open();
  }

  private async switchCity(cityName: string): Promise<void> {
    try {
      const data = await loadCityData(cityName);
      await this.particleCloud.setData(data);

      this.updateCityInfo(cityName, data);

      if (this.callbacks.onCityChange) {
        this.callbacks.onCityChange(cityName, data);
      }
    } catch (error) {
      console.error('Failed to switch city:', error);
    }
  }

  private updateCityInfo(cityName: string, data: AQIDataPoint[]): void {
    const displayName = getCityDisplayName(cityName);
    const cityNameEl = document.getElementById('city-name');
    const cityStatsEl = document.getElementById('city-stats');

    if (cityNameEl) {
      cityNameEl.textContent = displayName;
    }
    if (cityStatsEl && data.length > 0) {
      const avgAqi = Math.round(data.reduce((acc, p) => acc + p.aqi, 0) / data.length);
      cityStatsEl.textContent = `采样点: ${data.length} | 平均AQI: ${avgAqi}`;
    }
  }

  public updateSelectedPoint(point: AQIDataPoint | null): void {
    if (point) {
      this.params.selectedPoint = point.name;
      this.params.selectedAqi = point.aqi;
    } else {
      this.params.selectedPoint = '--';
      this.params.selectedAqi = 0;
    }

    for (const controller of (this.infoFolder as any).__controllers) {
      controller.updateDisplay();
    }
  }

  public async initialize(): Promise<void> {
    await this.switchCity(this.params.city);
  }

  public dispose(): void {
    this.gui.destroy();
  }
}
