import axios from 'axios';
import { SceneManager } from './scene-manager';
import { MaterialType, TextureType } from './material-manager';
import { UIHandler, UIPreset } from './ui-handler';

class Application {
  private sceneManager: SceneManager;
  private uiHandler: UIHandler;
  private presets: UIPreset[] = [];
  private rafId: number | null = null;
  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;

  constructor() {
    const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    this.sceneManager = new SceneManager(canvas);
    this.uiHandler = new UIHandler();

    this.setupEventHandlers();
    this.loadPresetsFromServer();
    this.startRenderLoop();
  }

  private setupEventHandlers(): void {
    this.uiHandler.setMaterialChangeHandler((type: MaterialType) => {
      const state = this.uiHandler.getCurrentState();
      this.sceneManager.switchMaterial(type, state.textureType);
    });

    this.uiHandler.setTextureChangeHandler((type: TextureType) => {
      this.sceneManager.applyTexture(type);
    });

    this.uiHandler.setLightChangeHandler((pos) => {
      this.sceneManager.setLightPosition(pos);
    });

    this.uiHandler.setPresetSaveHandler(() => {
      this.savePreset();
    });

    this.uiHandler.setPresetLoadHandler((preset: UIPreset) => {
      this.loadPreset(preset);
    });
  }

  private async loadPresetsFromServer(): Promise<void> {
    try {
      const response = await axios.get<{ presets: UIPreset[] }>('/api/presets', {
        timeout: 3000,
      });
      this.presets = response.data.presets || [];
    } catch (err) {
      const fallback = localStorage.getItem('material-lab-presets');
      if (fallback) {
        try {
          this.presets = JSON.parse(fallback);
        } catch {
          this.presets = [];
        }
      }
    }
    this.uiHandler.renderPresets(this.presets);
  }

  private async savePreset(): Promise<void> {
    const state = this.uiHandler.getCurrentState();
    const defaultName = `预设 ${this.presets.length + 1}`;
    const name = window.prompt('请输入预设名称：', defaultName);
    if (name === null || name.trim() === '') return;

    const newPreset: UIPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      materialType: state.materialType,
      textureType: state.textureType,
      lightPosition: { ...state.lightPosition },
      createdAt: new Date().toISOString(),
    };

    try {
      await axios.post('/api/presets', newPreset, { timeout: 3000 });
    } catch (err) {
    }

    this.presets.push(newPreset);
    try {
      localStorage.setItem('material-lab-presets', JSON.stringify(this.presets));
    } catch {
    }
    this.uiHandler.renderPresets(this.presets);
  }

  private loadPreset(preset: UIPreset): void {
    this.sceneManager.switchMaterial(preset.materialType, preset.textureType);
    this.sceneManager.applyTexture(preset.textureType);
    this.sceneManager.setLightPosition(preset.lightPosition);
  }

  private startRenderLoop(): void {
    this.fpsLastTime = performance.now();
    const loop = () => {
      this.sceneManager.render();
      this.fpsFrames++;
      const now = performance.now();
      if (now - this.fpsLastTime >= 1000) {
        this.fpsFrames = 0;
        this.fpsLastTime = now;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  public dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.sceneManager.dispose();
  }
}

let app: Application | null = null;

window.addEventListener('DOMContentLoaded', () => {
  try {
    app = new Application();
  } catch (e) {
    console.error('Failed to initialize application:', e);
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
