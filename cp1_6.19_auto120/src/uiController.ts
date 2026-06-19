import { ParticleParams } from './particleSystem';

export interface UIControls {
  onParamsChange: (params: Partial<ParticleParams>) => void;
}

export class UIController {
  private hueSlider: HTMLInputElement;
  private sizeSlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private shapeSlider: HTMLInputElement;

  private hueValue: HTMLElement;
  private sizeValue: HTMLElement;
  private speedValue: HTMLElement;
  private shapeValue: HTMLElement;

  private labelElement: HTMLElement;

  private controls: UIControls;

  constructor(controls: UIControls) {
    this.controls = controls;

    this.hueSlider = document.getElementById('hue-slider') as HTMLInputElement;
    this.sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.shapeSlider = document.getElementById('shape-slider') as HTMLInputElement;

    this.hueValue = document.getElementById('hue-value') as HTMLElement;
    this.sizeValue = document.getElementById('size-value') as HTMLElement;
    this.speedValue = document.getElementById('speed-value') as HTMLElement;
    this.shapeValue = document.getElementById('shape-value') as HTMLElement;

    this.labelElement = document.getElementById('particle-label') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.hueSlider.addEventListener('input', () => {
      const value = parseFloat(this.hueSlider.value);
      this.hueValue.textContent = `${Math.round(value)}°`;
      this.controls.onParamsChange({ hue: value });
    });

    this.sizeSlider.addEventListener('input', () => {
      const value = parseFloat(this.sizeSlider.value);
      this.sizeValue.textContent = value.toFixed(2);
      this.controls.onParamsChange({ size: value });
    });

    this.speedSlider.addEventListener('input', () => {
      const value = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = value.toFixed(2);
      this.controls.onParamsChange({ speed: value });
    });

    this.shapeSlider.addEventListener('input', () => {
      const value = parseFloat(this.shapeSlider.value);
      this.shapeValue.textContent = value.toFixed(2);
      this.controls.onParamsChange({ shape: value });
    });
  }

  public showParticleLabel(
    id: number,
    color: string,
    pos: { x: number; y: number; z: number },
    screenX: number,
    screenY: number
  ): void {
    this.labelElement.innerHTML = `
      <div><strong>粒子 #${id}</strong></div>
      <div>颜色: ${color}</div>
      <div>位置: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})</div>
    `;
    this.labelElement.style.display = 'block';
    this.labelElement.style.left = `${screenX}px`;
    this.labelElement.style.top = `${screenY}px`;
  }

  public updateLabelPosition(screenX: number, screenY: number): void {
    if (this.labelElement.style.display === 'block') {
      this.labelElement.style.left = `${screenX}px`;
      this.labelElement.style.top = `${screenY}px`;
    }
  }

  public hideParticleLabel(): void {
    this.labelElement.style.display = 'none';
  }
}
