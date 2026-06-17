import { Emitter, EmitterConfig } from './emitter';
import { Particle, EffectType } from './particle';

interface SliderDef {
  key: keyof EmitterConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const SLIDERS: SliderDef[] = [
  { key: 'maxParticles', label: '粒子数量', min: 100, max: 5000, step: 100 },
  { key: 'particleSize', label: '粒子大小', min: 1, max: 20, step: 1, unit: 'px' },
  { key: 'emissionRate', label: '发射速率', min: 10, max: 200, step: 5, unit: '/s' },
  { key: 'trailLength', label: '拖尾长度', min: 0, max: 50, step: 1 },
  { key: 'windStrength', label: '风场强度', min: 0, max: 100, step: 1 }
];

export class UIController {
  private emitter: Emitter;
  private container: HTMLElement;
  private panel: HTMLElement;
  private legendPanel: HTMLElement;
  private overlay: HTMLElement;
  private fpsDisplay: HTMLElement;
  private effectDisplay: HTMLElement;
  private dialKnob!: HTMLElement;
  private dialValue!: HTMLElement;
  private sliderElements: Map<keyof EmitterConfig, {
    input: HTMLInputElement;
    valueSpan: HTMLElement;
  }>;
  private isDraggingDial: boolean;

  constructor(container: HTMLElement, emitter: Emitter) {
    this.emitter = emitter;
    this.container = container;
    this.sliderElements = new Map();
    this.isDraggingDial = false;

    this.overlay = this.createOverlay();
    this.fpsDisplay = this.createFPSDisplay();
    this.effectDisplay = this.createEffectDisplay();
    this.panel = this.createControlPanel();
    this.legendPanel = this.createLegendPanel();

    this.overlay.appendChild(this.fpsDisplay);
    this.overlay.appendChild(this.effectDisplay);
    this.container.appendChild(this.overlay);
    this.container.appendChild(this.panel);
    this.container.appendChild(this.legendPanel);

    this.bindDialEvents();
    this.injectStyles();
  }

  private createOverlay(): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      pointer-events: none;
      z-index: 100;
      padding: 20px 24px;
    `;
    return el;
  }

  private createFPSDisplay(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'fps-counter';
    el.style.cssText = `
      font-family: 'Segoe UI', monospace;
      font-size: 22px;
      font-weight: 700;
      color: #00ff88;
      text-shadow: 0 0 12px rgba(0, 255, 136, 0.6);
      letter-spacing: 1px;
      margin-bottom: 8px;
      transition: color 0.2s;
    `;
    el.textContent = 'FPS: --';
    return el;
  }

  private createEffectDisplay(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'effect-display';
    el.style.cssText = `
      font-family: 'Segoe UI', sans-serif;
      font-size: 16px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      letter-spacing: 0.5px;
      padding: 6px 14px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      display: inline-block;
    `;
    el.textContent = this.emitter.getActiveEffectName();
    return el;
  }

  private createControlPanel(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'control-panel';
    el.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 16px 24px 20px;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px 24px 0 0;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    const slidersRow = document.createElement('div');
    slidersRow.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 20px 36px;
      align-items: center;
    `;

    for (const sliderDef of SLIDERS) {
      slidersRow.appendChild(this.createSlider(sliderDef));
    }

    const dialWrapper = this.createDial();
    slidersRow.appendChild(dialWrapper);

    const hintRow = document.createElement('div');
    hintRow.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
      margin-top: 4px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    `;
    const hints = [
      'Q/W/E/R — 火焰/冰霜/闪电/治愈',
      'A/D — 调整风向',
      'S — 关闭风场',
      '按住鼠标左键 — 发射粒子'
    ];
    for (const h of hints) {
      const span = document.createElement('span');
      span.textContent = h;
      hintRow.appendChild(span);
    }

    el.appendChild(slidersRow);
    el.appendChild(hintRow);
    return el;
  }

  private createSlider(def: SliderDef): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-group';
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 160px;
      max-width: 280px;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    `;

    const label = document.createElement('span');
    label.className = 'slider-label';
    label.textContent = def.label;
    label.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      letter-spacing: 0.3px;
    `;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    const currentVal = (this.emitter as any)[def.key];
    valueSpan.textContent = `${currentVal}${def.unit || ''}`;
    valueSpan.style.cssText = `
      font-family: 'Segoe UI', monospace;
      font-size: 14px;
      font-weight: 600;
      color: #7dd3fc;
      text-shadow: 0 0 8px rgba(125, 211, 252, 0.4);
      min-width: 60px;
      text-align: right;
      transition: color 0.15s, transform 0.15s;
    `;

    header.appendChild(label);
    header.appendChild(valueSpan);

    const track = document.createElement('div');
    track.style.cssText = `
      position: relative;
      height: 28px;
      display: flex;
      align-items: center;
      cursor: pointer;
    `;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(def.min);
    input.max = String(def.max);
    input.step = String(def.step);
    input.value = String(currentVal);
    input.style.cssText = `
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 6px;
      background: linear-gradient(90deg,
        rgba(125, 211, 252, 0.6) 0%,
        rgba(125, 211, 252, 0.6) ${((currentVal - def.min) / (def.max - def.min)) * 100}%,
        rgba(255, 255, 255, 0.12) ${((currentVal - def.min) / (def.max - def.min)) * 100}%,
        rgba(255, 255, 255, 0.12) 100%
      );
      border-radius: 3px;
      outline: none;
      transition: box-shadow 0.2s;
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      #slider-${def.key}::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 100%);
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 2px 8px rgba(125, 211, 252, 0.5);
        transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
      }
      #slider-${def.key}::-webkit-slider-thumb:hover {
        transform: scale(1.25);
        box-shadow: 0 4px 16px rgba(125, 211, 252, 0.8);
      }
      #slider-${def.key}:hover {
        box-shadow: 0 0 12px rgba(125, 211, 252, 0.2);
      }
    `;
    document.head.appendChild(styleSheet);
    input.id = `slider-${def.key}`;

    input.addEventListener('input', () => {
      const val = Number(input.value);
      this.emitter.setConfig({ [def.key]: val } as Partial<EmitterConfig>);
      valueSpan.textContent = `${val}${def.unit || ''}`;
      valueSpan.style.color = '#bae6fd';
      valueSpan.style.transform = 'scale(1.1)';
      setTimeout(() => {
        valueSpan.style.color = '#7dd3fc';
        valueSpan.style.transform = 'scale(1)';
      }, 150);
      const pct = ((val - def.min) / (def.max - def.min)) * 100;
      input.style.background = `linear-gradient(90deg,
        rgba(125, 211, 252, 0.6) 0%,
        rgba(125, 211, 252, 0.6) ${pct}%,
        rgba(255, 255, 255, 0.12) ${pct}%,
        rgba(255, 255, 255, 0.12) 100%
      )`;
    });

    track.appendChild(input);
    wrapper.appendChild(header);
    wrapper.appendChild(track);

    this.sliderElements.set(def.key, { input, valueSpan });
    return wrapper;
  }

  private createDial(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'dial-group';
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-width: 140px;
    `;

    const label = document.createElement('span');
    label.className = 'dial-label';
    label.textContent = '风场方向';
    label.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      letter-spacing: 0.3px;
    `;

    const dialContainer = document.createElement('div');
    dialContainer.style.cssText = `
      position: relative;
      width: 64px;
      height: 64px;
      cursor: grab;
    `;

    const dialTrack = document.createElement('div');
    dialTrack.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: 2px solid rgba(125, 211, 252, 0.3);
      box-shadow:
        inset 0 2px 8px rgba(0, 0, 0, 0.3),
        0 0 16px rgba(125, 211, 252, 0.15);
    `;

    const dialProgress = document.createElement('div');
    dialProgress.id = 'dial-progress';
    dialProgress.style.cssText = `
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      background: conic-gradient(
        rgba(125, 211, 252, 0.8) 0deg,
        rgba(167, 139, 250, 0.8) ${this.emitter.windDirection}deg,
        transparent ${this.emitter.windDirection}deg
      );
      mask: radial-gradient(transparent 24px, black 25px);
      -webkit-mask: radial-gradient(transparent 24px, black 25px);
      pointer-events: none;
      transition: background 0.1s;
    `;

    const knob = document.createElement('div');
    this.dialKnob = knob;
    knob.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 14px;
      height: 14px;
      margin-left: -7px;
      margin-top: -7px;
      background: linear-gradient(135deg, #ffffff 0%, #7dd3fc 100%);
      border-radius: 50%;
      transform-origin: 0 0;
      transform: rotate(${this.emitter.windDirection}deg) translateX(20px);
      box-shadow: 0 2px 10px rgba(125, 211, 252, 0.8);
      transition: transform 0.1s, box-shadow 0.15s;
      pointer-events: none;
    `;

    const centerDot = document.createElement('div');
    centerDot.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 8px;
      height: 8px;
      margin-left: -4px;
      margin-top: -4px;
      background: #7dd3fc;
      border-radius: 50%;
      box-shadow: 0 0 8px rgba(125, 211, 252, 0.6);
      pointer-events: none;
    `;

    dialContainer.appendChild(dialProgress);
    dialContainer.appendChild(dialTrack);
    dialContainer.appendChild(knob);
    dialContainer.appendChild(centerDot);

    this.dialValue = document.createElement('span');
    this.dialValue.className = 'dial-value';
    this.dialValue.textContent = `${this.emitter.windDirection}°`;
    this.dialValue.style.cssText = `
      font-family: 'Segoe UI', monospace;
      font-size: 13px;
      font-weight: 600;
      color: #7dd3fc;
      text-shadow: 0 0 6px rgba(125, 211, 252, 0.4);
      transition: color 0.15s, transform 0.15s;
    `;

    wrapper.appendChild(label);
    wrapper.appendChild(dialContainer);
    wrapper.appendChild(this.dialValue);
    return wrapper;
  }

  private bindDialEvents(): void {
    const dialContainer = this.dialKnob.parentElement?.parentElement;
    if (!dialContainer) return;

    const handleDial = (e: MouseEvent) => {
      const rect = dialContainer.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      angle = Math.round(angle);
      this.emitter.setConfig({ windDirection: angle });
      this.updateDialVisuals(angle);
    };

    dialContainer.addEventListener('mousedown', (e) => {
      this.isDraggingDial = true;
      dialContainer.style.cursor = 'grabbing';
      handleDial(e);
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDraggingDial) {
        handleDial(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDraggingDial) {
        this.isDraggingDial = false;
        dialContainer.style.cursor = 'grab';
      }
    });
  }

  updateDialVisuals(angle: number): void {
    this.dialKnob.style.transform = `rotate(${angle}deg) translateX(20px)`;
    const progress = document.getElementById('dial-progress');
    if (progress) {
      progress.style.background = `conic-gradient(
        rgba(125, 211, 252, 0.8) 0deg,
        rgba(167, 139, 250, 0.8) ${angle}deg,
        transparent ${angle}deg
      )`;
    }
    this.dialValue.textContent = `${angle}°`;
    this.dialValue.style.color = '#bae6fd';
    this.dialValue.style.transform = 'scale(1.1)';
    setTimeout(() => {
      this.dialValue.style.color = '#7dd3fc';
      this.dialValue.style.transform = 'scale(1)';
    }, 150);
  }

  private createLegendPanel(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'legend-panel';
    el.style.cssText = `
      position: absolute;
      top: 20px;
      right: 24px;
      z-index: 100;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      padding: 14px 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 180px;
    `;

    const title = document.createElement('div');
    title.textContent = '特效图例';
    title.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.6);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 4px;
    `;
    el.appendChild(title);

    const effects: EffectType[] = ['fire', 'ice', 'lightning', 'heal'];
    for (const effect of effects) {
      const row = document.createElement('div');
      row.className = 'legend-item';
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        padding: 4px 8px;
        margin: 0 -8px;
        border-radius: 8px;
        transition: background 0.15s;
      `;
      row.addEventListener('mouseenter', () => {
        row.style.background = 'rgba(255, 255, 255, 0.08)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = 'transparent';
      });
      row.addEventListener('click', () => {
        this.emitter.setActiveEffect(effect);
        this.updateEffectDisplay();
      });

      const gradient = Particle.getColorGradientStops(effect);
      const gradBar = document.createElement('div');
      gradBar.style.cssText = `
        width: 60px;
        height: 14px;
        border-radius: 7px;
        background: linear-gradient(90deg, ${gradient.join(', ')});
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
        flex-shrink: 0;
      `;

      const name = document.createElement('span');
      name.textContent = Emitter.getEffectName(effect);
      name.style.cssText = `
        font-size: 13px;
        color: rgba(255, 255, 255, 0.85);
        font-weight: 500;
      `;

      const keyLabel = document.createElement('span');
      const keyMap: Record<EffectType, string> = { fire: 'Q', ice: 'W', lightning: 'E', heal: 'R' };
      keyLabel.textContent = keyMap[effect];
      keyLabel.style.cssText = `
        margin-left: auto;
        font-family: 'Segoe UI', monospace;
        font-size: 11px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.4);
        background: rgba(255, 255, 255, 0.08);
        padding: 2px 6px;
        border-radius: 4px;
        min-width: 18px;
        text-align: center;
      `;

      row.appendChild(gradBar);
      row.appendChild(name);
      row.appendChild(keyLabel);
      el.appendChild(row);
    }

    return el;
  }

  updateFPS(fps: number): void {
    this.fpsDisplay.textContent = `FPS: ${fps}`;
    if (fps < 30) {
      this.fpsDisplay.style.color = '#ff5555';
      this.fpsDisplay.style.textShadow = '0 0 12px rgba(255, 85, 85, 0.8)';
      const now = performance.now();
      const pulse = Math.sin(now * 0.01) * 0.4 + 0.6;
      this.fpsDisplay.style.opacity = String(pulse);
    } else {
      this.fpsDisplay.style.color = '#00ff88';
      this.fpsDisplay.style.textShadow = '0 0 12px rgba(0, 255, 136, 0.6)';
      this.fpsDisplay.style.opacity = '1';
    }
  }

  updateEffectDisplay(): void {
    this.effectDisplay.textContent = this.emitter.getActiveEffectName();
  }

  updateWindDirectionSlider(): void {
    this.updateDialVisuals(this.emitter.windDirection);
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse-red {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .legend-item:hover .slider-label {
        color: #ffffff;
      }
    `;
    document.head.appendChild(style);
  }
}
