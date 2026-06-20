import { HeatmapManager, GridCellData } from './heatmapManager';
import { CityGrid } from './cityGrid';
import { UIControls } from './uiControls';

class Application {
  private container: HTMLElement;
  private heatmapManager: HeatmapManager;
  private cityGrid: CityGrid;
  private uiControls: UIControls;

  constructor() {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      throw new Error('Canvas container not found');
    }
    this.container = canvasContainer;

    this.heatmapManager = new HeatmapManager();

    this.cityGrid = new CityGrid(this.container, this.heatmapManager);

    this.uiControls = new UIControls(document.body, this.heatmapManager);

    this.setupEventHandlers();

    console.log('[3D城市热力图] 应用初始化完成');
    console.log('[模块调用关系] main.ts → heatmapManager.ts → cityGrid.ts ↔ uiControls.ts');
    console.log('[数据流向] 时段切换 → UIControls → HeatmapManager → CityGrid → 3D渲染');
    console.log('[数据流向] 网格点击 → CityGrid → HeatmapManager → 详情面板显示');
  }

  private setupEventHandlers(): void {
    this.uiControls.setOnPeriodChange((period: string) => {
      console.log(`[时段切换] ${period}`);
      this.cityGrid.updateHeatmap(period);
      this.heatmapManager.hideCellDetail();
    });

    this.cityGrid.setOnCellClick((cellData: GridCellData, row: number, col: number) => {
      const regionId = this.cityGrid.getCellRegionId(row, col);
      console.log(`[网格点击] ${regionId}, 温度: ${cellData.temperature.toFixed(1)}°C`);
      this.heatmapManager.showCellDetail(cellData, row, col, regionId);
    });
  }

  public dispose(): void {
    this.cityGrid.dispose();
    this.heatmapManager.dispose();
    this.uiControls.dispose();
  }
}

let app: Application | null = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new Application();
  } catch (error) {
    console.error('[3D城市热力图] 初始化失败:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});

export { Application };
