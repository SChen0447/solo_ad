import { CityGrid } from './cityGrid';
import { HeatmapManager } from './heatmapManager';
import { UIControls } from './uiControls';

class App {
  private cityGrid: CityGrid;
  private heatmapManager: HeatmapManager;
  private uiControls: UIControls;

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    this.cityGrid = new CityGrid({
      gridSize: 20,
      cellSize: 1,
      gap: 0.05,
      container
    });

    this.heatmapManager = new HeatmapManager(this.cityGrid);

    this.uiControls = new UIControls(this.heatmapManager, this.cityGrid);

    console.log('3D City Heatmap initialized');
  }

  public dispose(): void {
    this.cityGrid.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();

  (window as any).app = app;
});
