import { EmitterConfig } from './emitter';
import { PhysicsSceneType } from './particle';

type ConfigCallback = (config: Partial<EmitterConfig>) => void;

interface SliderDef {
  key: keyof EmitterConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: number;
}

const SCENES: { type: PhysicsSceneType; label: string }[] = [
  { type: 'gravity', label: '重力场' },
  { type: 'wind', label: '风场' },
  { type: 'vortex', label: '涡流场' }
];

export class Controls {
  private container: HTMLElement;
  private onConfigChange: ConfigCallback;
  private currentConfig: EmitterConfig;
  private activeColorPicker: 'start' | 'end' | null = null;

  constructor(container: HTMLElement, initialConfig: EmitterConfig, onConfigChange: ConfigCallback) {
    this.container = container;
    this.currentConfig = { ...initialConfig };
    this.onConfigChange = onConfigChange;
    this.render();
  }

  public updateConfig(config: Partial<EmitterConfig>): void {
    this.currentConfig = { ...this.currentConfig, ...config };
    this.syncValues();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="panel-header">
        <h1>✨ 粒子特效编辑器</h1>
        <p class="subtitle">实时预览沙盒 · 物理场景联动</p>
      </div>

      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🌐</span>
          <span class="section-title">物理场景</span>
        </div>
        <div class="section-divider"></div>
        <div class="scene-buttons" id="scene-buttons">
          ${SCENES.map(s => `
            <button class="scene-btn ${this.currentConfig.sceneType === s.type ? 'active' : ''}" 
                    data-scene="${s.type}">${s.label}</button>
          `).join('')}
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">⚡</span>
          <span class="section-title">粒子参数</span>
        </div>
        <div class="section-divider"></div>
        <div class="sliders-container">
          ${this.renderSlider({
            key: 'emissionRate', label: '发射率', min: 1, max: 100, step: 1,
            unit: '个/秒', value: this.currentConfig.emissionRate as number
          })}
          ${this.renderSlider({
            key: 'initialSpeed', label: '初始速度', min: 0, max: 500, step: 5,
            unit: 'px/s', value: this.currentConfig.initialSpeed as number
          })}
          ${this.renderSlider({
            key: 'lifetime', label: '生命周期', min: 0.5, max: 5, step: 0.1,
            unit: '秒', value: this.currentConfig.lifetime as number
          })}
          ${this.renderSlider({
            key: 'particleSize', label: '粒子大小', min: 2, max: 20, step: 1,
            unit: 'px', value: this.currentConfig.particleSize as number
          })}
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">🎨</span>
          <span class="section-title">颜色设置</span>
        </div>
        <div class="section-divider"></div>
        <div class="colors-row">
          ${this.renderColorPicker('start', '起始色', this.currentConfig.startColor)}
          <div class="color-arrow">→</div>
          ${this.renderColorPicker('end', '结束色', this.currentConfig.endColor)}
        </div>
      </div>

      <div class="section-card">
        <div class="section-header">
          <span class="section-icon">💥</span>
          <span class="section-title">碰撞设置</span>
        </div>
        <div class="section-divider"></div>
        <div class="toggle-row">
          <label class="toggle-label">
            <span class="toggle-text">粒子间碰撞</span>
            <span class="toggle-desc">启用后粒子之间相互弹开</span>
          </label>
          <div class="toggle-switch ${this.currentConfig.particleCollision ? 'on' : ''}" id="collision-toggle"></div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderSlider(def: SliderDef): string {
    const percent = ((def.value - def.min) / (def.max - def.min)) * 100;
    const displayValue = def.step < 1 ? def.value.toFixed(1) : def.value;
    return `
      <div class="slider-item">
        <div class="slider-header">
          <span class="slider-label">${def.label}</span>
          <span class="slider-value" data-value-for="${def.key}">${displayValue} <span class="slider-unit">${def.unit}</span></span>
        </div>
        <div class="slider-wrapper">
          <div class="slider-fill" data-fill-for="${def.key}" style="width: ${percent}%"></div>
          <input type="range" 
                 data-key="${def.key}"
                 min="${def.min}" 
                 max="${def.max}" 
                 step="${def.step}" 
                 value="${def.value}" />
        </div>
      </div>
    `;
  }

  private renderColorPicker(which: 'start' | 'end', label: string, color: string): string {
    return `
      <div class="color-card">
        <div class="color-card-label">${label}</div>
        <div class="color-picker-wrapper">
          <div class="color-picker-trigger" data-color-trigger="${which}">
            <div class="color-swatch" data-swatch="${which}" style="background: ${color};"></div>
          </div>
          <div class="color-hex" data-hex="${which}">${color.toUpperCase()}</div>
          <div class="color-picker-popup" data-popup="${which}">
            <canvas class="color-canvas" data-canvas="${which}" width="160" height="160"></canvas>
            <div class="color-input-row">
              <input type="text" data-hex-input="${which}" value="${color.toUpperCase()}" maxlength="7" />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    const sliders = this.container.querySelectorAll<HTMLInputElement>('input[type="range"][data-key]');
    sliders.forEach(slider => {
      slider.addEventListener('input', () => {
        const key = slider.dataset.key as keyof EmitterConfig;
        const val = parseFloat(slider.value);
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const percent = ((val - min) / (max - min)) * 100;
        const fill = this.container.querySelector(`[data-fill-for="${key}"]`) as HTMLElement;
        if (fill) fill.style.width = `${percent}%`;
        const step = parseFloat(slider.step);
        const display = step < 1 ? val.toFixed(1) : val.toString();
        const sliderItem = slider.closest('.slider-item');
        const unit = sliderItem?.querySelector(`[data-value-for="${key}"]`) as HTMLElement;
        if (unit) {
          const unitText = unit.querySelector('.slider-unit')?.textContent || '';
          unit.innerHTML = `${display} <span class="slider-unit">${unitText}</span>`;
        }
        this.currentConfig[key] = val as never;
        this.onConfigChange({ [key]: val } as Partial<EmitterConfig>);
      });
    });

    const sceneButtons = this.container.querySelectorAll<HTMLButtonElement>('.scene-btn');
    sceneButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sceneButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sceneType = btn.dataset.scene as PhysicsSceneType;
        this.currentConfig.sceneType = sceneType;
        this.onConfigChange({ sceneType });
      });
    });

    const collisionToggle = this.container.querySelector('#collision-toggle');
    if (collisionToggle) {
      collisionToggle.addEventListener('click', () => {
        const isOn = collisionToggle.classList.toggle('on');
        this.currentConfig.particleCollision = isOn;
        this.onConfigChange({ particleCollision: isOn });
      });
    }

    const triggers = this.container.querySelectorAll<HTMLElement>('[data-color-trigger]');
    triggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const which = trigger.dataset.colorTrigger as 'start' | 'end';
        this.closeColorPickers();
        const popup = this.container.querySelector(`[data-popup="${which}"]`) as HTMLElement;
        popup.classList.add('open');
        this.activeColorPicker = which;
        this.renderColorCanvas(which);
      });
    });

    document.addEventListener('click', (e) => {
      if (this.activeColorPicker && !(e.target as HTMLElement).closest('.color-picker-wrapper')) {
        this.closeColorPickers();
      }
    });

    const hexInputs = this.container.querySelectorAll<HTMLInputElement>('[data-hex-input]');
    hexInputs.forEach(input => {
      input.addEventListener('input', () => {
        const which = input.dataset.hexInput as 'start' | 'end';
        let val = input.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          this.updateColorValue(which, val.toLowerCase());
        }
      });
    });
  }

  private closeColorPickers(): void {
    const popups = this.container.querySelectorAll<HTMLElement>('.color-picker-popup');
    popups.forEach(p => p.classList.remove('open'));
    this.activeColorPicker = null;
  }

  private renderColorCanvas(which: 'start' | 'end'): void {
    const canvas = this.container.querySelector<HTMLCanvasElement>(`[data-canvas="${which}"]`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    const hueGradient = ctx.createLinearGradient(0, 0, w, 0);
    hueGradient.addColorStop(0, '#ff0000');
    hueGradient.addColorStop(0.17, '#ffff00');
    hueGradient.addColorStop(0.33, '#00ff00');
    hueGradient.addColorStop(0.5, '#00ffff');
    hueGradient.addColorStop(0.67, '#0000ff');
    hueGradient.addColorStop(0.83, '#ff00ff');
    hueGradient.addColorStop(1, '#ff0000');
    ctx.fillStyle = hueGradient;
    ctx.fillRect(0, 0, w, h);

    const whiteGradient = ctx.createLinearGradient(0, 0, 0, h);
    whiteGradient.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGradient;
    ctx.fillRect(0, 0, w, h);

    const blackGradient = ctx.createLinearGradient(0, 0, 0, h);
    blackGradient.addColorStop(0, 'rgba(0,0,0,0)');
    blackGradient.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = blackGradient;
    ctx.fillRect(0, 0, w, h);

    let isDragging = false;
    const pickColor = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(w - 1, Math.floor(clientX - rect.left)));
      const y = Math.max(0, Math.min(h - 1, Math.floor(clientY - rect.top)));
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
      this.updateColorValue(which, hex);
    };

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      pickColor(e.clientX, e.clientY);
    });
    canvas.addEventListener('mousemove', (e) => {
      if (isDragging) pickColor(e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; });
  }

  private updateColorValue(which: 'start' | 'end', color: string): void {
    const key = which === 'start' ? 'startColor' : 'endColor';
    this.currentConfig[key] = color as never;
    const swatch = this.container.querySelector<HTMLElement>(`[data-swatch="${which}"]`);
    if (swatch) swatch.style.background = color;
    const hexLabel = this.container.querySelector<HTMLElement>(`[data-hex="${which}"]`);
    if (hexLabel) hexLabel.textContent = color.toUpperCase();
    const hexInput = this.container.querySelector<HTMLInputElement>(`[data-hex-input="${which}"]`);
    if (hexInput) hexInput.value = color.toUpperCase();
    this.onConfigChange({ [key]: color } as Partial<EmitterConfig>);
  }

  private syncValues(): void {
    const sliderKeys: (keyof EmitterConfig)[] = ['emissionRate', 'initialSpeed', 'lifetime', 'particleSize'];
    sliderKeys.forEach(key => {
      const slider = this.container.querySelector<HTMLInputElement>(`input[data-key="${key}"]`);
      if (slider) {
        const val = this.currentConfig[key] as number;
        slider.value = val.toString();
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const percent = ((val - min) / (max - min)) * 100;
        const fill = this.container.querySelector(`[data-fill-for="${key}"]`) as HTMLElement;
        if (fill) fill.style.width = `${percent}%`;
      }
    });
  }
}
