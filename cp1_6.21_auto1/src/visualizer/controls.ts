export interface ControlCallbacks {
  onFishDensityChange: (value: number) => void;
  onCurrentSpeedChange: (value: number) => void;
  onReset: () => void;
}

export class Controls {
  private fishDensitySlider: HTMLInputElement;
  private currentSpeedSlider: HTMLInputElement;
  private resetBtn: HTMLButtonElement;
  private fishDensityVal: HTMLElement;
  private currentSpeedVal: HTMLElement;
  private callbacks: ControlCallbacks;

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;

    this.fishDensitySlider = document.getElementById('fish-density') as HTMLInputElement;
    this.currentSpeedSlider = document.getElementById('current-speed') as HTMLInputElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.fishDensityVal = document.getElementById('fish-density-val')!;
    this.currentSpeedVal = document.getElementById('current-speed-val')!;

    this.fishDensitySlider.addEventListener('input', () => {
      const val = parseInt(this.fishDensitySlider.value, 10);
      this.fishDensityVal.textContent = String(val);
      this.callbacks.onFishDensityChange(val);
    });

    this.currentSpeedSlider.addEventListener('input', () => {
      const rawVal = parseInt(this.currentSpeedSlider.value, 10);
      const val = rawVal / 100;
      this.currentSpeedVal.textContent = val.toFixed(1) + 'x';
      this.callbacks.onCurrentSpeedChange(val);
    });

    this.resetBtn.addEventListener('click', () => {
      this.fishDensitySlider.value = '80';
      this.currentSpeedSlider.value = '100';
      this.fishDensityVal.textContent = '80';
      this.currentSpeedVal.textContent = '1.0x';
      this.callbacks.onReset();
    });
  }

  setValues(fishDensity: number, currentSpeed: number) {
    this.fishDensitySlider.value = String(fishDensity);
    this.currentSpeedSlider.value = String(Math.round(currentSpeed * 100));
    this.fishDensityVal.textContent = String(fishDensity);
    this.currentSpeedVal.textContent = currentSpeed.toFixed(1) + 'x';
  }
}
