import GUI from 'lil-gui';
import { CityParams } from './cityGenerator';

export interface UICallbacks {
  onParamsChange: (params: CityParams) => void;
  onToggleCameraMode: () => void;
}

export class UIController {
  private gui: GUI;
  private params: CityParams;
  private callbacks: UICallbacks;
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 500;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;
    
    this.params = {
      gridSize: 5,
      maxBuildingHeight: 80,
      buildingDensity: 0.6,
      roadWidth: 6,
      blockColor: '#808080',
      styleIndex: 0.3
    };
    
    this.gui = new GUI({
      title: '城市参数控制',
      container: document.body
    });
    
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.left = '20px';
    
    this.setupControls();
  }

  private setupControls(): void {
    this.gui.add(this.params, 'gridSize', 2, 10, 1)
      .name('街区网格密度')
      .onChange(() => this.scheduleUpdate());
    
    this.gui.add(this.params, 'maxBuildingHeight', 10, 150, 1)
      .name('建筑最大高度')
      .onChange(() => this.scheduleUpdate());
    
    this.gui.add(this.params, 'buildingDensity', 0.2, 1.0, 0.01)
      .name('建筑密度')
      .onChange(() => this.scheduleUpdate());
    
    this.gui.add(this.params, 'roadWidth', 2, 15, 1)
      .name('道路宽度')
      .onChange(() => this.scheduleUpdate());
    
    this.gui.addColor(this.params, 'blockColor')
      .name('区块主色调')
      .onChange(() => this.scheduleUpdate());
    
    this.gui.add(this.params, 'styleIndex', 0, 1, 0.01)
      .name('建筑风格指数')
      .onChange(() => this.scheduleUpdate());
    
    this.gui.add(this.callbacks, 'onToggleCameraMode')
      .name('切换相机模式');
  }

  private scheduleUpdate(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      this.callbacks.onParamsChange({ ...this.params });
      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY);
  }

  public getParams(): CityParams {
    return { ...this.params };
  }

  public destroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.gui.destroy();
  }
}
