import { SceneBuilder } from './sceneBuilder';
import { UIManager } from './uiManager';
import { parseText } from './textParser';

class App {
  private sceneBuilder: SceneBuilder;
  private uiManager: UIManager;
  private canvas: HTMLCanvasElement;

  constructor() {
    this.canvas = document.getElementById('sceneCanvas') as HTMLCanvasElement;
    this.sceneBuilder = new SceneBuilder(this.canvas);
    this.uiManager = new UIManager();

    this.init();
  }

  private init(): void {
    this.uiManager.setOnGenerate((text) => {
      this.handleGenerate(text);
    });

    this.uiManager.setOnReshuffle(() => {
      this.sceneBuilder.reshuffle();
    });

    this.sceneBuilder.setOnSelect((info) => {
      this.uiManager.showDetail(info);
    });

    this.uiManager.setOnColorChange((id, color) => {
      this.sceneBuilder.updateObjectColor(id, color);
    });

    this.uiManager.setOnPositionChange((id, x, y, z) => {
      this.sceneBuilder.updateObjectPosition(id, x, y, z);
    });

    this.sceneBuilder.setOnFpsUpdate((fps) => {
      this.uiManager.updateFps(fps);
    });

    this.sceneBuilder.start();

    const defaultText = (document.getElementById('textInput') as HTMLTextAreaElement).value;
    if (defaultText) {
      this.handleGenerate(defaultText);
    }
  }

  private handleGenerate(text: string): void {
    this.uiManager.setInputEnabled(false);

    requestAnimationFrame(() => {
      const sceneData = parseText(text);
      this.sceneBuilder.buildScene(sceneData);
      this.uiManager.setInputEnabled(true);
      this.uiManager.showDetail(null);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
