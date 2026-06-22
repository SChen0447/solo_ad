import { SceneManager } from './sceneManager';
import { ModelLoader } from './modelLoader';

export class ControlPanel {
  private sceneManager: SceneManager;
  private modelLoader: ModelLoader;

  private metalnessSlider: HTMLInputElement;
  private metalnessValue: HTMLElement;
  private roughnessSlider: HTMLInputElement;
  private roughnessValue: HTMLElement;
  private ambientSlider: HTMLInputElement;
  private ambientValue: HTMLElement;

  private currentMetalness: number = 0.5;
  private currentRoughness: number = 0.3;
  private currentAmbient: number = 1.0;

  constructor(sceneManager: SceneManager, modelLoader: ModelLoader) {
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;

    this.metalnessSlider = document.getElementById('metalnessSlider') as HTMLInputElement;
    this.metalnessValue = document.getElementById('metalnessValue')!;
    this.roughnessSlider = document.getElementById('roughnessSlider') as HTMLInputElement;
    this.roughnessValue = document.getElementById('roughnessValue')!;
    this.ambientSlider = document.getElementById('ambientSlider') as HTMLInputElement;
    this.ambientValue = document.getElementById('ambientValue')!;

    this.setupEventListeners();
    this.updateDisplay();
  }

  private setupEventListeners(): void {
    this.metalnessSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.currentMetalness = value;
      this.updateMaterial();
      this.updateDisplay();
    });

    this.roughnessSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.currentRoughness = value;
      this.updateMaterial();
      this.updateDisplay();
    });

    this.ambientSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.currentAmbient = value;
      this.sceneManager.setAmbientIntensity(value);
      this.updateDisplay();
    });

    const sliders = [this.metalnessSlider, this.roughnessSlider, this.ambientSlider];
    sliders.forEach(slider => {
      slider.addEventListener('mousedown', () => {
        slider.style.transform = 'scale(0.99)';
      });
      slider.addEventListener('mouseup', () => {
        slider.style.transform = 'scale(1)';
      });
      slider.addEventListener('mouseleave', () => {
        slider.style.transform = 'scale(1)';
      });
    });
  }

  private updateMaterial(): void {
    this.modelLoader.setMaterialProperties(this.currentMetalness, this.currentRoughness);
  }

  private updateDisplay(): void {
    this.metalnessValue.textContent = this.currentMetalness.toFixed(2);
    this.roughnessValue.textContent = this.currentRoughness.toFixed(2);
    this.ambientValue.textContent = this.currentAmbient.toFixed(1);
  }

  public getMetalness(): number {
    return this.currentMetalness;
  }

  public getRoughness(): number {
    return this.currentRoughness;
  }

  public getAmbientIntensity(): number {
    return this.currentAmbient;
  }
}
