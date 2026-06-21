import { GUI } from 'dat.gui';

export interface ControlParams {
  layout: string;
  buildingDensity: number;
  windDirection: number;
  windSpeed: number;
}

export interface ControlPanelCallbacks {
  onLayoutChange: (layout: string) => void;
  onDensityChange: (density: number) => void;
  onWindDirectionChange: (angle: number) => void;
  onWindSpeedChange: (speed: number) => void;
}

export class ControlPanel {
  public params: ControlParams;
  private gui: GUI;
  private callbacks: ControlPanelCallbacks;
  private layoutController: any;

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.params = {
      layout: '棋盘格布局',
      buildingDensity: 0.7,
      windDirection: 45,
      windSpeed: 5,
    };

    this.gui = new GUI({ title: '控制面板' });
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '24px';
    this.gui.domElement.style.right = '24px';
    this.gui.domElement.style.width = '280px';
    this.gui.domElement.style.borderRadius = '12px';
    this.gui.domElement.style.overflow = 'hidden';

    this.buildUI();
  }

  private buildUI(): void {
    const layoutFolder = this.gui.addFolder('街区布局');
    layoutFolder.open();
    this.layoutController = layoutFolder
      .add(this.params, 'layout', ['棋盘格布局', '放射状布局', '高低错落', '密集城区', '中央公园'])
      .name('布局类型')
      .onChange((val: string) => {
        this.callbacks.onLayoutChange(val);
      });

    const simFolder = this.gui.addFolder('风环境参数');
    simFolder.open();

    simFolder
      .add(this.params, 'buildingDensity', 0.3, 1.0, 0.1)
      .name('建筑密度')
      .onChange((val: number) => {
        this.callbacks.onDensityChange(val);
      });

    simFolder
      .add(this.params, 'windDirection', 0, 360, 1)
      .name('风向角度 (°)')
      .onChange((val: number) => {
        this.callbacks.onWindDirectionChange(val);
      });

    simFolder
      .add(this.params, 'windSpeed', 1, 10, 1)
      .name('风速强度')
      .onChange((val: number) => {
        this.callbacks.onWindSpeedChange(val);
      });
  }

  public setAvailableLayouts(layouts: string[]): void {
    if (this.layoutController) {
      this.layoutController.options(layouts);
    }
  }

  public setLayout(name: string): void {
    this.params.layout = name;
    if (this.layoutController) {
      this.layoutController.updateDisplay();
    }
  }

  public dispose(): void {
    this.gui.destroy();
  }
}
