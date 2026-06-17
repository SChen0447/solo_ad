import GUI from 'lil-gui';

export interface SimulationParams {
  signalIntensity: number;
  signalSpeed: number;
  backgroundParticleDensity: number;
  randomTriggerInterval: number;
}

export class GUIController {
  private gui: GUI;
  public params: SimulationParams;
  private onTriggerCallback: (() => void) | null = null;
  private onParamsChangeCallback: ((params: SimulationParams) => void) | null = null;

  constructor() {
    this.params = {
      signalIntensity: 5,
      signalSpeed: 1.0,
      backgroundParticleDensity: 500,
      randomTriggerInterval: 3
    };

    this.gui = new GUI({
      title: '⚙️ 参数控制',
      width: 280
    });

    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.right = '20px';
    this.gui.domElement.style.zIndex = '10';

    this.setupControls();
  }

  private setupControls(): void {
    const signalFolder = this.gui.addFolder('🔬 信号参数');
    signalFolder.open();

    signalFolder
      .add(this.params, 'signalIntensity', 1, 10, 0.1)
      .name('信号强度')
      .onChange(() => this.notifyParamsChange());

    signalFolder
      .add(this.params, 'signalSpeed', 0.5, 2.0, 0.1)
      .name('传递速度')
      .onChange(() => this.notifyParamsChange());

    const sceneFolder = this.gui.addFolder('🌟 场景参数');
    sceneFolder.open();

    sceneFolder
      .add(this.params, 'backgroundParticleDensity', 100, 800, 50)
      .name('背景粒子数')
      .onChange(() => this.notifyParamsChange());

    sceneFolder
      .add(this.params, 'randomTriggerInterval', 0, 10, 0.5)
      .name('自动触发间隔(秒)')
      .onChange(() => this.notifyParamsChange());

    const actionFolder = this.gui.addFolder('🎮 操作');
    actionFolder.open();

    actionFolder
      .add({ trigger: () => this.triggerCallback() }, 'trigger')
      .name('▶️ 手动触发信号');
  }

  private triggerCallback(): void {
    if (this.onTriggerCallback) {
      this.onTriggerCallback();
    }
  }

  private notifyParamsChange(): void {
    if (this.onParamsChangeCallback) {
      this.onParamsChangeCallback(this.params);
    }
  }

  public onTrigger(callback: () => void): void {
    this.onTriggerCallback = callback;
  }

  public onParamsChange(callback: (params: SimulationParams) => void): void {
    this.onParamsChangeCallback = callback;
  }

  public hide(): void {
    this.gui.hide();
  }

  public show(): void {
    this.gui.show();
  }

  public destroy(): void {
    this.gui.destroy();
  }
}
