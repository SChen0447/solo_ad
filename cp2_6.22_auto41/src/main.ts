import { CityGenerator, CityParams, ColorTheme } from '@/core/CityGenerator';
import { BuildingRenderer } from '@/core/BuildingRenderer';
import { SkylineEffect } from '@/core/SkylineEffect';
import { ParamPanel } from '@/ui/ParamPanel';
import { StatsPanel } from '@/ui/StatsPanel';

const INITIAL_PARAMS: CityParams = {
  density: 0.6,
  heightVariation: 1.0,
  colorTheme: 'sunset'
};

class App {
  private canvasContainer: HTMLElement;
  private cityGenerator: CityGenerator;
  private buildingRenderer: BuildingRenderer;
  private skylineEffect: SkylineEffect;
  private paramPanel: ParamPanel;
  private statsPanel: StatsPanel;

  private animationId: number = 0;
  private lastTheme: ColorTheme = INITIAL_PARAMS.colorTheme;

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');
    this.canvasContainer = container;

    this.cityGenerator = new CityGenerator();
    this.buildingRenderer = new BuildingRenderer(this.canvasContainer);
    this.skylineEffect = new SkylineEffect(
      this.buildingRenderer.getScene(),
      this.buildingRenderer.getCamera()
    );

    this.paramPanel = new ParamPanel('param-panel', INITIAL_PARAMS, {
      onParamsChange: this.handleParamsChange.bind(this)
    });

    this.statsPanel = new StatsPanel('stats-panel');

    this.init();
  }

  private init(): void {
    this.buildCity(INITIAL_PARAMS);
    this.setTheme(INITIAL_PARAMS.colorTheme);
    this.startAnimationLoop();
    console.log('[CitySkyline] Application initialized successfully');
  }

  private buildCity(params: CityParams): void {
    const startTime = performance.now();

    const buildings = this.cityGenerator.generate(params);
    this.buildingRenderer.updateBuildings(buildings);

    const stats = this.cityGenerator.getStats();
    this.statsPanel.update(stats);

    if (params.colorTheme !== this.lastTheme) {
      this.setTheme(params.colorTheme);
      this.lastTheme = params.colorTheme;
    }

    const elapsed = performance.now() - startTime;
    console.log(`[CitySkyline] City rebuilt in ${elapsed.toFixed(2)}ms - ${buildings.length} buildings`);
  }

  private setTheme(theme: ColorTheme): void {
    this.skylineEffect.setTheme(theme);
    this.buildingRenderer.setTheme(theme);
    this.statsPanel.setTheme(theme);
    this.paramPanel.updateThemeColors(theme);
  }

  private handleParamsChange(params: CityParams): void {
    this.buildCity(params);
  }

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);
      this.skylineEffect.render(time);
      this.buildingRenderer.render(time);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  try {
    app = new App();
  } catch (error) {
    console.error('[CitySkyline] Failed to initialize:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});
