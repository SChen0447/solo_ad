import * as THREE from 'three';
import type { SoundSourceConfig, SoundscapeConfig, SoundSourceInstance } from './types';
import { SceneManager } from './sceneManager';
import { AudioManager } from './audioManager';
import { InteractionManager } from './interactionManager';
import { ControlPanel } from './controlPanel';
import { MAX_SOURCES } from './presets';

class App {
  private sceneManager!: SceneManager;
  private audioManager!: AudioManager;
  private interactionManager!: InteractionManager;
  private controlPanel!: ControlPanel;
  
  private clock: THREE.Clock;
  private container: HTMLElement;
  private animationId: number | null = null;
  private isInitialized = false;

  constructor() {
    this.clock = new THREE.Clock();
    this.container = document.getElementById('canvas-container')!;
    
    this.setupStartButton();
  }

  private setupStartButton(): void {
    const startOverlay = document.getElementById('start-overlay')!;
    const startBtn = document.getElementById('start-btn')!;

    const start = async () => {
      startOverlay.classList.add('hidden');
      await this.init();
      setTimeout(() => {
        startOverlay.style.display = 'none';
      }, 500);
    };

    startBtn.addEventListener('click', start);
    startOverlay.addEventListener('click', (e) => {
      if (e.target === startOverlay || e.target === startBtn) {
        start();
      }
    });
  }

  private async init(): Promise<void> {
    if (this.isInitialized) return;
    
    this.sceneManager = new SceneManager(this.container);
    this.audioManager = new AudioManager();
    this.interactionManager = new InteractionManager(this.sceneManager, this.audioManager, this.container);
    this.controlPanel = new ControlPanel(this.audioManager, this.sceneManager);

    await this.audioManager.init();
    await this.audioManager.resume();

    this.controlPanel.onPresetLoad((config) => {
      this.loadSoundscape(config);
    });

    this.interactionManager.onSourceCreated(() => {
      this.updatePresetButtons();
    });

    this.interactionManager.onSourceRemoved(() => {
      this.updatePresetButtons();
    });

    window.addEventListener('resize', this.onResize.bind(this));

    this.isInitialized = true;
    this.animate();
  }

  private loadSoundscape(config: SoundscapeConfig): void {
    this.interactionManager.clearAllSources();

    const sourcesToCreate: SoundSourceConfig[] = [];
    
    for (const sourceConfig of config.sources) {
      if (this.sceneManager.getSourceCount() + sourcesToCreate.length >= MAX_SOURCES) {
        console.warn(`已达到最大音源数量限制 (${MAX_SOURCES})`);
        break;
      }
      sourcesToCreate.push(sourceConfig);
    }

    sourcesToCreate.forEach((sourceConfig, index) => {
      setTimeout(() => {
        const position = new THREE.Vector3(
          sourceConfig.position.x,
          sourceConfig.position.y,
          sourceConfig.position.z
        );
        
        const source = this.sceneManager.createSoundSource(sourceConfig.type, position);
        source.audioNodes = this.audioManager.createAudioNodes(sourceConfig.type, sourceConfig.volume);
        this.audioManager.updateSourcePosition(source, position.x, position.y, position.z);
      }, index * 100);
    });

    this.updatePresetButtons();
  }

  private updatePresetButtons(): void {
    const presetBtns = document.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      if (!btn.hasAttribute('data-active-preset')) {
        btn.style.background = '';
      }
    });
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (this.sceneManager) {
      this.sceneManager.update(deltaTime);
    }

    if (this.interactionManager) {
      this.interactionManager.update(deltaTime);
      this.interactionManager.updateTooltip();
    }

    if (this.sceneManager) {
      this.sceneManager.render();
    }
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    if (this.sceneManager) {
      this.sceneManager.onResize(width, height);
    }
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.interactionManager) {
      this.interactionManager.dispose();
    }
    
    if (this.sceneManager) {
      this.sceneManager.dispose();
    }
    
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});

export { App };
