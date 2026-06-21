export interface GUIParameters {
  frequency: number;
  phaseOffset: number;
  waveSpeed: number;
}

interface GUIEvents {
  onFrequencyChange?: (value: number) => void;
  onPhaseChange?: (value: number) => void;
  onWaveSpeedChange?: (value: number) => void;
  onSnapshot?: () => HTMLCanvasElement | null;
}

export class WaveGUI {
  private container: HTMLElement;
  private panel!: HTMLDivElement;
  
  private frequencySlider!: HTMLDivElement;
  private frequencyValue!: HTMLSpanElement;
  
  private phaseKnob!: HTMLCanvasElement;
  private phaseValue!: HTMLSpanElement;
  private phaseAngle: number = 0;
  private isDraggingKnob: boolean = false;
  
  private waveSpeedSlider!: HTMLDivElement;
  private waveSpeedValue!: HTMLSpanElement;
  
  private snapshotButton!: HTMLButtonElement;
  private snapshotPreview!: HTMLDivElement;
  private snapshotTitle!: HTMLDivElement;
  private snapshotImage: HTMLCanvasElement | null = null;
  
  private events: GUIEvents;
  private params: GUIParameters;

  private animatingFrequency: { from: number; to: number; startTime: number; duration: number } | null = null;
  private animatingWaveSpeed: { from: number; to: number; startTime: number; duration: number } | null = null;

  constructor(container: HTMLElement, initialParams: GUIParameters, events: GUIEvents = {}) {
    this.container = container;
    this.params = { ...initialParams };
    this.events = events;
    this.phaseAngle = initialParams.phaseOffset;

    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 280px;
      padding: 24px;
      background: rgba(15, 25, 45, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 16px;
      border: 1px solid rgba(100, 180, 255, 0.2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      color: #e0f0ff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 100;
      user-select: none;
    `;

    const title = document.createElement('div');
    title.textContent = '声波控制面板';
    title.style.cssText = `
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #e0f0ff;
      letter-spacing: 1px;
    `;
    this.panel.appendChild(title);

    this.frequencySlider = this.createSlider(
      '频率 (Hz)',
      100, 2000, 50,
      initialParams.frequency,
      (value) => {
        this.params.frequency = value;
        this.animateValue('frequency', value);
        this.events.onFrequencyChange?.(value);
      }
    );
    this.frequencyValue = this.frequencySlider.querySelector('.value-display') as HTMLSpanElement;
    this.panel.appendChild(this.frequencySlider);

    const phaseSection = this.createPhaseKnob();
    this.panel.appendChild(phaseSection);

    this.waveSpeedSlider = this.createSlider(
      '波速 (单位/秒)',
      100, 500, 10,
      initialParams.waveSpeed,
      (value) => {
        this.params.waveSpeed = value;
        this.animateValue('waveSpeed', value);
        this.events.onWaveSpeedChange?.(value);
      }
    );
    this.waveSpeedValue = this.waveSpeedSlider.querySelector('.value-display') as HTMLSpanElement;
    this.panel.appendChild(this.waveSpeedSlider);

    this.snapshotButton = this.createSnapshotButton();
    this.panel.appendChild(this.snapshotButton);

    this.snapshotPreview = this.createSnapshotPreview();
    this.panel.appendChild(this.snapshotPreview);

    this.container.appendChild(this.panel);
    
    this.bindKnobEvents();
    this.animate();
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (value: number) => void
  ): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 20px;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      font-size: 13px;
      color: #a0c0e0;
    `;

    const valueEl = document.createElement('span');
    valueEl.className = 'value-display';
    valueEl.textContent = value.toString();
    valueEl.style.cssText = `
      font-family: monospace;
      font-size: 14px;
      font-weight: 600;
      color: #e0f0ff;
    `;

    header.appendChild(labelEl);
    header.appendChild(valueEl);
    container.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(to right, rgba(100, 180, 255, 0.5), rgba(100, 180, 255, 0.2));
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
      transition: box-shadow 0.2s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #64b4ff;
        cursor: pointer;
        border: 2px solid #e0f0ff;
        box-shadow: 0 0 0 rgba(100, 180, 255, 0);
        transition: box-shadow 0.2s ease, transform 0.1s ease;
      }
      input[type="range"]:hover::-webkit-slider-thumb {
        box-shadow: 0 0 8px rgba(100, 180, 255, 0.5);
      }
      input[type="range"]:active::-webkit-slider-thumb {
        transform: scale(0.9);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #64b4ff;
        cursor: pointer;
        border: 2px solid #e0f0ff;
        box-shadow: 0 0 0 rgba(100, 180, 255, 0);
        transition: box-shadow 0.2s ease, transform 0.1s ease;
      }
      input[type="range"]:hover::-moz-range-thumb {
        box-shadow: 0 0 8px rgba(100, 180, 255, 0.5);
      }
    `;
    container.appendChild(style);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      onChange(val);
    });

    slider.addEventListener('mouseenter', () => {
      slider.style.boxShadow = '0 0 8px rgba(100, 180, 255, 0.5)';
    });
    slider.addEventListener('mouseleave', () => {
      slider.style.boxShadow = 'none';
    });

    container.appendChild(slider);

    return container;
  }

  private createPhaseKnob(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    `;

    const label = document.createElement('div');
    label.textContent = '相位差 (°)';
    label.style.cssText = `
      font-size: 13px;
      color: #a0c0e0;
      margin-bottom: 12px;
      align-self: flex-start;
    `;
    container.appendChild(label);

    const knobContainer = document.createElement('div');
    knobContainer.style.cssText = `
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    this.phaseKnob = document.createElement('canvas');
    this.phaseKnob.width = 100;
    this.phaseKnob.height = 100;
    this.phaseKnob.style.cssText = `
      cursor: grab;
      transition: filter 0.2s ease;
    `;
    this.phaseKnob.className = 'phase-knob';
    
    knobContainer.appendChild(this.phaseKnob);

    const valueDisplay = document.createElement('div');
    valueDisplay.style.cssText = `
      position: absolute;
      font-family: monospace;
      font-size: 16px;
      font-weight: 600;
      color: #e0f0ff;
      pointer-events: none;
    `;
    valueDisplay.textContent = `${Math.round(this.phaseAngle)}°`;
    this.phaseValue = valueDisplay as HTMLSpanElement;
    knobContainer.appendChild(valueDisplay);

    container.appendChild(knobContainer);
    this.drawKnob();

    return container;
  }

  private drawKnob(): void {
    const ctx = this.phaseKnob.getContext('2d')!;
    const w = this.phaseKnob.width;
    const h = this.phaseKnob.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = 40;
    const innerRadius = 30;

    ctx.clearRect(0, 0, w, h);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const innerR = radius + 3;
      const outerR = radius + 8;
      
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(100, 180, 255, 0.8)' : 'rgba(100, 180, 255, 0.4)';
      ctx.lineWidth = i % 3 === 0 ? 2 : 1;
      ctx.stroke();
    }

    const angleRad = (this.phaseAngle / 360) * Math.PI * 2 - Math.PI / 2;
    
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(40, 60, 90, 0.9)');
    gradient.addColorStop(1, 'rgba(20, 35, 55, 0.9)');
    
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(angleRad) * (innerRadius - 5),
      cy + Math.sin(angleRad) * (innerRadius - 5)
    );
    ctx.strokeStyle = '#64b4ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angleRad) * (innerRadius - 8),
      cy + Math.sin(angleRad) * (innerRadius - 8),
      4, 0, Math.PI * 2
    );
    ctx.fillStyle = '#e0f0ff';
    ctx.fill();
  }

  private bindKnobEvents(): void {
    const onStart = (clientX: number, clientY: number) => {
      this.isDraggingKnob = true;
      this.phaseKnob.style.cursor = 'grabbing';
      this.updateKnobAngle(clientX, clientY);
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!this.isDraggingKnob) return;
      this.updateKnobAngle(clientX, clientY);
    };

    const onEnd = () => {
      this.isDraggingKnob = false;
      this.phaseKnob.style.cursor = 'grab';
    };

    this.phaseKnob.addEventListener('mousedown', (e) => {
      onStart(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', (e) => {
      onMove(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', onEnd);

    this.phaseKnob.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      onStart(touch.clientX, touch.clientY);
    }, { passive: false });
    document.addEventListener('touchmove', (e) => {
      if (!this.isDraggingKnob) return;
      const touch = e.touches[0];
      onMove(touch.clientX, touch.clientY);
    }, { passive: false });
    document.addEventListener('touchend', onEnd);
  }

  private updateKnobAngle(clientX: number, clientY: number): void {
    const rect = this.phaseKnob.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    const dx = clientX - cx;
    const dy = clientY - cy;
    
    let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    if (angle < 0) angle += 360;
    
    this.phaseAngle = Math.round(angle);
    this.params.phaseOffset = this.phaseAngle;
    this.phaseValue.textContent = `${this.phaseAngle}°`;
    this.drawKnob();
    
    this.events.onPhaseChange?.(this.phaseAngle);
  }

  private createSnapshotButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = '生成干涉图样快照';
    button.style.cssText = `
      width: 100%;
      padding: 12px;
      margin-top: 4px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, rgba(100, 180, 255, 0.3), rgba(100, 180, 255, 0.1));
      border: 1px solid rgba(100, 180, 255, 0.4);
      border-radius: 8px;
      color: #e0f0ff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.boxShadow = '0 0 12px rgba(100, 180, 255, 0.5)';
      button.style.borderColor = 'rgba(100, 180, 255, 0.7)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.boxShadow = 'none';
      button.style.borderColor = 'rgba(100, 180, 255, 0.4)';
    });
    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.97)';
    });
    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', () => {
      this.takeSnapshot();
    });

    return button;
  }

  private createSnapshotPreview(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: none;
      flex-direction: column;
      align-items: center;
    `;

    this.snapshotTitle = document.createElement('div');
    this.snapshotTitle.style.cssText = `
      font-size: 11px;
      color: #80a0c0;
      margin-bottom: 8px;
      font-family: monospace;
    `;
    container.appendChild(this.snapshotTitle);

    const imgContainer = document.createElement('div');
    imgContainer.style.cssText = `
      width: 100%;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid rgba(100, 180, 255, 0.3);
      background: rgba(0, 0, 0, 0.3);
    `;
    container.appendChild(imgContainer);

    return container;
  }

  private takeSnapshot(): void {
    const canvas = this.events.onSnapshot?.();
    if (!canvas) return;

    if (this.snapshotImage) {
      this.snapshotImage.remove();
    }

    this.snapshotImage = canvas;
    this.snapshotImage.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
    `;

    const imgContainer = this.snapshotPreview.querySelector('div:nth-child(2)') as HTMLDivElement;
    imgContainer.innerHTML = '';
    imgContainer.appendChild(this.snapshotImage);

    const now = new Date();
    const timestamp = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    this.snapshotTitle.textContent = `快照 ${timestamp}`;
    this.snapshotPreview.style.display = 'flex';
  }

  private animateValue(type: 'frequency' | 'waveSpeed', targetValue: number): void {
    const startTime = performance.now();
    const duration = 300;
    
    const currentValue = type === 'frequency' 
      ? this.animatingFrequency?.to ?? this.params.frequency
      : this.animatingWaveSpeed?.to ?? this.params.waveSpeed;

    if (type === 'frequency') {
      this.animatingFrequency = {
        from: currentValue,
        to: targetValue,
        startTime,
        duration
      };
    } else {
      this.animatingWaveSpeed = {
        from: currentValue,
        to: targetValue,
        startTime,
        duration
      };
    }
  }

  private animate = (): void => {
    const now = performance.now();

    if (this.animatingFrequency) {
      const { from, to, startTime, duration } = this.animatingFrequency;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = this.easeOutCubic(progress);
      const current = from + (to - from) * eased;
      
      this.frequencyValue.textContent = Math.round(current).toString();
      
      if (progress >= 1) {
        this.animatingFrequency = null;
      }
    }

    if (this.animatingWaveSpeed) {
      const { from, to, startTime, duration } = this.animatingWaveSpeed;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = this.easeOutCubic(progress);
      const current = from + (to - from) * eased;
      
      this.waveSpeedValue.textContent = Math.round(current).toString();
      
      if (progress >= 1) {
        this.animatingWaveSpeed = null;
      }
    }

    requestAnimationFrame(this.animate);
  };

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public setFrequency(value: number): void {
    this.params.frequency = value;
    const input = this.frequencySlider.querySelector('input[type="range"]') as HTMLInputElement;
    if (input) input.value = value.toString();
    this.frequencyValue.textContent = Math.round(value).toString();
  }

  public setPhaseOffset(value: number): void {
    this.phaseAngle = value;
    this.params.phaseOffset = value;
    this.phaseValue.textContent = `${Math.round(value)}°`;
    this.drawKnob();
  }

  public setWaveSpeed(value: number): void {
    this.params.waveSpeed = value;
    const input = this.waveSpeedSlider.querySelector('input[type="range"]') as HTMLInputElement;
    if (input) input.value = value.toString();
    this.waveSpeedValue.textContent = Math.round(value).toString();
  }

  public dispose(): void {
    this.panel.remove();
  }
}
