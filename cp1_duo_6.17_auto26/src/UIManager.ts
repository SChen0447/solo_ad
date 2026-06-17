import type { ProbeData } from './tools/ProbeTool';

export interface UIEvents {
  onTemperatureToggle: (enabled: boolean) => void;
  onVelocityToggle: (enabled: boolean) => void;
  onPressureToggle: (enabled: boolean) => void;
  onProbeToggle: (enabled: boolean) => void;
  onTemperatureOpacity: (value: number) => void;
  onVelocityOpacity: (value: number) => void;
  onPressureOpacity: (value: number) => void;
  onGlyphScale: (value: number) => void;
  onViewChange: (view: 'front' | 'top' | 'iso') => void;
}

export class UIManager {
  private events: UIEvents;
  private states: {
    temperature: boolean;
    velocity: boolean;
    pressure: boolean;
    probe: boolean;
  };

  constructor(events: UIEvents) {
    this.events = events;
    this.states = {
      temperature: true,
      velocity: true,
      pressure: true,
      probe: true
    };
    this.initControls();
  }

  private initControls(): void {
    this.initToggle('toggle-temperature', 'temperature', this.events.onTemperatureToggle);
    this.initToggle('toggle-velocity', 'velocity', this.events.onVelocityToggle);
    this.initToggle('toggle-pressure', 'pressure', this.events.onPressureToggle);
    this.initToggle('toggle-probe', 'probe', this.events.onProbeToggle);

    this.initSlider('slider-temperature', this.events.onTemperatureOpacity);
    this.initSlider('slider-velocity', this.events.onVelocityOpacity);
    this.initSlider('slider-pressure', this.events.onPressureOpacity);
    this.initSlider('slider-glyph-scale', this.events.onGlyphScale);

    this.initViewButtons();
  }

  private initToggle(
    id: string,
    key: keyof typeof this.states,
    callback: (enabled: boolean) => void
  ): void {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.add('active');

    el.addEventListener('click', () => {
      this.states[key] = !this.states[key];
      el.classList.toggle('active', this.states[key]);
      callback(this.states[key]);
    });
  }

  private initSlider(id: string, callback: (value: number) => void): void {
    const el = document.getElementById(id) as HTMLInputElement;
    if (!el) return;

    const updateSliderBackground = () => {
      const value = parseFloat(el.value);
      const min = parseFloat(el.min);
      const max = parseFloat(el.max);
      const percent = ((value - min) / (max - min)) * 100;

      let color = '#4c9aff';
      if (id === 'slider-temperature') color = `rgb(${66 + percent * 1.2}, ${66 + percent * 0.5}, ${157 + percent * 0.5})`;
      else if (id === 'slider-velocity') color = `rgb(${51 + percent * 2}, ${204 - percent * 0.5}, ${85 - percent * 0.3})`;
      else if (id === 'slider-pressure') color = `rgb(${212 - percent * 0.5}, ${175 - percent * 0.5}, ${55 + percent * 0.5})`;

      el.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, #3a4a6a ${percent}%, #3a4a6a 100%)`;
    };

    updateSliderBackground();

    el.addEventListener('input', () => {
      const value = parseFloat(el.value);
      updateSliderBackground();
      callback(value);
    });
  }

  private initViewButtons(): void {
    const buttons = document.querySelectorAll('.view-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view as 'front' | 'top' | 'iso';
        if (view) this.events.onViewChange(view);
      });
    });
  }

  updateDataStatus(type: 'temperature' | 'velocity' | 'pressure', status: 'loading' | 'success' | 'error', error?: string): void {
    const el = document.getElementById(`data-${type}`);
    if (!el) return;

    const icon = el.querySelector('.data-icon') as HTMLElement;
    if (!icon) return;

    icon.classList.remove('loading', 'success', 'error');

    if (status === 'loading') {
      icon.classList.add('loading');
      icon.textContent = '⏳';
    } else if (status === 'success') {
      icon.classList.add('success');
      icon.textContent = '✓';
    } else {
      icon.classList.add('error');
      icon.textContent = '✗';
      if (error) this.showToast(`加载失败: ${error}`);
    }
  }

  updateProbeData(data: ProbeData | null): void {
    const panel = document.getElementById('probe-panel');
    if (!panel) return;

    if (!data) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');

    const posEl = document.getElementById('probe-position');
    const tempEl = document.getElementById('probe-temperature');
    const velEl = document.getElementById('probe-velocity');
    const presEl = document.getElementById('probe-pressure');

    if (posEl) {
      posEl.textContent = `(${data.position[0].toFixed(2)}, ${data.position[1].toFixed(2)}, ${data.position[2].toFixed(2)})`;
    }

    if (tempEl) {
      tempEl.textContent = data.temperature !== null ? `${data.temperature.toFixed(2)} °C` : '--';
    }

    if (velEl) {
      velEl.textContent = data.velocity !== null
        ? `(${data.velocity[0].toFixed(2)}, ${data.velocity[1].toFixed(2)}, ${data.velocity[2].toFixed(2)})`
        : '--';
    }

    if (presEl) {
      presEl.textContent = data.pressure !== null ? `${data.pressure.toFixed(2)} MPa` : '--';
    }
  }

  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
