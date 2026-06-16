import { BackendClient } from './backend';
import { SceneManager } from './sceneManager';
import { AnimationController } from './animationController';
import { UIManager } from './ui';

class App {
  private backend: BackendClient;
  private scene: SceneManager;
  private animCtrl: AnimationController;
  private ui: UIManager;

  constructor() {
    this.backend = new BackendClient();
    this.scene = new SceneManager('scene-container');
    this.animCtrl = new AnimationController();

    this.ui = new UIManager('control-panel', this.backend, this.animCtrl, {
      onStartFold: this.onStartFold.bind(this),
    });

    this.connectDataFlow();
    console.log('[ProteinFoldingSimulator] 应用初始化完成');
  }

  private connectDataFlow(): void {
    this.animCtrl.onFrame((frame) => {
      this.scene.updateFrame(frame);
    });
  }

  private async onStartFold(sequenceId: number): Promise<void> {
    console.log(`[App] 开始折叠模拟，序列ID=${sequenceId}`);

    const data = await this.backend.getFoldData(sequenceId);
    console.log(`[App] 获取折叠数据完成: ${data.sequence_name}, ${data.n_residues}个残基, ${data.keyframes.length}个关键帧`);

    this.scene.buildMolecule(data);
    this.animCtrl.loadData(data);
    this.ui.setFoldData(data);

    setTimeout(() => {
      this.animCtrl.play();
      console.log('[App] 折叠动画已启动');
    }, 200);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
