import { GalaxyParameters, DEFAULT_PARAMETERS } from './GalaxyGenerator';

export interface ControlPanelCallbacks {
  onParamsChange: (params: Partial<GalaxyParameters>) => void;
  onResetCamera: () => void;
  onExportPNG: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private callbacks: ControlPanelCallbacks;

  constructor(callbacks: ControlPanelCallbacks, initialParams: GalaxyParameters = DEFAULT_PARAMETERS) {
    this.callbacks = callbacks;
    this.container = this.createPanel(initialParams);
    document.body.appendChild(this.container);
  }

  private createPanel(params: GalaxyParameters): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = '';

    Object.assign(panel.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      width: '320px',
      height: '100vh',
      padding: '24px 20px',
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      zIndex: '100',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      fontFamily: "'Rajdhani', sans-serif",
      color: '#e0e0e0',
    });

    const title = this.createTitle();
    panel.appendChild(title);

    const particleGroup = this.createCardGroup('粒子参数', [
      this.createSlider('粒子数量', 'particleCount', params.particleCount, 500, 5000, 100),
      this.createSlider('旋转速度', 'rotationSpeed', params.rotationSpeed, 0.1, 2.0, 0.1),
      this.createSlider('旋臂数量', 'armCount', params.armCount, 2, 5, 1),
      this.createSlider('粒子大小', 'particleSize', params.particleSize, 0.5, 3.0, 0.1),
    ]);
    panel.appendChild(particleGroup);

    const colorGroup = this.createCardGroup('颜色设置', [
      this.createColorPicker('内圈颜色', 'innerColor', params.innerColor),
      this.createColorPicker('外圈颜色', 'outerColor', params.outerColor),
    ]);
    panel.appendChild(colorGroup);

    const actionGroup = this.createCardGroup('操作', [
      this.createButton('复位视角', this.callbacks.onResetCamera),
      this.createButton('导出 PNG', this.callbacks.onExportPNG),
    ]);
    panel.appendChild(actionGroup);

    const fpsDisplay = document.createElement('div');
    fpsDisplay.id = 'fps-display';
    Object.assign(fpsDisplay.style, {
      marginTop: 'auto',
      padding: '8px 12px',
      fontSize: '12px',
      fontFamily: "'Orbitron', monospace",
      color: 'rgba(255,255,255,0.4)',
      textAlign: 'center',
      letterSpacing: '2px',
    });
    fpsDisplay.textContent = 'FPS: --';
    panel.appendChild(fpsDisplay);

    return panel;
  }

  private createTitle(): HTMLElement {
    const title = document.createElement('div');
    Object.assign(title.style, {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '16px',
      fontWeight: '700',
      letterSpacing: '3px',
      textTransform: 'uppercase',
      color: '#FDB813',
      textAlign: 'center',
      padding: '8px 0 4px',
      borderBottom: '1px solid rgba(253,184,19,0.2)',
      marginBottom: '4px',
    });
    title.textContent = 'GALAXY GENERATOR';
    return title;
  }

  private createCardGroup(label: string, children: HTMLElement[]): HTMLElement {
    const card = document.createElement('div');
    Object.assign(card.style, {
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.5)',
      marginBottom: '2px',
    });
    header.textContent = label;
    card.appendChild(header);

    children.forEach(child => card.appendChild(child));
    return card;
  }

  private createSlider(
    label: string,
    paramKey: keyof GalaxyParameters,
    value: number,
    min: number,
    max: number,
    step: number
  ): HTMLElement {
    const wrapper = document.createElement('div');

    const labelRow = document.createElement('div');
    Object.assign(labelRow.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px',
    });

    const labelText = document.createElement('span');
    Object.assign(labelText.style, {
      fontSize: '13px',
      fontWeight: '500',
      color: 'rgba(255,255,255,0.7)',
    });
    labelText.textContent = label;

    const valueDisplay = document.createElement('span');
    valueDisplay.id = `value-${paramKey}`;
    Object.assign(valueDisplay.style, {
      fontSize: '13px',
      fontWeight: '600',
      fontFamily: "'Orbitron', monospace",
      color: '#FDB813',
      minWidth: '42px',
      textAlign: 'right',
    });
    valueDisplay.textContent = this.formatValue(value, step);

    labelRow.appendChild(labelText);
    labelRow.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.id = `slider-${paramKey}`;

    Object.assign(slider.style, {
      width: '100%',
      height: '4px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
    });

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueDisplay.textContent = this.formatValue(v, step);
      this.callbacks.onParamsChange({ [paramKey]: v });
    });

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      #slider-${paramKey}::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #FDB813;
        cursor: pointer;
        border: 2px solid rgba(11,12,16,0.8);
        box-shadow: 0 0 8px rgba(253,184,19,0.4);
        transition: box-shadow 0.2s ease-out;
      }
      #slider-${paramKey}::-webkit-slider-thumb:hover {
        box-shadow: 0 0 14px rgba(253,184,19,0.7);
      }
      #slider-${paramKey}::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #FDB813;
        cursor: pointer;
        border: 2px solid rgba(11,12,16,0.8);
        box-shadow: 0 0 8px rgba(253,184,19,0.4);
      }
    `;
    document.head.appendChild(styleTag);

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);
    return wrapper;
  }

  private createColorPicker(label: string, paramKey: keyof GalaxyParameters, value: string): HTMLElement {
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    });

    const labelText = document.createElement('span');
    Object.assign(labelText.style, {
      fontSize: '13px',
      fontWeight: '500',
      color: 'rgba(255,255,255,0.7)',
    });
    labelText.textContent = label;

    const pickerWrapper = document.createElement('div');
    Object.assign(pickerWrapper.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    });

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = value;
    picker.id = `color-${paramKey}`;
    Object.assign(picker.style, {
      width: '36px',
      height: '28px',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '6px',
      background: 'transparent',
      cursor: 'pointer',
      padding: '2px',
    });

    const hexDisplay = document.createElement('span');
    hexDisplay.id = `hex-${paramKey}`;
    Object.assign(hexDisplay.style, {
      fontSize: '12px',
      fontFamily: "'Orbitron', monospace",
      color: 'rgba(255,255,255,0.5)',
      letterSpacing: '1px',
    });
    hexDisplay.textContent = value.toUpperCase();

    picker.addEventListener('input', () => {
      hexDisplay.textContent = picker.value.toUpperCase();
      this.callbacks.onParamsChange({ [paramKey]: picker.value });
    });

    pickerWrapper.appendChild(picker);
    pickerWrapper.appendChild(hexDisplay);

    wrapper.appendChild(labelText);
    wrapper.appendChild(pickerWrapper);
    return wrapper;
  }

  private createButton(label: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = label;
    Object.assign(button.style, {
      width: '100%',
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '8px',
      color: 'rgba(255,255,255,0.75)',
      fontSize: '13px',
      fontWeight: '600',
      fontFamily: "'Rajdhani', sans-serif",
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      cursor: 'pointer',
      transition: 'all 0.25s ease-out',
    });

    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(253,184,19,0.12)';
      button.style.borderColor = 'rgba(253,184,19,0.3)';
      button.style.color = '#FDB813';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(255,255,255,0.06)';
      button.style.borderColor = 'rgba(255,255,255,0.12)';
      button.style.color = 'rgba(255,255,255,0.75)';
    });

    button.addEventListener('click', onClick);
    return button;
  }

  private formatValue(value: number, step: number): string {
    if (step >= 1) return String(Math.round(value));
    return value.toFixed(1);
  }

  updateFPS(fps: number): void {
    const display = document.getElementById('fps-display');
    if (display) {
      display.textContent = `FPS: ${Math.round(fps)}`;
      display.style.color = fps >= 50 ? 'rgba(100,255,150,0.6)' : fps >= 30 ? 'rgba(253,184,19,0.6)' : 'rgba(255,80,80,0.6)';
    }
  }

  dispose(): void {
    this.container.remove();
  }
}
