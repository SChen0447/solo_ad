import { eventBus, SimulationParams, OBSTACLE_TYPES, DISPLAY_MODES } from './eventBus';

const OBSTACLE_LABELS: Record<string, string> = {
  sphere: '球体',
  cylinder: '圆柱体',
  airfoil: '机翼剖面',
  car: '汽车模型',
  pyramid: '金字塔',
  flatplate: '平板',
  wedge: '楔形',
  hemisphere: '半球',
  concavemirror: '凹面镜',
  custom: '自定义'
};

const DISPLAY_MODE_LABELS: Record<string, string> = {
  particles: '粒子',
  streamlines: '流线',
  pressure: '压力云图',
  overlay: '叠加'
};

interface FlatPreset {
  id: string;
  name: string;
  obstacleType: string;
  windSpeed: number;
  particleDensity: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  displayMode: 'particles' | 'streamlines' | 'pressure' | 'overlay';
}

export class ControlPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private dragHandle: HTMLElement;
  private windSpeedSlider: HTMLInputElement;
  private particleDensitySlider: HTMLInputElement;
  private rotationXSlider: HTMLInputElement;
  private rotationYSlider: HTMLInputElement;
  private rotationZSlider: HTMLInputElement;
  private obstacleSelect: HTMLSelectElement;
  private displayModeButtons: Map<string, HTMLButtonElement> = new Map();
  private presetList: HTMLElement;
  private presetNameInput: HTMLInputElement;
  private savePresetButton: HTMLButtonElement;
  private recordButton: HTMLButtonElement;
  private recordingTimer: number | null = null;
  private recordingStartTime: number = 0;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartTransform: number = 0;
  private isExpanded: boolean = false;
  private velocity: number = 0;
  private lastMoveTime: number = 0;
  private lastMoveY: number = 0;
  private pointerId: number | null = null;
  private drawerFullHeight: number = 0;
  private maxTranslate: number = 0;
  private animationFrameId: number | null = null;
  private params: SimulationParams;
  private presets: FlatPreset[] = [];

  constructor(params: SimulationParams) {
    this.params = { ...params };
    this.container = document.createElement('div');
    this.panel = document.createElement('div');
    this.dragHandle = document.createElement('div');
    this.windSpeedSlider = document.createElement('input');
    this.particleDensitySlider = document.createElement('input');
    this.rotationXSlider = document.createElement('input');
    this.rotationYSlider = document.createElement('input');
    this.rotationZSlider = document.createElement('input');
    this.obstacleSelect = document.createElement('select');
    this.presetList = document.createElement('div');
    this.presetNameInput = document.createElement('input');
    this.savePresetButton = document.createElement('button');
    this.recordButton = document.createElement('button');

    this.init();
  }

  private init(): void {
    this.setupStyles();
    this.createLayout();
    this.createSliders();
    this.createObstacleSelect();
    this.createDisplayModeButtons();
    this.createPresetManager();
    this.createRecordControl();
    this.setupEventListeners();
    this.setupResponsive();
    this.updateUI(this.params);
    document.body.appendChild(this.container);
    this.measureDrawerHeight();
    this.setInitialMobileState();
  }

  private setupStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Rajdhani:wght@400;500;600;700&display=swap');
      
      .control-panel-container {
        position: fixed;
        z-index: 1000;
        font-family: 'Rajdhani', sans-serif;
        color: #fff;
      }
      
      .control-panel {
        background: rgba(30, 40, 60, 0.8);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 12px;
        border: 1px solid rgba(69, 162, 158, 0.3);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        overflow-y: auto;
        overflow-x: hidden;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .control-panel::-webkit-scrollbar {
        width: 6px;
      }
      
      .control-panel::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
      }
      
      .control-panel::-webkit-scrollbar-thumb {
        background: #45A29E;
        border-radius: 3px;
      }
      
      .drag-handle {
        display: none;
        height: 40px;
        background: rgba(30, 40, 60, 0.9);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
        cursor: grab;
        touch-action: none;
        position: relative;
        border-top: 1px solid rgba(69, 162, 158, 0.5);
        border-left: 1px solid rgba(69, 162, 158, 0.3);
        border-right: 1px solid rgba(69, 162, 158, 0.3);
      }
      
      .drag-handle:active {
        cursor: grabbing;
      }
      
      .drag-handle::before {
        content: '';
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 4px;
        background: #45A29E;
        border-radius: 2px;
        box-shadow: 0 0 10px #45A29E;
      }
      
      .panel-section {
        padding: 16px 20px;
        border-bottom: 1px solid rgba(69, 162, 158, 0.2);
      }
      
      .panel-section:last-child {
        border-bottom: none;
      }
      
      .section-title {
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #45A29E;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }
      
      .slider-group {
        margin-bottom: 14px;
      }
      
      .slider-group:last-child {
        margin-bottom: 0;
      }
      
      .slider-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 13px;
        color: #c9d6ff;
      }
      
      .slider-value {
        font-family: 'Orbitron', monospace;
        font-size: 14px;
        font-weight: 500;
        color: #45A29E;
        text-shadow: 0 0 8px rgba(69, 162, 158, 0.5);
      }
      
      .custom-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #45A29E var(--progress, 50%), rgba(255, 255, 255, 0.1) var(--progress, 50%));
        outline: none;
        cursor: pointer;
        transition: box-shadow 0.2s ease;
      }
      
      .custom-slider:hover {
        box-shadow: 0 0 12px rgba(69, 162, 158, 0.4);
      }
      
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #45A29E;
        cursor: pointer;
        box-shadow: 0 0 10px #45A29E, 0 0 20px rgba(69, 162, 158, 0.5);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .custom-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 15px #45A29E, 0 0 30px rgba(69, 162, 158, 0.7);
      }
      
      .custom-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #45A29E;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px #45A29E, 0 0 20px rgba(69, 162, 158, 0.5);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      
      .custom-slider::-moz-range-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 15px #45A29E, 0 0 30px rgba(69, 162, 158, 0.7);
      }
      
      .custom-slider::-moz-range-track {
        height: 6px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.1);
      }
      
      .custom-select {
        width: 100%;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(69, 162, 158, 0.4);
        border-radius: 8px;
        color: #fff;
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        cursor: pointer;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2345A29E' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
      }
      
      .custom-select:hover {
        border-color: #45A29E;
        box-shadow: 0 0 10px rgba(69, 162, 158, 0.3);
      }
      
      .custom-select option {
        background: #1e283c;
        color: #fff;
        font-family: 'Rajdhani', sans-serif;
      }
      
      .button-group {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      
      .mode-button {
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(69, 162, 158, 0.4);
        border-radius: 8px;
        color: #c9d6ff;
        font-family: 'Rajdhani', sans-serif;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }
      
      .mode-button:hover {
        background: rgba(69, 162, 158, 0.2);
        border-color: #45A29E;
        box-shadow: 0 0 10px rgba(69, 162, 158, 0.3);
        filter: brightness(1.2);
      }
      
      .mode-button.active {
        background: #45A29E;
        border-color: #45A29E;
        color: #fff;
        box-shadow: 0 0 15px rgba(69, 162, 158, 0.5);
      }
      
      .preset-input-group {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .preset-name-input {
        flex: 1;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(69, 162, 158, 0.4);
        border-radius: 8px;
        color: #fff;
        font-family: 'Rajdhani', sans-serif;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      
      .preset-name-input:focus {
        border-color: #45A29E;
        box-shadow: 0 0 10px rgba(69, 162, 158, 0.3);
      }
      
      .preset-name-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
      
      .save-button {
        padding: 10px 20px;
        background: #45A29E;
        border: 1px solid #45A29E;
        border-radius: 8px;
        color: #fff;
        font-family: 'Rajdhani', sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      
      .save-button:hover {
        filter: brightness(1.2);
        box-shadow: 0 0 15px rgba(69, 162, 158, 0.5);
      }
      
      .preset-list {
        max-height: 150px;
        overflow-y: auto;
        border: 1px solid rgba(69, 162, 158, 0.2);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.02);
      }
      
      .preset-list::-webkit-scrollbar {
        width: 4px;
      }
      
      .preset-list::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .preset-list::-webkit-scrollbar-thumb {
        background: rgba(69, 162, 158, 0.5);
        border-radius: 2px;
      }
      
      .preset-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        border-bottom: 1px solid rgba(69, 162, 158, 0.1);
        transition: background 0.2s ease;
      }
      
      .preset-item:last-child {
        border-bottom: none;
      }
      
      .preset-item:hover {
        background: rgba(69, 162, 158, 0.1);
      }
      
      .preset-item-name {
        font-size: 14px;
        color: #c9d6ff;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .preset-item-buttons {
        display: flex;
        gap: 6px;
      }
      
      .preset-action-button {
        padding: 6px 12px;
        border-radius: 6px;
        font-family: 'Rajdhani', sans-serif;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;
      }
      
      .preset-load-button {
        background: rgba(69, 162, 158, 0.2);
        border-color: #45A29E;
        color: #45A29E;
      }
      
      .preset-load-button:hover {
        background: #45A29E;
        color: #fff;
        filter: brightness(1.2);
      }
      
      .preset-delete-button {
        background: rgba(239, 68, 68, 0.2);
        border-color: #ef4444;
        color: #ef4444;
      }
      
      .preset-delete-button:hover {
        background: #ef4444;
        color: #fff;
        filter: brightness(1.2);
      }
      
      .preset-empty {
        padding: 20px;
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
        font-size: 13px;
      }
      
      .record-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      
      .record-button {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.2);
        border: 2px solid #ef4444;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        position: relative;
      }
      
      .record-button:hover {
        background: rgba(239, 68, 68, 0.3);
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
        filter: brightness(1.2);
      }
      
      .record-button.recording {
        animation: pulse 1s ease-in-out infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        50% {
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.9), 0 0 50px rgba(239, 68, 68, 0.5);
        }
      }
      
      .record-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        background: #ef4444;
        transition: all 0.2s ease;
      }
      
      .record-button.recording .record-icon {
        border-radius: 2px;
        width: 18px;
        height: 18px;
      }
      
      .record-timer {
        font-family: 'Orbitron', monospace;
        font-size: 18px;
        color: #ef4444;
        text-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
      }
      
      .record-timer.hidden {
        display: none;
      }
      
      @media (min-width: 768px) {
        .control-panel-container {
          top: 20px;
          right: 20px;
          width: 320px;
        }
        
        .control-panel {
          max-height: calc(100vh - 40px);
          width: 320px;
        }
        
        .drag-handle {
          display: none;
        }
      }
      
      @media (max-width: 767px) {
        .control-panel-container {
          bottom: 0;
          left: 0;
          right: 0;
        }
        
        .control-panel-container.dragging {
          transition: none;
        }
        
        .control-panel {
          width: 100%;
          border-radius: 0;
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        }
        
        .drag-handle {
          display: block;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createLayout(): void {
    this.container.className = 'control-panel-container';
    
    this.dragHandle.className = 'drag-handle';
    
    this.panel.className = 'control-panel';
    
    this.container.appendChild(this.dragHandle);
    this.container.appendChild(this.panel);
  }

  private createSliders(): void {
    const paramsSection = this.createSection('仿真参数');
    
    this.windSpeedSlider = this.createSlider('风速', 'm/s', 1, 20, 0.5, this.params.windSpeed, (value) => {
      eventBus.emit('windSpeedChange', value);
      this.params.windSpeed = value;
    });
    
    this.particleDensitySlider = this.createSlider('粒子密度', '', 1000, 10000, 100, this.params.particleDensity, (value) => {
      eventBus.emit('particleDensityChange', value);
      this.params.particleDensity = value;
    });
    
    const rotationSection = this.createSection('旋转角度');
    
    this.rotationXSlider = this.createSlider('旋转 X', '°', -180, 180, 1, this.params.rotationX, () => this.emitRotation());
    this.rotationYSlider = this.createSlider('旋转 Y', '°', -180, 180, 1, this.params.rotationY, () => this.emitRotation());
    this.rotationZSlider = this.createSlider('旋转 Z', '°', -180, 180, 1, this.params.rotationZ, () => this.emitRotation());
    
    paramsSection.appendChild(this.windSpeedSlider.parentElement!);
    paramsSection.appendChild(this.particleDensitySlider.parentElement!);
    this.panel.appendChild(paramsSection);
    
    rotationSection.appendChild(this.rotationXSlider.parentElement!);
    rotationSection.appendChild(this.rotationYSlider.parentElement!);
    rotationSection.appendChild(this.rotationZSlider.parentElement!);
    this.panel.appendChild(rotationSection);
  }

  private createSlider(
    label: string,
    unit: string,
    min: number,
    max: number,
    step: number,
    value: number,
    onChange: (value: number) => void
  ): HTMLInputElement {
    const group = document.createElement('div');
    group.className = 'slider-group';
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'slider-label';
    
    const labelText = document.createElement('span');
    labelText.textContent = label;
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    
    labelDiv.appendChild(labelText);
    labelDiv.appendChild(valueSpan);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.className = 'custom-slider';
    
    const updateValue = () => {
      const val = parseFloat(slider.value);
      valueSpan.textContent = `${val}${unit}`;
      const progress = ((val - min) / (max - min)) * 100;
      slider.style.setProperty('--progress', `${progress}%`);
    };
    
    updateValue();
    
    slider.addEventListener('input', () => {
      updateValue();
      onChange(parseFloat(slider.value));
    });
    
    group.appendChild(labelDiv);
    group.appendChild(slider);
    
    return slider;
  }

  private createObstacleSelect(): void {
    const section = this.createSection('障碍物类型');
    
    this.obstacleSelect.className = 'custom-select';
    
    OBSTACLE_TYPES.forEach((type) => {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = OBSTACLE_LABELS[type] || type;
      this.obstacleSelect.appendChild(option);
    });
    
    this.obstacleSelect.value = this.params.obstacleType;
    
    this.obstacleSelect.addEventListener('change', () => {
      eventBus.emit('obstacleTypeChange', this.obstacleSelect.value);
      this.params.obstacleType = this.obstacleSelect.value;
    });
    
    section.appendChild(this.obstacleSelect);
    this.panel.appendChild(section);
  }

  private createDisplayModeButtons(): void {
    const section = this.createSection('显示模式');
    
    const group = document.createElement('div');
    group.className = 'button-group';
    
    DISPLAY_MODES.forEach((mode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mode-button';
      button.textContent = DISPLAY_MODE_LABELS[mode] || mode;
      button.dataset.mode = mode;
      
      if (mode === this.params.displayMode) {
        button.classList.add('active');
      }
      
      button.addEventListener('click', () => {
        this.displayModeButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
        eventBus.emit('displayModeChange', mode);
        this.params.displayMode = mode;
      });
      
      this.displayModeButtons.set(mode, button);
      group.appendChild(button);
    });
    
    section.appendChild(group);
    this.panel.appendChild(section);
  }

  private createPresetManager(): void {
    const section = this.createSection('预设管理');
    
    const inputGroup = document.createElement('div');
    inputGroup.className = 'preset-input-group';
    
    this.presetNameInput.type = 'text';
    this.presetNameInput.className = 'preset-name-input';
    this.presetNameInput.placeholder = '输入预设名称...';
    
    this.savePresetButton.type = 'button';
    this.savePresetButton.className = 'save-button';
    this.savePresetButton.textContent = '保存';
    
    this.savePresetButton.addEventListener('click', () => {
      const name = this.presetNameInput.value.trim();
      if (name) {
        const data = {
          name: name,
          obstacleType: this.params.obstacleType,
          windSpeed: this.params.windSpeed,
          particleDensity: this.params.particleDensity,
          rotationX: this.params.rotationX,
          rotationY: this.params.rotationY,
          rotationZ: this.params.rotationZ,
          displayMode: this.params.displayMode
        };
        eventBus.emit('savePreset', data);
        this.presetNameInput.value = '';
        this.loadPresetsFromBackend();
      }
    });
    
    inputGroup.appendChild(this.presetNameInput);
    inputGroup.appendChild(this.savePresetButton);
    
    this.presetList.className = 'preset-list';
    
    section.appendChild(inputGroup);
    section.appendChild(this.presetList);
    this.panel.appendChild(section);
  }

  private createRecordControl(): void {
    const section = this.createSection('录制控制');
    
    const recordSection = document.createElement('div');
    recordSection.className = 'record-section';
    
    this.recordButton.type = 'button';
    this.recordButton.className = 'record-button';
    
    const recordIcon = document.createElement('div');
    recordIcon.className = 'record-icon';
    this.recordButton.appendChild(recordIcon);
    
    const timer = document.createElement('div');
    timer.className = 'record-timer hidden';
    timer.textContent = '00:00';
    
    this.recordButton.addEventListener('click', () => {
      if (this.recordButton.classList.contains('recording')) {
        this.stopRecording();
      } else {
        this.startRecording();
      }
    });
    
    recordSection.appendChild(this.recordButton);
    recordSection.appendChild(timer);
    
    section.appendChild(recordSection);
    this.panel.appendChild(section);
  }

  private createSection(title: string): HTMLElement {
    const section = document.createElement('div');
    section.className = 'panel-section';
    
    const titleEl = document.createElement('div');
    titleEl.className = 'section-title';
    titleEl.textContent = title;
    
    section.appendChild(titleEl);
    
    return section;
  }

  private emitRotation(): void {
    const rx = parseFloat(this.rotationXSlider.value);
    const ry = parseFloat(this.rotationYSlider.value);
    const rz = parseFloat(this.rotationZSlider.value);
    this.params.rotationX = rx;
    this.params.rotationY = ry;
    this.params.rotationZ = rz;
    eventBus.emit('rotationChange', rx, ry, rz);
  }

  private setupEventListeners(): void {
    this.dragHandle.addEventListener('pointerdown', this.handleDragStart.bind(this));
    window.addEventListener('pointermove', this.handleDragMove.bind(this));
    window.addEventListener('pointerup', this.handleDragEnd.bind(this));
    window.addEventListener('pointercancel', this.handleDragEnd.bind(this));
  }

  private setupResponsive(): void {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    mediaQuery.addEventListener('change', () => {
      this.cancelAnimation();
      this.measureDrawerHeight();
      if (mediaQuery.matches) {
        this.isExpanded = false;
        this.applyTransform(this.maxTranslate);
      } else {
        this.container.style.transform = '';
      }
    });

    window.addEventListener('resize', () => {
      const mq = window.matchMedia('(max-width: 767px)');
      if (mq.matches) {
        const wasExpanded = this.isExpanded;
        this.measureDrawerHeight();
        this.isExpanded = wasExpanded;
        this.applyTransform(this.isExpanded ? 0 : this.maxTranslate);
      }
    });
  }

  private measureDrawerHeight(): void {
    const contentHeight = this.panel.scrollHeight;
    this.drawerFullHeight = Math.min(contentHeight + 40, window.innerHeight * 0.85);
    this.panel.style.height = `${this.drawerFullHeight}px`;
    this.maxTranslate = this.drawerFullHeight - 40;
  }

  private setInitialMobileState(): void {
    const mq = window.matchMedia('(max-width: 767px)');
    if (mq.matches) {
      this.isExpanded = false;
      this.applyTransform(this.maxTranslate);
    }
  }

  private handleDragStart(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }
    e.preventDefault();
    this.cancelAnimation();
    this.dragHandle.setPointerCapture(e.pointerId);
    this.pointerId = e.pointerId;
    this.isDragging = true;
    this.container.classList.add('dragging');
    this.velocity = 0;
    this.dragStartY = e.clientY;
    this.dragStartTransform = this.getCurrentTransform();
    this.lastMoveTime = performance.now();
    this.lastMoveY = e.clientY;
  }

  private handleDragMove(e: PointerEvent): void {
    if (!this.isDragging || e.pointerId !== this.pointerId) {
      return;
    }
    e.preventDefault();
    
    const deltaY = e.clientY - this.lastMoveY;
    const deltaTime = performance.now() - this.lastMoveTime;
    
    if (deltaTime > 0) {
      const instantaneousVelocity = deltaY / deltaTime;
      this.velocity = 0.8 * this.velocity + 0.2 * instantaneousVelocity;
    }
    
    this.lastMoveTime = performance.now();
    this.lastMoveY = e.clientY;
    
    const totalDeltaY = e.clientY - this.dragStartY;
    const newTranslate = Math.max(0, Math.min(this.maxTranslate, this.dragStartTransform + totalDeltaY));
    this.applyTransform(newTranslate);
  }

  private handleDragEnd(e: PointerEvent): void {
    if (!this.isDragging || e.pointerId !== this.pointerId) {
      return;
    }
    this.dragHandle.releasePointerCapture(e.pointerId);
    this.isDragging = false;
    this.container.classList.remove('dragging');
    this.pointerId = null;
    
    const currentTransform = this.getCurrentTransform();
    let targetTransform: number;
    
    if (this.velocity < -0.3) {
      targetTransform = 0;
      this.isExpanded = true;
    } else if (this.velocity > 0.3) {
      targetTransform = this.maxTranslate;
      this.isExpanded = false;
    } else if (currentTransform < this.maxTranslate / 2) {
      targetTransform = 0;
      this.isExpanded = true;
    } else {
      targetTransform = this.maxTranslate;
      this.isExpanded = false;
    }
    
    this.animateWithDamping(targetTransform, this.velocity);
  }

  private animateWithDamping(targetTransform: number, initialVelocity: number): void {
    this.cancelAnimation();
    
    const m = 1;
    const k = 150;
    const c = 18;
    
    const x0 = this.getCurrentTransform();
    const xTarget = targetTransform;
    const v0 = initialVelocity * 1000;
    
    const omega0 = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(m * k));
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    
    const A = x0 - xTarget;
    const B = (v0 + zeta * omega0 * A) / omegaD;
    
    const startTime = performance.now();
    const maxDuration = 1200;
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = elapsed / 1000;
      
      const expTerm = Math.exp(-zeta * omega0 * t);
      const cosTerm = Math.cos(omegaD * t);
      const sinTerm = Math.sin(omegaD * t);
      
      const x = xTarget + expTerm * (A * cosTerm + B * sinTerm);
      const v = -zeta * omega0 * expTerm * (A * cosTerm + B * sinTerm) 
              + expTerm * (-A * omegaD * sinTerm + B * omegaD * cosTerm);
      
      this.applyTransform(x);
      
      const displacement = Math.abs(x - xTarget);
      const velocityAbs = Math.abs(v);
      
      if ((displacement < 0.5 && velocityAbs < 5) || elapsed > maxDuration) {
        this.applyTransform(xTarget);
        this.animationFrameId = null;
        return;
      }
      
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private cancelAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private applyTransform(translateY: number): void {
    this.container.style.transform = `translateY(${translateY}px)`;
  }

  private getCurrentTransform(): number {
    const transform = this.container.style.transform;
    const match = transform.match(/translateY\(([^)]+)px\)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private startRecording(): void {
    this.recordButton.classList.add('recording');
    this.recordingStartTime = Date.now();
    
    const timer = this.container.querySelector('.record-timer');
    if (timer) {
      timer.classList.remove('hidden');
    }
    
    eventBus.emit('startRecording');
    
    this.recordingTimer = window.setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const seconds = Math.floor(elapsed / 1000);
      
      if (seconds >= 30) {
        this.stopRecording();
        return;
      }
      
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (timer) {
        timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }, 100);
  }

  private stopRecording(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    
    this.recordButton.classList.remove('recording');
    
    const timer = this.container.querySelector('.record-timer');
    if (timer) {
      timer.classList.add('hidden');
      timer.textContent = '00:00';
    }
    
    eventBus.emit('stopRecording');
  }

  public updateUI(params: SimulationParams): void {
    this.params = { ...params };
    
    this.windSpeedSlider.value = params.windSpeed.toString();
    this.particleDensitySlider.value = params.particleDensity.toString();
    this.rotationXSlider.value = params.rotationX.toString();
    this.rotationYSlider.value = params.rotationY.toString();
    this.rotationZSlider.value = params.rotationZ.toString();
    this.obstacleSelect.value = params.obstacleType;
    
    this.displayModeButtons.forEach((btn, mode) => {
      btn.classList.toggle('active', mode === params.displayMode);
    });
    
    const updateSliderProgress = (slider: HTMLInputElement, min: number, max: number, unit: string) => {
      const val = parseFloat(slider.value);
      const progress = ((val - min) / (max - min)) * 100;
      slider.style.setProperty('--progress', `${progress}%`);
      
      const valueSpan = slider.parentElement?.querySelector('.slider-value');
      if (valueSpan) {
        valueSpan.textContent = `${val}${unit}`;
      }
    };
    
    updateSliderProgress(this.windSpeedSlider, 1, 20, 'm/s');
    updateSliderProgress(this.particleDensitySlider, 1000, 10000, '');
    updateSliderProgress(this.rotationXSlider, -180, 180, '°');
    updateSliderProgress(this.rotationYSlider, -180, 180, '°');
    updateSliderProgress(this.rotationZSlider, -180, 180, '°');

    this.measureDrawerHeight();
    const mq = window.matchMedia('(max-width: 767px)');
    if (mq.matches) {
      this.applyTransform(this.isExpanded ? 0 : this.maxTranslate);
    }
  }

  public async loadPresetsFromBackend(): Promise<void> {
    try {
      const response = await fetch('/api/presets');
      if (response.ok) {
        this.presets = await response.json();
        this.renderPresetList();
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
      this.presets = [];
      this.renderPresetList();
    }
  }

  private renderPresetList(): void {
    this.presetList.innerHTML = '';
    
    if (this.presets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'preset-empty';
      empty.textContent = '暂无保存的预设';
      this.presetList.appendChild(empty);
      return;
    }
    
    this.presets.forEach((preset) => {
      const item = document.createElement('div');
      item.className = 'preset-item';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'preset-item-name';
      nameSpan.textContent = preset.name;
      
      const buttons = document.createElement('div');
      buttons.className = 'preset-item-buttons';
      
      const loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'preset-action-button preset-load-button';
      loadBtn.textContent = '加载';
      loadBtn.addEventListener('click', () => {
        eventBus.emit('loadPreset', preset);
        const params: SimulationParams = {
          obstacleType: preset.obstacleType,
          windSpeed: preset.windSpeed,
          particleDensity: preset.particleDensity,
          rotationX: preset.rotationX,
          rotationY: preset.rotationY,
          rotationZ: preset.rotationZ,
          displayMode: preset.displayMode
        };
        this.updateUI(params);
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'preset-action-button preset-delete-button';
      deleteBtn.textContent = '删除';
      deleteBtn.addEventListener('click', () => {
        eventBus.emit('deletePreset', preset.id);
        this.presets = this.presets.filter(p => p.id !== preset.id);
        this.renderPresetList();
      });
      
      buttons.appendChild(loadBtn);
      buttons.appendChild(deleteBtn);
      
      item.appendChild(nameSpan);
      item.appendChild(buttons);
      
      this.presetList.appendChild(item);
    });
  }
}
