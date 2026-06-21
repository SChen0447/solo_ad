import * as THREE from 'three';
import { GUI } from 'lil-gui';

export interface LightParams {
  horizontalAngle: number;
  intensity: number;
  colorTemperature: number;
}

export type LightUpdateCallback = (angle: number, intensity: number, color: THREE.Color) => void;

export class UIController {
  private gui: GUI;
  public params: LightParams = {
    horizontalAngle: 45,
    intensity: 0.7,
    colorTemperature: 4500
  };
  private updateCallback: LightUpdateCallback | null = null;

  constructor() {
    this.gui = new GUI({ title: '光照控制' });
  }

  public init(callback: LightUpdateCallback): void {
    this.updateCallback = callback;
    this.setupUI();
    this.positionGUI();
    this.notifyChange();
  }

  private setupUI(): void {
    this.gui.add(this.params, 'horizontalAngle', 0, 360, 1)
      .name('光源水平角')
      .onChange(() => this.onParamChange());

    this.gui.add(this.params, 'intensity', 0, 1, 0.01)
      .name('光源强度')
      .onChange(() => this.onParamChange())
      .onFinishChange(() => this.onParamChange());

    this.gui.add(this.params, 'colorTemperature', 2000, 6500, 100)
      .name('光照色温(K)')
      .onChange(() => this.onParamChange());

    this.gui.domElement.style.setProperty('font-family', "'Courier New', monospace");
  }

  private positionGUI(): void {
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.left = '20px';
    this.gui.domElement.style.bottom = '20px';
    this.gui.domElement.style.top = 'auto';
    this.gui.domElement.style.right = 'auto';
    this.gui.domElement.style.fontFamily = "'Courier New', monospace";
  }

  private onParamChange(): void {
    this.flashGUI();
    this.notifyChange();
  }

  private flashGUI(): void {
    this.gui.domElement.classList.remove('flash');
    void this.gui.domElement.offsetWidth;
    this.gui.domElement.classList.add('flash');
    const style = this.gui.domElement.style;
    const originalBg = style.getPropertyValue('--background-color');
    style.setProperty('--background-color', 'rgba(120, 120, 120, 0.8)');
    setTimeout(() => {
      style.setProperty('--background-color', originalBg || 'rgba(20, 20, 20, 0.8)');
    }, 200);
  }

  private notifyChange(): void {
    if (this.updateCallback) {
      const color = this.colorTemperatureToRGB(this.params.colorTemperature);
      this.updateCallback(
        this.params.horizontalAngle,
        this.params.intensity,
        color
      );
    }
  }

  private colorTemperatureToRGB(kelvin: number): THREE.Color {
    const temp = kelvin / 100;
    let red: number, green: number, blue: number;

    if (temp <= 66) {
      red = 255;
      green = temp;
      green = 99.4708025861 * Math.log(green) - 161.1195681661;
      if (temp <= 19) {
        blue = 0;
      } else {
        blue = temp - 10;
        blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      }
    } else {
      red = temp - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      green = temp - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
      blue = 255;
    }

    return new THREE.Color(
      this.clampRGB(red) / 255,
      this.clampRGB(green) / 255,
      this.clampRGB(blue) / 255
    );
  }

  private clampRGB(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  public getIntensity(): number {
    return this.params.intensity;
  }
}
