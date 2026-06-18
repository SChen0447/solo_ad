import { NeuronManager, Neuron, NeuronType } from './NeuronManager';
import { SignalSimulator } from './SignalSimulator';
import * as THREE from 'three';

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

const GLOBAL_SLIDERS: SliderConfig[] = [
  { key: 'propagationSpeed', label: '传播速度', min: 0.5, max: 10, step: 0.1, default: 2.5, unit: 'm/s' },
  { key: 'signalStrength', label: '信号强度', min: 10, max: 200, step: 1, default: 100, unit: 'mV' },
  { key: 'randomBifurcationWeight', label: '随机分岔权重', min: 0, max: 2, step: 0.05, default: 0.5 },
];

const NEURON_SLIDERS: SliderConfig[] = [
  { key: 'membraneThreshold', label: '膜电位阈值', min: -80, max: -20, step: 1, default: -55, unit: 'mV' },
  { key: 'refractoryPeriod', label: '不应期时长', min: 0.1, max: 3, step: 0.05, default: 0.5, unit: 's' },
];

const NEURON_TYPES: { value: NeuronType; label: string; color: string }[] = [
  { value: 'sensory', label: '感觉神经元', color: '#44ff88' },
  { value: 'inter', label: '中间神经元', color: '#8866ff' },
  { value: 'motor', label: '运动神经元', color: '#ff6688' },
];

export class UIPanel {
  private container: HTMLElement;
  private neuronManager: NeuronManager;
  private signalSimulator: SignalSimulator;

  private panel!: HTMLDivElement;
  private panelHeader!: HTMLDivElement;
  private panelContent!: HTMLDivElement;
  private isCollapsed: boolean = false;

  private globalSlidersContainer!: HTMLDivElement;
  private neuronSection!: HTMLDivElement;
  private neuronTypeSelect!: HTMLSelectElement;
  private neuronRadiusSlider!: HTMLInputElement;
  private neuronSlidersContainer!: HTMLDivElement;
  private synapseWeightSlider!: HTMLInputElement;

  private toolbar!: HTMLDivElement;
  private mode: 'idle' | 'add' | 'connect' = 'idle';
  private selectedNeuronType: NeuronType = 'inter';
  private selectedRadius: number = 0.6;

  private tooltip!: HTMLDivElement;

  constructor(
    container: HTMLElement,
    neuronManager: NeuronManager,
    signalSimulator: SignalSimulator
  ) {
    this.container = container;
    this.neuronManager = neuronManager;
    this.signalSimulator = signalSimulator;
    this.neuronManager.onNeuronSelected = this.onNeuronSelected.bind(this);

    this.createStyles();
    this.createTooltip();
    this.createToolbar();
    this.createPanel();
    this.bindGlobalSliders();
  }

  private createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .glass-panel {
        background: rgba(20, 20, 50, 0.55);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(120, 140, 255, 0.25);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      .glass-btn {
        background: rgba(80, 100, 200, 0.3);
        border: 1px solid rgba(120, 140, 255, 0.4);
        color: #ccddff;
        padding: 8px 14px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: inherit;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .glass-btn:hover {
        background: rgba(100, 130, 230, 0.5);
        border-color: rgba(150, 170, 255, 0.6);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(80, 120, 255, 0.3);
      }
      .glass-btn:active {
        transform: translateY(0);
      }
      .glass-btn.active {
        background: rgba(130, 160, 255, 0.55);
        border-color: rgba(170, 190, 255, 0.8);
        color: #ffffff;
        box-shadow: 0 0 20px rgba(120, 150, 255, 0.4);
      }
      .glass-btn.danger {
        background: rgba(200, 70, 100, 0.3);
        border-color: rgba(255, 100, 130, 0.4);
      }
      .glass-btn.danger:hover {
        background: rgba(220, 90, 120, 0.5);
      }
      .glass-btn.success {
        background: rgba(70, 180, 120, 0.3);
        border-color: rgba(100, 220, 150, 0.4);
      }
      .glass-btn.success:hover {
        background: rgba(90, 200, 140, 0.5);
      }

      .slider-container {
        margin-bottom: 14px;
      }
      .slider-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        color: #aabbdd;
        font-size: 12px;
      }
      .slider-value {
        color: #88aaff;
        font-weight: 600;
        font-size: 12px;
      }
      .slider-wrapper {
        position: relative;
      }
      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(90deg, rgba(80, 120, 255, 0.6), rgba(160, 100, 255, 0.6));
        outline: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #aaccff, #8888ff);
        border: 2px solid rgba(200, 220, 255, 0.8);
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(100, 140, 255, 0.5);
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 12px rgba(130, 160, 255, 0.8);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #aaccff, #8888ff);
        border: 2px solid rgba(200, 220, 255, 0.8);
        cursor: pointer;
      }

      .section-title {
        color: #ddeeff;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(120, 140, 255, 0.2);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .section-title::before {
        content: '';
        width: 3px;
        height: 14px;
        background: linear-gradient(180deg, #88aaff, #aa66ff);
        border-radius: 2px;
      }

      select.glass-select {
        background: rgba(40, 50, 90, 0.6);
        border: 1px solid rgba(120, 140, 255, 0.35);
        color: #ccddff;
        padding: 7px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
        transition: all 0.2s;
        outline: none;
        width: 100%;
      }
      select.glass-select:hover {
        border-color: rgba(150, 170, 255, 0.6);
      }
      select.glass-select:focus {
        border-color: rgba(170, 190, 255, 0.8);
        box-shadow: 0 0 10px rgba(120, 150, 255, 0.3);
      }
      select.glass-select option {
        background: rgba(20, 25, 50, 0.95);
        color: #ccddff;
      }

      .slider-tooltip {
        position: fixed;
        pointer-events: none;
        background: rgba(30, 40, 80, 0.95);
        color: #ddeeff;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        border: 1px solid rgba(120, 140, 255, 0.4);
        transform: translate(-50%, -140%);
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.15s;
        white-space: nowrap;
        font-weight: 600;
        backdrop-filter: blur(4px);
      }
      .slider-tooltip.show {
        opacity: 1;
      }

      .panel-toggle {
        position: absolute;
        left: -36px;
        top: 16px;
        width: 32px;
        height: 32px;
        background: rgba(20, 20, 50, 0.55);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(120, 140, 255, 0.25);
        border-right: none;
        border-radius: 10px 0 0 10px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #aabbdd;
        transition: all 0.3s;
        font-size: 16px;
      }
      .panel-toggle:hover {
        background: rgba(40, 50, 90, 0.7);
        color: #ddeeff;
      }

      .hint-box {
        background: rgba(60, 80, 150, 0.2);
        border: 1px solid rgba(120, 140, 255, 0.2);
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 11px;
        color: #99bbdd;
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .neuron-type-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
        vertical-align: middle;
      }

      .btn-group {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .empty-hint {
        color: #7788aa;
        font-size: 12px;
        text-align: center;
        padding: 16px 8px;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }

  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'slider-tooltip';
    document.body.appendChild(this.tooltip);
  }

  private createToolbar(): void {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'glass-panel';
    this.toolbar.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      padding: 10px 14px;
      z-index: 100;
    `;

    const addBtn = this.createButton('＋ 添加神经元', 'add');
    addBtn.onclick = () => this.toggleMode('add');

    const connectBtn = this.createButton('⇄ 连接模式', 'connect');
    connectBtn.onclick = () => this.toggleMode('connect');

    const triggerBtn = this.createButton('⚡ 触发信号', 'trigger', 'success');
    triggerBtn.onclick = () => this.triggerSelectedNeuron();

    const clearBtn = this.createButton('✕ 清除信号', 'clear', 'danger');
    clearBtn.onclick = () => this.signalSimulator.clearAllSignals();

    this.toolbar.appendChild(addBtn);
    this.toolbar.appendChild(connectBtn);
    this.toolbar.appendChild(triggerBtn);
    this.toolbar.appendChild(clearBtn);

    this.container.appendChild(this.toolbar);

    const presetHint = document.createElement('div');
    presetHint.className = 'glass-panel';
    presetHint.style.cssText = `
      position: fixed;
      top: 90px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 16px;
      z-index: 99;
      color: #99bbdd;
      font-size: 12px;
    `;
    presetHint.innerHTML = '🖱️ <b>左键</b> 地面放置/选中 · <b>连接模式</b> 下点击两个节点建立连接 · <b>右键拖拽</b> 平移 · <b>滚轮</b> 缩放';
    this.container.appendChild(presetHint);
  }

  private createButton(label: string, _key: string, variant?: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'glass-btn' + (variant ? ` ${variant}` : '');
    btn.textContent = label;
    btn.dataset.mode = _key;
    return btn;
  }

  private toggleMode(mode: 'add' | 'connect'): void {
    if (this.mode === mode) {
      this.mode = 'idle';
    } else {
      this.mode = mode;
    }

    const buttons = this.toolbar.querySelectorAll('.glass-btn') as NodeListOf<HTMLButtonElement>;
    buttons.forEach((btn) => {
      if (btn.dataset.mode === 'add' || btn.dataset.mode === 'connect') {
        btn.classList.toggle('active', btn.dataset.mode === this.mode);
      }
    });

    if (this.mode === 'add') {
      this.showAddDialog();
    }
  }

  private showAddDialog(): void {
    const existing = document.getElementById('neuron-add-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'neuron-add-dialog';
    dialog.className = 'glass-panel';
    dialog.style.cssText = `
      position: fixed;
      top: 160px;
      left: 50%;
      transform: translateX(-50%);
      padding: 16px 18px;
      z-index: 98;
      min-width: 280px;
    `;

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = '放置神经元';
    dialog.appendChild(title);

    const hint = document.createElement('div');
    hint.className = 'hint-box';
    hint.textContent = '选择类型和半径后，点击地面网格放置神经元节点';
    dialog.appendChild(hint);

    const typeLabel = document.createElement('div');
    typeLabel.className = 'slider-label';
    typeLabel.innerHTML = `<span>神经元类型</span>`;
    dialog.appendChild(typeLabel);

    this.neuronTypeSelect = document.createElement('select');
    this.neuronTypeSelect.className = 'glass-select';
    NEURON_TYPES.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = t.label;
      this.neuronTypeSelect.appendChild(opt);
    });
    this.neuronTypeSelect.value = this.selectedNeuronType;
    this.neuronTypeSelect.onchange = () => {
      this.selectedNeuronType = this.neuronTypeSelect.value as NeuronType;
    };
    dialog.appendChild(this.neuronTypeSelect);

    const spacer = document.createElement('div');
    spacer.style.height = '12px';
    dialog.appendChild(spacer);

    const radiusContainer = document.createElement('div');
    radiusContainer.className = 'slider-container';
    const radiusLabel = document.createElement('div');
    radiusLabel.className = 'slider-label';
    const radiusValue = document.createElement('span');
    radiusValue.className = 'slider-value';
    radiusValue.textContent = `${this.selectedRadius.toFixed(2)}`;
    radiusLabel.innerHTML = `<span>节点半径</span>`;
    radiusLabel.appendChild(radiusValue);
    radiusContainer.appendChild(radiusLabel);

    this.neuronRadiusSlider = document.createElement('input');
    this.neuronRadiusSlider.type = 'range';
    this.neuronRadiusSlider.min = '0.3';
    this.neuronRadiusSlider.max = '1.5';
    this.neuronRadiusSlider.step = '0.05';
    this.neuronRadiusSlider.value = String(this.selectedRadius);
    this.attachSliderTooltip(this.neuronRadiusSlider, radiusValue, '');
    this.neuronRadiusSlider.oninput = () => {
      this.selectedRadius = parseFloat(this.neuronRadiusSlider.value);
      radiusValue.textContent = `${this.selectedRadius.toFixed(2)}`;
    };
    radiusContainer.appendChild(this.neuronRadiusSlider);
    dialog.appendChild(radiusContainer);

    const btnRow = document.createElement('div');
    btnRow.className = 'btn-group';
    btnRow.style.marginTop = '8px';
    btnRow.style.justifyContent = 'flex-end';

    const cancelBtn = this.createButton('取消', 'cancel', 'danger');
    cancelBtn.onclick = () => {
      dialog.remove();
      this.mode = 'idle';
      const buttons = this.toolbar.querySelectorAll('.glass-btn') as NodeListOf<HTMLButtonElement>;
      buttons.forEach((btn) => btn.classList.remove('active'));
      this.setupGroundClickListener(null);
    };

    const confirmBtn = this.createButton('开始放置', 'confirm', 'success');
    confirmBtn.onclick = () => {
      this.setupGroundClickListener((point) => {
        this.neuronManager.createNeuron(point, this.selectedNeuronType, this.selectedRadius);
      });
      dialog.remove();
    };

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    dialog.appendChild(btnRow);

    this.container.appendChild(dialog);
  }

  private setupGroundClickListener(callback: ((point: THREE.Vector3) => void) | null): void {
    const scene = (this.neuronManager as any).threeScene as any;
    if (callback) {
      scene.onGroundClick = (point: THREE.Vector3) => {
        callback(point);
      };
      scene.onObjectClick = (intersects: THREE.Intersection[]) => {
        for (const hit of intersects) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj) {
            if (obj.userData.neuronId) {
              (this.neuronManager as any).handleNeuronClick(obj.userData.neuronId);
              return;
            }
            obj = obj.parent;
          }
        }
      };
    } else {
      scene.onGroundClick = (this.neuronManager as any).handleGroundClick.bind(this.neuronManager);
      scene.onObjectClick = (this.neuronManager as any).handleObjectClick.bind(this.neuronManager);
    }
  }

  private triggerSelectedNeuron(): void {
    if (this.neuronManager.selectedNeuronId) {
      this.signalSimulator.triggerSignal(this.neuronManager.selectedNeuronId);
    } else {
      alert('请先选中一个神经元节点');
    }
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'glass-panel';
    this.panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      padding: 18px 18px 16px;
      z-index: 100;
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
    `;

    const toggle = document.createElement('div');
    toggle.className = 'panel-toggle';
    toggle.textContent = '◂';
    toggle.onclick = () => this.togglePanel();
    this.panel.appendChild(toggle);

    this.panelHeader = document.createElement('div');
    this.panelHeader.style.cssText = `
      font-size: 15px;
      font-weight: 700;
      color: #ddeeff;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    this.panelHeader.innerHTML = `
      <span style="font-size: 18px;">🧠</span>
      <span>神经信号控制台</span>
    `;
    this.panel.appendChild(this.panelHeader);

    this.panelContent = document.createElement('div');
    this.panel.appendChild(this.panelContent);

    this.createGlobalSection();
    this.createNeuronSection();

    this.container.appendChild(this.panel);
  }

  private togglePanel(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.panel.style.transform = 'translateX(320px)';
      this.panel.style.opacity = '0.3';
      const toggle = this.panel.querySelector('.panel-toggle') as HTMLDivElement;
      if (toggle) toggle.textContent = '▸';
    } else {
      this.panel.style.transform = 'translateX(0)';
      this.panel.style.opacity = '1';
      const toggle = this.panel.querySelector('.panel-toggle') as HTMLDivElement;
      if (toggle) toggle.textContent = '◂';
    }
  }

  private createGlobalSection(): void {
    const section = document.createElement('div');
    section.style.marginBottom = '18px';

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = '全局参数';
    section.appendChild(title);

    this.globalSlidersContainer = document.createElement('div');
    section.appendChild(this.globalSlidersContainer);

    GLOBAL_SLIDERS.forEach((config) => {
      this.createSlider(this.globalSlidersContainer, config, (value) => {
        this.updateGlobalParam(config.key, value);
      });
    });

    this.panelContent.appendChild(section);
  }

  private createNeuronSection(): void {
    this.neuronSection = document.createElement('div');

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = '选中节点';
    this.neuronSection.appendChild(title);

    this.neuronSlidersContainer = document.createElement('div');
    this.neuronSection.appendChild(this.neuronSlidersContainer);

    this.updateNeuronSection(null);

    this.panelContent.appendChild(this.neuronSection);
  }

  private createSlider(
    parent: HTMLElement,
    config: SliderConfig,
    onChange: (value: number) => void,
    initialValue?: number
  ): HTMLInputElement {
    const container = document.createElement('div');
    container.className = 'slider-container';

    const labelRow = document.createElement('div');
    labelRow.className = 'slider-label';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = config.label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    const val = initialValue !== undefined ? initialValue : config.default;
    valueSpan.textContent = config.unit ? `${val} ${config.unit}` : `${val}`;

    labelRow.appendChild(labelSpan);
    labelRow.appendChild(valueSpan);
    container.appendChild(labelRow);

    const wrapper = document.createElement('div');
    wrapper.className = 'slider-wrapper';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(val);

    this.attachSliderTooltip(slider, valueSpan, config.unit || '');

    slider.oninput = () => {
      const v = parseFloat(slider.value);
      valueSpan.textContent = config.unit ? `${v} ${config.unit}` : `${v}`;
      onChange(v);
    };

    wrapper.appendChild(slider);
    container.appendChild(wrapper);
    parent.appendChild(container);

    return slider;
  }

  private attachSliderTooltip(
    slider: HTMLInputElement,
    _valueDisplay: HTMLElement,
    unit: string
  ): void {
    const showTooltip = (e: MouseEvent | TouchEvent) => {
      const rect = slider.getBoundingClientRect();
      let clientX: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
      } else {
        clientX = e.clientX;
      }
      const percent = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, percent));
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const value = min + clamped * (max - min);
      const step = parseFloat(slider.step);
      const stepped = Math.round(value / step) * step;
      const display = Number.isInteger(step) ? stepped.toFixed(0) : stepped.toFixed(2);
      this.tooltip.textContent = unit ? `${display} ${unit}` : `${display}`;
      this.tooltip.style.left = `${clientX}px`;
      this.tooltip.style.top = `${rect.top}px`;
      this.tooltip.classList.add('show');
    };

    const hideTooltip = () => {
      this.tooltip.classList.remove('show');
    };

    slider.addEventListener('mousemove', showTooltip);
    slider.addEventListener('mousedown', showTooltip);
    slider.addEventListener('mouseup', hideTooltip);
    slider.addEventListener('mouseleave', hideTooltip);
    slider.addEventListener('touchmove', showTooltip);
    slider.addEventListener('touchstart', showTooltip);
    slider.addEventListener('touchend', hideTooltip);
  }

  private bindGlobalSliders(): void {}

  private updateGlobalParam(key: string, value: number): void {
    switch (key) {
      case 'propagationSpeed':
        this.signalSimulator.setPropagationSpeed(value);
        break;
      case 'signalStrength':
        this.signalSimulator.setSignalStrength(value);
        break;
      case 'randomBifurcationWeight':
        this.signalSimulator.setRandomBifurcationWeight(value);
        break;
    }
  }

  private onNeuronSelected(neuron: Neuron | null): void {
    this.updateNeuronSection(neuron);

    if (this.mode === 'connect' && neuron) {
      if (this.neuronManager.connectModeFromId) {
        const from = this.neuronManager.neurons.get(this.neuronManager.connectModeFromId);
        if (from && from.id !== neuron.id) {
          this.neuronManager.createConnection(from.id, neuron.id, 1.0);
        }
        this.neuronManager.connectModeFromId = null;
      } else {
        this.neuronManager.startConnectMode(neuron.id);
      }
    }
  }

  private updateNeuronSection(neuron: Neuron | null): void {
    this.neuronSlidersContainer.innerHTML = '';

    if (!neuron) {
      const empty = document.createElement('div');
      empty.className = 'empty-hint';
      empty.textContent = '点击场景中的神经元以编辑参数';
      this.neuronSlidersContainer.appendChild(empty);
      return;
    }

    const infoBox = document.createElement('div');
    infoBox.className = 'hint-box';
    const typeInfo = NEURON_TYPES.find((t) => t.value === neuron.type);
    infoBox.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:4px;">
        <span class="neuron-type-dot" style="background:${typeInfo?.color || '#8866ff'}"></span>
        <b style="color:#ddeeff;">${typeInfo?.label || '神经元'}</b>
        <span style="margin-left:auto;color:#88aaff;">#${neuron.id.split('_')[1]}</span>
      </div>
      <div style="opacity:0.8;">位置: (${neuron.position.x.toFixed(1)}, ${neuron.position.y.toFixed(1)}, ${neuron.position.z.toFixed(1)})</div>
    `;
    this.neuronSlidersContainer.appendChild(infoBox);

    const typeLabel = document.createElement('div');
    typeLabel.className = 'slider-label';
    typeLabel.innerHTML = `<span>神经元类型</span>`;
    this.neuronSlidersContainer.appendChild(typeLabel);

    const typeSelect = document.createElement('select');
    typeSelect.className = 'glass-select';
    NEURON_TYPES.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.value;
      opt.textContent = t.label;
      typeSelect.appendChild(opt);
    });
    typeSelect.value = neuron.type;
    typeSelect.onchange = () => {
      this.neuronManager.updateNeuronType(neuron.id, typeSelect.value as NeuronType);
    };
    this.neuronSlidersContainer.appendChild(typeSelect);

    const spacer = document.createElement('div');
    spacer.style.height = '12px';
    this.neuronSlidersContainer.appendChild(spacer);

    this.createSlider(
      this.neuronSlidersContainer,
      { key: 'radius', label: '节点半径', min: 0.3, max: 1.5, step: 0.05, default: neuron.radius },
      (value) => this.neuronManager.updateNeuronRadius(neuron.id, value),
      neuron.radius
    );

    NEURON_SLIDERS.forEach((config) => {
      const initialValue = (neuron.params as any)[config.key];
      this.createSlider(
        this.neuronSlidersContainer,
        config,
        (value) => {
          (neuron.params as any)[config.key] = value;
        },
        initialValue
      );
    });

    const synapseContainer = document.createElement('div');
    const synapseLabel = document.createElement('div');
    synapseLabel.className = 'slider-label';
    const synapseValue = document.createElement('span');
    synapseValue.className = 'slider-value';
    synapseValue.textContent = '1.00';
    synapseLabel.innerHTML = `<span>突触权重（出射）</span>`;
    synapseLabel.appendChild(synapseValue);
    synapseContainer.appendChild(synapseLabel);

    this.synapseWeightSlider = document.createElement('input');
    this.synapseWeightSlider.type = 'range';
    this.synapseWeightSlider.min = '0.1';
    this.synapseWeightSlider.max = '2.0';
    this.synapseWeightSlider.step = '0.05';
    this.synapseWeightSlider.value = '1.0';
    this.attachSliderTooltip(this.synapseWeightSlider, synapseValue, '');
    this.synapseWeightSlider.oninput = () => {
      const v = parseFloat(this.synapseWeightSlider.value);
      synapseValue.textContent = v.toFixed(2);
      this.neuronManager.getOutgoingConnections(neuron.id).forEach((conn) => {
        conn.weight = v;
      });
    };
    synapseContainer.appendChild(this.synapseWeightSlider);
    this.neuronSlidersContainer.appendChild(synapseContainer);

    const btnRow = document.createElement('div');
    btnRow.className = 'btn-group';
    btnRow.style.marginTop = '14px';
    btnRow.style.justifyContent = 'space-between';

    const triggerBtn = this.createButton('⚡ 触发信号', 'trigger-neuron', 'success');
    triggerBtn.style.flex = '1';
    triggerBtn.onclick = () => this.signalSimulator.triggerSignal(neuron.id);

    const deleteBtn = this.createButton('🗑 删除', 'delete-neuron', 'danger');
    deleteBtn.onclick = () => this.neuronManager.deleteNeuron(neuron.id);

    btnRow.appendChild(triggerBtn);
    btnRow.appendChild(deleteBtn);
    this.neuronSlidersContainer.appendChild(btnRow);
  }
}
