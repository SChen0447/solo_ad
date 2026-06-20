import { AudioEngine, type FrequencyData } from './audioEngine';
import { WaveRenderer } from './waveRenderer';
import { UIController } from './uiController';

class App {
  private container: HTMLElement;
  private audioEngine: AudioEngine;
  private waveRenderer: WaveRenderer;
  private uiController: UIController;
  
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  constructor() {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      throw new Error('Canvas container not found');
    }
    this.container = canvasContainer;
    
    this.audioEngine = new AudioEngine();
    this.waveRenderer = new WaveRenderer({
      container: this.container,
      maxHistorySize: 500
    });
    this.uiController = new UIController({
      container: document.body,
      audioEngine: this.audioEngine,
      waveRenderer: this.waveRenderer
    });
    
    this.setupCallbacks();
    this.start();
  }

  private setupCallbacks(): void {
    this.audioEngine.onFrequency((data: FrequencyData) => {
      this.waveRenderer.addFrequencyData(data);
    });
    
    window.addEventListener('resize', () => {
      this.waveRenderer.resize();
    }, { passive: true });
    
    window.addEventListener('beforeunload', () => {
      this.destroy();
    });
  }

  private start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }

  private animate(): void {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.waveRenderer.update(deltaTime);
    this.waveRenderer.render();
    
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  private destroy(): void {
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.audioEngine.destroy();
    this.waveRenderer.destroy();
    this.uiController.destroy();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    alert('应用初始化失败，请刷新页面重试。');
  }
});
