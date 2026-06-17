import { SunlightSimulator, SunlightUpdateResult, formatDateTime, SunlightParams } from './sunlightSimulator';

export interface UIControlElements {
  azimuthSlider: HTMLInputElement;
  altitudeSlider: HTMLInputElement;
  monthSlider: HTMLInputElement;
  azimuthValue: HTMLElement;
  altitudeValue: HTMLElement;
  monthValue: HTMLElement;
  datetimeDisplay: HTMLElement;
  intensityDisplay: HTMLElement;
  updateGlow: HTMLElement;
}

export class UIController {
  private elements: UIControlElements;
  private sunlightSimulator: SunlightSimulator;
  private glowTimeoutId: number | null = null;
  private throttledUpdate: () => void;
  private readonly THROTTLE_MS = 16;
  private readonly GLOW_DURATION_MS = 300;

  constructor(elements: UIControlElements, simulator: SunlightSimulator) {
    this.elements = elements;
    this.sunlightSimulator = simulator;

    let lastUpdate = 0;
    this.throttledUpdate = (): void => {
      const now = performance.now();
      if (now - lastUpdate >= this.THROTTLE_MS) {
        lastUpdate = now;
        this.performUpdate();
      }
    };

    this.bindEvents();
    this.syncInitialState();
  }

  private bindEvents(): void {
    const handleInput = (): void => {
      this.triggerGlow();
      this.throttledUpdate();
    };

    const handleChange = (): void => {
      this.performUpdate();
    };

    this.elements.azimuthSlider.addEventListener('input', handleInput);
    this.elements.altitudeSlider.addEventListener('input', handleInput);
    this.elements.monthSlider.addEventListener('input', handleInput);

    this.elements.azimuthSlider.addEventListener('change', handleChange);
    this.elements.altitudeSlider.addEventListener('change', handleChange);
    this.elements.monthSlider.addEventListener('change', handleChange);
  }

  private syncInitialState(): void {
    const initialParams = this.sunlightSimulator.getCurrentParams();
    this.elements.azimuthSlider.value = String(initialParams.azimuth);
    this.elements.altitudeSlider.value = String(initialParams.altitude);
    this.elements.monthSlider.value = String(initialParams.month);
    this.performUpdate();
  }

  private readSliderValues(): SunlightParams {
    return {
      azimuth: parseFloat(this.elements.azimuthSlider.value) || 0,
      altitude: parseFloat(this.elements.altitudeSlider.value) || 0,
      month: parseInt(this.elements.monthSlider.value, 10) || 1
    };
  }

  private performUpdate(): void {
    const params = this.readSliderValues();
    const result: SunlightUpdateResult = this.sunlightSimulator.updateLight(params);
    this.updateDisplays(result, params);
  }

  private updateDisplays(result: SunlightUpdateResult, params: SunlightParams): void {
    this.elements.azimuthValue.textContent = `${params.azimuth}°`;
    this.elements.altitudeValue.textContent = `${params.altitude}°`;
    this.elements.monthValue.textContent = `${params.month}月`;
    this.elements.datetimeDisplay.textContent = formatDateTime(result.dateTime);
    this.elements.intensityDisplay.textContent = `${Math.round(result.intensityPercent)}%`;
  }

  private triggerGlow(): void {
    if (this.glowTimeoutId !== null) {
      window.clearTimeout(this.glowTimeoutId);
    }

    this.elements.updateGlow.classList.add('active');

    this.glowTimeoutId = window.setTimeout(() => {
      this.elements.updateGlow.classList.remove('active');
      this.glowTimeoutId = null;
    }, this.GLOW_DURATION_MS);
  }

  public getCurrentParams(): SunlightParams {
    return this.readSliderValues();
  }
}

export function getControlElements(): UIControlElements {
  const azimuthSlider = document.getElementById('azimuth-slider') as HTMLInputElement;
  const altitudeSlider = document.getElementById('altitude-slider') as HTMLInputElement;
  const monthSlider = document.getElementById('month-slider') as HTMLInputElement;
  const azimuthValue = document.getElementById('azimuth-value') as HTMLElement;
  const altitudeValue = document.getElementById('altitude-value') as HTMLElement;
  const monthValue = document.getElementById('month-value') as HTMLElement;
  const datetimeDisplay = document.getElementById('datetime-display') as HTMLElement;
  const intensityDisplay = document.getElementById('intensity-display') as HTMLElement;
  const updateGlow = document.getElementById('update-glow') as HTMLElement;

  const missingElements: string[] = [];
  const checks: Record<string, Element | null> = {
    azimuthSlider, altitudeSlider, monthSlider,
    azimuthValue, altitudeValue, monthValue,
    datetimeDisplay, intensityDisplay, updateGlow
  };

  Object.entries(checks).forEach(([key, el]) => {
    if (!el) missingElements.push(key);
  });

  if (missingElements.length > 0) {
    throw new Error(`缺少必要的DOM元素: ${missingElements.join(', ')}`);
  }

  return {
    azimuthSlider,
    altitudeSlider,
    monthSlider,
    azimuthValue,
    altitudeValue,
    monthValue,
    datetimeDisplay,
    intensityDisplay,
    updateGlow
  };
}
