import { ParticleConfig, PhysicsScene } from './emitter';
import { RGB } from './particle';

export interface ControlsCallbacks {
  onConfigChange: (config: Partial<ParticleConfig>) => void;
  onSceneChange: (scene: PhysicsScene) => void;
  onCollisionToggle: (enabled: boolean) => void;
}

export class Controls {
  private container: HTMLElement;
  private callbacks: ControlsCallbacks;

  private startColor: RGB = { r: 255, g: 107, b: 107 };
  private endColor: RGB = { r: 255, g: 200, b: 150 };

  private startPickerOpen: boolean = false;
  private endPickerOpen: boolean = false;

  private startColorPanel!: HTMLElement;
  private endColorPanel!: HTMLElement;

  constructor(container: HTMLElement, callbacks: ControlsCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'control-panel';

    const title = document.createElement('h2');
    title.className = 'panel-title';
    title.textContent = '粒子编辑器';
    this.container.appendChild(title);

    this.renderSlider('发射率', 'emissionRate', 1, 100, 50, '粒子/秒');
    this.renderSlider('初始速度', 'initialSpeed', 0, 500, 150, 'px/s');
    this.renderSlider('生命周期', 'lifetime', 0.5, 5, 2, '秒', 0.1);
    this.renderSlider('粒子大小', 'size', 2, 20, 6, 'px', 0.5);

    this.renderColorPickers();
    this.renderSceneButtons();
    this.renderCollisionToggle();
  }

  private renderSlider(
    label: string,
    key: string,
    min: number,
    max: number,
    defaultValue: number,
    unit: string,
    step: number = 1
  ): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-group';

    const labelEl = document.createElement('label');
    labelEl.className = 'control-label';
    labelEl.innerHTML = `<span>${label}</span><span class="value-display" data-value="${key}">${defaultValue} ${unit}</span>`;
    wrapper.appendChild(labelEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = defaultValue.toString();
    slider.className = 'control-slider';
    slider.dataset.param = key;

    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      const display = wrapper.querySelector(`[data-value="${key}"]`);
      if (display) {
        display.textContent = `${value} ${unit}`;
      }
      const configKey = key as keyof ParticleConfig;
      this.callbacks.onConfigChange({ [configKey]: value } as Partial<ParticleConfig>);
    });

    wrapper.appendChild(slider);
    this.container.appendChild(wrapper);
  }

  private renderColorPickers(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-group';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.innerHTML = '<span>颜色渐变</span>';
    wrapper.appendChild(label);

    const colorsRow = document.createElement('div');
    colorsRow.className = 'color-row';

    const startColorBox = this.createColorPicker('start', this.startColor, '起始色');
    const endColorBox = this.createColorPicker('end', this.endColor, '结束色');

    colorsRow.appendChild(startColorBox);
    colorsRow.appendChild(endColorBox);
    wrapper.appendChild(colorsRow);
    this.container.appendChild(wrapper);

    this.startColorPanel = startColorBox.querySelector('.color-panel') as HTMLElement;
    this.endColorPanel = endColorBox.querySelector('.color-panel') as HTMLElement;

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.color-picker')) {
        this.closeAllPickers();
      }
    });
  }

  private createColorPicker(type: 'start' | 'end', color: RGB, label: string): HTMLElement {
    const picker = document.createElement('div');
    picker.className = 'color-picker';

    const colorLabel = document.createElement('span');
    colorLabel.className = 'color-label';
    colorLabel.textContent = label;
    picker.appendChild(colorLabel);

    const preview = document.createElement('div');
    preview.className = 'color-preview';
    preview.style.backgroundColor = this.rgbToHex(color);
    picker.appendChild(preview);

    const panel = document.createElement('div');
    panel.className = 'color-panel';
    this.buildColorPanel(panel, type, color);
    picker.appendChild(panel);

    preview.addEventListener('click', (e) => {
      e.stopPropagation();
      if (type === 'start') {
        this.startPickerOpen = !this.startPickerOpen;
        this.endPickerOpen = false;
        this.updatePickerVisibility();
      } else {
        this.endPickerOpen = !this.endPickerOpen;
        this.startPickerOpen = false;
        this.updatePickerVisibility();
      }
    });

    return picker;
  }

  private buildColorPanel(panel: HTMLElement, type: 'start' | 'end', initialColor: RGB): void {
    const pickerSize = 160;
    const hueHeight = 20;
    const magnifierSize = 80;

    const svCanvas = document.createElement('canvas');
    svCanvas.width = pickerSize;
    svCanvas.height = pickerSize;
    svCanvas.className = 'sv-canvas';
    panel.appendChild(svCanvas);

    const svCtx = svCanvas.getContext('2d')!;
    const hsl = this.rgbToHsl(initialColor);
    this.drawSaturationValue(svCtx, pickerSize, hsl.h);

    const hueCanvas = document.createElement('canvas');
    hueCanvas.width = pickerSize;
    hueCanvas.height = hueHeight;
    hueCanvas.className = 'hue-canvas';
    panel.appendChild(hueCanvas);

    const hueCtx = hueCanvas.getContext('2d')!;
    this.drawHueBar(hueCtx, pickerSize, hueHeight);

    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'hex-input';
    hexInput.value = this.rgbToHex(initialColor).toUpperCase();
    hexInput.maxLength = 7;
    panel.appendChild(hexInput);

    let currentHue = hsl.h;
    let currentSaturation = hsl.s;
    let currentValue = hsl.l;

    const magnifier = document.createElement('div');
    magnifier.className = 'color-magnifier';
    magnifier.style.width = `${magnifierSize}px`;
    magnifier.style.height = `${magnifierSize}px`;
    panel.appendChild(magnifier);

    const updateColor = () => {
      const rgb = this.hslToRgb(currentHue, currentSaturation, currentValue);
      const hex = this.rgbToHex(rgb);
      hexInput.value = hex.toUpperCase();

      const preview = panel.parentElement?.querySelector('.color-preview');
      if (preview) {
        (preview as HTMLElement).style.backgroundColor = hex;
      }

      if (type === 'start') {
        this.startColor = rgb;
        this.callbacks.onConfigChange({ startColor: rgb });
      } else {
        this.endColor = rgb;
        this.callbacks.onConfigChange({ endColor: rgb });
      }
    };

    let isDraggingSV = false;
    let isDraggingHue = false;

    svCanvas.addEventListener('mousedown', (e) => {
      isDraggingSV = true;
      this.updateSV(e, svCanvas, pickerSize, currentSaturation, currentValue, (s, v) => {
        currentSaturation = s;
        currentValue = v;
        updateColor();
      });
    });

    document.addEventListener('mousemove', (e) => {
      if (isDraggingSV) {
        this.updateSV(e, svCanvas, pickerSize, currentSaturation, currentValue, (s, v) => {
          currentSaturation = s;
          currentValue = v;
          updateColor();
          this.updateMagnifier(magnifier, svCtx, e, svCanvas, pickerSize);
        });
      }
    });

    svCanvas.addEventListener('mousemove', (e) => {
      this.updateMagnifier(magnifier, svCtx, e, svCanvas, pickerSize);
    });

    svCanvas.addEventListener('mouseenter', () => {
      magnifier.style.display = 'block';
    });

    svCanvas.addEventListener('mouseleave', () => {
      magnifier.style.display = 'none';
    });

    document.addEventListener('mouseup', () => {
      isDraggingSV = false;
      isDraggingHue = false;
    });

    hueCanvas.addEventListener('mousedown', (e) => {
      isDraggingHue = true;
      this.updateHue(e, hueCanvas, pickerSize, (h) => {
        currentHue = h;
        this.drawSaturationValue(svCtx, pickerSize, h);
        updateColor();
      });
    });

    document.addEventListener('mousemove', (e) => {
      if (isDraggingHue) {
        this.updateHue(e, hueCanvas, pickerSize, (h) => {
          currentHue = h;
          this.drawSaturationValue(svCtx, pickerSize, h);
          updateColor();
        });
      }
    });

    hexInput.addEventListener('change', () => {
      const hex = hexInput.value.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        const rgb = this.hexToRgb(hex);
        const hsl = this.rgbToHsl(rgb);
        currentHue = hsl.h;
        currentSaturation = hsl.s;
        currentValue = hsl.l;
        this.drawSaturationValue(svCtx, pickerSize, currentHue);
        updateColor();
      }
    });
  }

  private updateMagnifier(
    magnifier: HTMLElement,
    ctx: CanvasRenderingContext2D,
    e: MouseEvent,
    canvas: HTMLCanvasElement,
    size: number
  ): void {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const magnifierSize = 80;
    const zoom = 3;
    const sampleSize = magnifierSize / zoom;
    const srcX = Math.max(0, Math.min(size - sampleSize, x - sampleSize / 2));
    const srcY = Math.max(0, Math.min(size - sampleSize, y - sampleSize / 2));

    const magCanvas = magnifier.querySelector('canvas');
    let mCtx: CanvasRenderingContext2D;
    if (!magCanvas) {
      const c = document.createElement('canvas');
      c.width = magnifierSize;
      c.height = magnifierSize;
      magnifier.appendChild(c);
      mCtx = c.getContext('2d')!;
    } else {
      mCtx = magCanvas.getContext('2d')!;
    }

    mCtx.imageSmoothingEnabled = false;
    mCtx.clearRect(0, 0, magnifierSize, magnifierSize);
    mCtx.drawImage(
      ctx.canvas,
      srcX, srcY, sampleSize, sampleSize,
      0, 0, magnifierSize, magnifierSize
    );

    magnifier.style.left = `${x + 10}px`;
    magnifier.style.top = `${y - magnifierSize / 2}px`;
    magnifier.style.display = 'block';
  }

  private updateSV(
    e: MouseEvent,
    canvas: HTMLCanvasElement,
    size: number,
    _currentS: number,
    _currentV: number,
    callback: (s: number, v: number) => void
  ): void {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(size, e.clientX - rect.left));
    const y = Math.max(0, Math.min(size, e.clientY - rect.top));
    const s = x / size;
    const v = 1 - y / size;
    callback(s, v);
  }

  private updateHue(
    e: MouseEvent,
    canvas: HTMLCanvasElement,
    width: number,
    callback: (h: number) => void
  ): void {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(width, e.clientX - rect.left));
    const h = (x / width) * 360;
    callback(h);
  }

  private drawSaturationValue(ctx: CanvasRenderingContext2D, size: number, hue: number): void {
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const s = x / size;
        const v = 1 - y / size;
        const rgb = this.hslToRgb(hue, s, v);
        const idx = (y * size + x) * 4;
        data[idx] = rgb.r;
        data[idx + 1] = rgb.g;
        data[idx + 2] = rgb.b;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private drawHueBar(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const hue = (i / steps) * 360;
      const rgb = this.hslToRgb(hue, 1, 0.5);
      gradient.addColorStop(i / steps, `rgb(${rgb.r},${rgb.g},${rgb.b})`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private updatePickerVisibility(): void {
    if (this.startColorPanel) {
      this.startColorPanel.classList.toggle('open', this.startPickerOpen);
    }
    if (this.endColorPanel) {
      this.endColorPanel.classList.toggle('open', this.endPickerOpen);
    }
  }

  private closeAllPickers(): void {
    this.startPickerOpen = false;
    this.endPickerOpen = false;
    this.updatePickerVisibility();
  }

  private renderSceneButtons(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-group';

    const label = document.createElement('label');
    label.className = 'control-label';
    label.innerHTML = '<span>物理场景</span>';
    wrapper.appendChild(label);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'scene-buttons';

    const scenes: { key: PhysicsScene; label: string }[] = [
      { key: 'gravity', label: '重力场' },
      { key: 'wind', label: '风场' },
      { key: 'vortex', label: '涡流场' }
    ];

    scenes.forEach((scene, index) => {
      const btn = document.createElement('button');
      btn.className = 'scene-btn';
      btn.textContent = scene.label;
      btn.dataset.scene = scene.key;
      if (index === 0) btn.classList.add('active');

      btn.addEventListener('click', () => {
        document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.callbacks.onSceneChange(scene.key);
      });

      btnGroup.appendChild(btn);
    });

    wrapper.appendChild(btnGroup);
    this.container.appendChild(wrapper);
  }

  private renderCollisionToggle(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'control-group';

    const toggleRow = document.createElement('div');
    toggleRow.className = 'toggle-row';

    const label = document.createElement('span');
    label.className = 'toggle-label';
    label.textContent = '粒子间碰撞';
    toggleRow.appendChild(label);

    const toggle = document.createElement('div');
    toggle.className = 'toggle-switch';
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      this.callbacks.onCollisionToggle(toggle.classList.contains('active'));
    });

    const slider = document.createElement('div');
    slider.className = 'toggle-slider';
    toggle.appendChild(slider);

    toggleRow.appendChild(toggle);
    wrapper.appendChild(toggleRow);
    this.container.appendChild(wrapper);
  }

  private rgbToHex(rgb: RGB): string {
    return '#' + [rgb.r, rgb.g, rgb.b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private hexToRgb(hex: string): RGB {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  private rgbToHsl(rgb: RGB): { h: number; s: number; l: number } {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): RGB {
    h = h % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }
}
