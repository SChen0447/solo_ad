import type { BulletPattern, BulletConfig } from '../modules/BulletModule';
import type { KeyBinding } from '../modules/PlayerModule';

interface ControlPanelCallbacks {
  onPatternChange: (config: Partial<BulletConfig>) => void;
  onKeyBindingChange: (binding: KeyBinding) => void;
  onReplaySpeedChange: (speed: number) => void;
  onStartReplay: () => void;
  onStopReplay: () => void;
}

interface SliderConfig {
  key: keyof BulletConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const PATTERN_NAMES: Record<BulletPattern, string> = {
  circle: '圆形扩散',
  spiral: '螺旋线',
  fan: '扇形扫射',
  wave: '波浪波形',
  homing: '追踪弹',
  split: '分裂弹',
  random: '随机散射',
  cross: '十字交叉'
};

const COLOR_PALETTE = [
  '#ff4444', '#ff8844', '#ffdd44', '#88ff44', '#44ff88',
  '#44ffdd', '#4488ff', '#8844ff', '#ff44dd', '#ffffff'
];

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'density', label: '弹幕密度', min: 5, max: 50, step: 1 },
  { key: 'interval', label: '发射间隔', min: 0.1, max: 1, step: 0.1, unit: '秒' },
  { key: 'speed', label: '子弹速度', min: 1, max: 10, step: 1 },
  { key: 'size', label: '子弹大小', min: 2, max: 8, step: 1, unit: '像素' }
];

export class ControlPanel {
  private leftPanel: HTMLElement;
  private rightPanel: HTMLElement;
  private callbacks: ControlPanelCallbacks;
  private keyBinding: KeyBinding;
  private currentConfig: BulletConfig;
  private listeningForKey: keyof KeyBinding | null = null;
  private recordingDot: HTMLElement | null = null;
  private recordingTimer: number | null = null;
  private survivalTimeEl: HTMLElement | null = null;
  private collisionCountEl: HTMLElement | null = null;
  private recordDurationEl: HTMLElement | null = null;
  private replaySpeedEl: HTMLElement | null = null;
  private replayProgressEl: HTMLElement | null = null;
  private replaySpeed: number = 1;

  constructor(
    leftContainer: HTMLElement,
    rightContainer: HTMLElement,
    callbacks: ControlPanelCallbacks,
    initialBinding: KeyBinding,
    initialConfig: BulletConfig
  ) {
    this.leftPanel = leftContainer;
    this.rightPanel = rightContainer;
    this.callbacks = callbacks;
    this.keyBinding = { ...initialBinding };
    this.currentConfig = { ...initialConfig };

    this.createStyles();
    this.createLeftPanel();
    this.createRightPanel();
    this.setupGlobalKeyListener();
  }

  private createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .panel {
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 210, 255, 0.2);
        border-radius: 10px;
        padding: 12px;
        color: #e2e8f0;
        font-family: 'Orbitron', 'Segoe UI', sans-serif;
        font-size: 12px;
        user-select: none;
      }
      
      .panel-title {
        font-size: 14px;
        font-weight: 600;
        color: #00d2ff;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(0, 210, 255, 0.3);
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .control-group {
        margin-bottom: 12px;
      }
      
      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 11px;
        color: #94a3b8;
      }
      
      .control-value {
        font-family: 'JetBrains Mono', monospace;
        color: #00d2ff;
        font-weight: 500;
      }
      
      .slider-container {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .slider {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #00d2ff 0%, #00d2ff var(--fill, 50%), rgba(255,255,255,0.1) var(--fill, 50%), rgba(255,255,255,0.1) 100%);
        outline: none;
        transition: all 0.2s ease;
      }
      
      .slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #00d2ff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
        transition: all 0.2s ease;
      }
      
      .slider::-webkit-slider-thumb:hover {
        background: #00ffff;
        transform: scale(1.1);
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
      }
      
      .number-input {
        width: 50px;
        padding: 4px 6px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 210, 255, 0.3);
        border-radius: 4px;
        color: #e2e8f0;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        text-align: center;
        outline: none;
        transition: all 0.2s ease;
      }
      
      .number-input:focus {
        border-color: #00d2ff;
        box-shadow: 0 0 8px rgba(0, 210, 255, 0.4);
      }
      
      .select {
        width: 100%;
        padding: 8px 10px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 210, 255, 0.3);
        border-radius: 6px;
        color: #e2e8f0;
        font-family: inherit;
        font-size: 12px;
        cursor: pointer;
        outline: none;
        transition: all 0.2s ease;
      }
      
      .select:focus, .select:hover {
        border-color: #00d2ff;
        box-shadow: 0 0 8px rgba(0, 210, 255, 0.4);
      }
      
      .color-palette {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }
      
      .color-swatch {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 4px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        position: relative;
      }
      
      .color-swatch:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .color-swatch.selected {
        border-color: #00d2ff;
        box-shadow: 0 0 10px rgba(0, 210, 255, 0.6);
      }
      
      .color-swatch.selected::after {
        content: '✓';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #fff;
        font-size: 12px;
        font-weight: bold;
        text-shadow: 0 0 3px rgba(0,0,0,0.8);
      }
      
      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        background: rgba(0, 210, 255, 0.1);
        border: 1px solid rgba(0, 210, 255, 0.5);
        border-radius: 6px;
        color: #00d2ff;
        font-family: inherit;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .btn:hover {
        background: rgba(0, 210, 255, 0.2);
        border-color: #00ffff;
        color: #00ffff;
        transform: translateY(-2px);
        box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3);
      }
      
      .btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none !important;
      }
      
      .btn.primary {
        background: linear-gradient(135deg, rgba(0, 210, 255, 0.2), rgba(136, 68, 255, 0.2));
      }
      
      .btn.danger {
        border-color: rgba(255, 68, 68, 0.5);
        color: #ff4444;
      }
      
      .btn.danger:hover {
        background: rgba(255, 68, 68, 0.2);
        border-color: #ff4444;
        color: #ff6666;
      }
      
      .key-binding {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        margin-bottom: 6px;
      }
      
      .key-label {
        color: #94a3b8;
        font-size: 10px;
      }
      
      .key-button {
        min-width: 60px;
        padding: 4px 10px;
        background: rgba(0, 210, 255, 0.15);
        border: 1px solid rgba(0, 210, 255, 0.4);
        border-radius: 4px;
        color: #00d2ff;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .key-button:hover {
        background: rgba(0, 210, 255, 0.3);
      }
      
      .key-button.listening {
        background: rgba(255, 221, 68, 0.2);
        border-color: #ffdd44;
        color: #ffdd44;
        animation: pulse 1s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .info-row:last-child {
        border-bottom: none;
      }
      
      .info-label {
        color: #64748b;
        font-size: 11px;
      }
      
      .info-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        font-weight: 600;
      }
      
      .info-value.time {
        color: #00d2ff;
      }
      
      .info-value.collision {
        color: #ff4444;
      }
      
      .recording-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: rgba(255, 68, 68, 0.1);
        border: 1px solid rgba(255, 68, 68, 0.3);
        border-radius: 6px;
        margin-bottom: 12px;
      }
      
      .recording-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ff4444;
        animation: blink 0.8s infinite;
      }
      
      @keyframes blink {
        0%, 100% { opacity: 1; box-shadow: 0 0 10px #ff4444; }
        50% { opacity: 0.4; box-shadow: 0 0 4px #ff4444; }
      }
      
      .replay-controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .replay-buttons {
        display: flex;
        gap: 6px;
      }
      
      .replay-buttons .btn {
        flex: 1;
        padding: 6px 8px;
        font-size: 10px;
      }
      
      .speed-buttons {
        display: flex;
        gap: 4px;
      }
      
      .speed-btn {
        flex: 1;
        padding: 4px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(0, 210, 255, 0.3);
        border-radius: 4px;
        color: #94a3b8;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .speed-btn:hover {
        border-color: #00d2ff;
        color: #00d2ff;
      }
      
      .speed-btn.active {
        background: rgba(0, 210, 255, 0.2);
        border-color: #00d2ff;
        color: #00d2ff;
      }
      
      .progress-bar {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #00d2ff, #8844ff);
        border-radius: 2px;
        transition: width 0.1s linear;
      }
      
      .hint {
        font-size: 10px;
        color: #475569;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        line-height: 1.5;
      }
    `;
    document.head.appendChild(style);
  }

  private createLeftPanel(): void {
    this.leftPanel.className = 'panel';
    this.leftPanel.innerHTML = `
      <div class="panel-title">弹幕参数</div>
      
      <div class="control-group">
        <div class="control-label">弹幕形态</div>
        <select class="select" id="pattern-select">
          ${Object.entries(PATTERN_NAMES).map(([key, name]) => 
            `<option value="${key}" ${key === this.currentConfig.pattern ? 'selected' : ''}>${name}</option>`
          ).join('')}
        </select>
      </div>
      
      ${SLIDER_CONFIGS.map(config => this.createSliderHTML(config)).join('')}
      
      <div class="control-group">
        <div class="control-label">子弹颜色</div>
        <div class="color-palette" id="color-palette">
          ${COLOR_PALETTE.map(color => 
            `<div class="color-swatch ${color === this.currentConfig.color ? 'selected' : ''}" 
                 style="background: ${color}" 
                 data-color="${color}"></div>`
          ).join('')}
        </div>
      </div>
      
      <div class="panel-title" style="margin-top: 16px;">键位绑定</div>
      <div id="key-bindings">
        ${this.createKeyBindingHTML('up', '上移')}
        ${this.createKeyBindingHTML('down', '下移')}
        ${this.createKeyBindingHTML('left', '左移')}
        ${this.createKeyBindingHTML('right', '右移')}
        ${this.createKeyBindingHTML('action', '录制/暂停')}
      </div>
      
      <div class="hint">
        提示：按录制键（默认空格）开始/停止录制<br/>
        录制上限60秒
      </div>
    `;

    this.setupLeftPanelListeners();
  }

  private createSliderHTML(config: SliderConfig): string {
    const value = this.currentConfig[config.key] as number;
    const percentage = ((value - config.min) / (config.max - config.min)) * 100;
    const displayValue = config.step < 1 ? value.toFixed(1) : value.toString();
    
    return `
      <div class="control-group">
        <div class="control-label">
          <span>${config.label}</span>
          <span class="control-value">${displayValue}${config.unit || ''}</span>
        </div>
        <div class="slider-container">
          <input type="range" 
                 class="slider" 
                 id="slider-${config.key}"
                 min="${config.min}" 
                 max="${config.max}" 
                 step="${config.step}" 
                 value="${value}"
                 style="--fill: ${percentage}%">
          <input type="number" 
                 class="number-input" 
                 id="number-${config.key}"
                 min="${config.min}" 
                 max="${config.max}" 
                 step="${config.step}" 
                 value="${value}">
        </div>
      </div>
    `;
  }

  private createKeyBindingHTML(key: keyof KeyBinding, label: string): string {
    const keyValue = this.keyBinding[key];
    const displayName = this.getKeyDisplayName(keyValue);
    return `
      <div class="key-binding">
        <span class="key-label">${label}</span>
        <button class="key-button" data-key="${key}">${displayName}</button>
      </div>
    `;
  }

  private getKeyDisplayName(key: string): string {
    const keyMap: Record<string, string> = {
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Space': '空格',
      ' ': '空格'
    };
    return keyMap[key] || keyMap[key.toUpperCase?.()] || key.toUpperCase();
  }

  private setupLeftPanelListeners(): void {
    const patternSelect = this.leftPanel.querySelector('#pattern-select') as HTMLSelectElement;
    patternSelect.addEventListener('change', (e) => {
      const pattern = (e.target as HTMLSelectElement).value as BulletPattern;
      this.currentConfig.pattern = pattern;
      this.callbacks.onPatternChange({ pattern });
    });

    SLIDER_CONFIGS.forEach(config => {
      const slider = this.leftPanel.querySelector(`#slider-${config.key}`) as HTMLInputElement;
      const numberInput = this.leftPanel.querySelector(`#number-${config.key}`) as HTMLInputElement;

      const updateValue = (value: number) => {
        const clamped = Phaser.Math.Clamp(value, config.min, config.max);
        const percentage = ((clamped - config.min) / (config.max - config.min)) * 100;
        slider.value = clamped.toString();
        numberInput.value = clamped.toString();
        slider.style.setProperty('--fill', `${percentage}%`);
        
        (this.currentConfig[config.key] as number) = clamped;
        this.callbacks.onPatternChange({ [config.key]: clamped } as Partial<BulletConfig>);
        
        const label = slider.closest('.control-group')?.querySelector('.control-value');
        if (label) {
          const displayValue = config.step < 1 ? clamped.toFixed(1) : clamped.toString();
          label.textContent = `${displayValue}${config.unit || ''}`;
        }
      };

      slider.addEventListener('input', (e) => {
        updateValue(parseFloat((e.target as HTMLInputElement).value));
      });

      numberInput.addEventListener('change', (e) => {
        updateValue(parseFloat((e.target as HTMLInputElement).value));
      });
    });

    const colorSwatches = this.leftPanel.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        colorSwatches.forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        const color = swatch.getAttribute('data-color')!;
        this.currentConfig.color = color;
        this.callbacks.onPatternChange({ color });
      });
    });

    const keyButtons = this.leftPanel.querySelectorAll('.key-button');
    keyButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key') as keyof KeyBinding;
        this.startListeningForKey(key, btn as HTMLButtonElement);
      });
    });
  }

  private startListeningForKey(key: keyof KeyBinding, button: HTMLButtonElement): void {
    if (this.listeningForKey) {
      const prevBtn = this.leftPanel.querySelector(`.key-button.listening`);
      prevBtn?.classList.remove('listening');
      (prevBtn as HTMLButtonElement).textContent = this.getKeyDisplayName(this.keyBinding[this.listeningForKey]);
    }

    this.listeningForKey = key;
    button.classList.add('listening');
    button.textContent = '按任意键...';
  }

  private setupGlobalKeyListener(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.listeningForKey) return;

      e.preventDefault();
      e.stopPropagation();

      const key = e.key === ' ' ? 'Space' : e.key;
      this.keyBinding[this.listeningForKey] = key;

      const button = this.leftPanel.querySelector(`.key-button.listening`) as HTMLButtonElement;
      if (button) {
        button.classList.remove('listening');
        button.textContent = this.getKeyDisplayName(key);
      }

      this.listeningForKey = null;
      this.callbacks.onKeyBindingChange({ ...this.keyBinding });
    }, true);
  }

  private createRightPanel(): void {
    this.rightPanel.className = 'panel';
    this.rightPanel.innerHTML = `
      <div class="panel-title">游戏信息</div>
      
      <div class="info-row">
        <span class="info-label">存活时间</span>
        <span class="info-value time" id="survival-time">0.0s</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">碰撞次数</span>
        <span class="info-value collision" id="collision-count">0</span>
      </div>
      
      <div id="recording-container" style="display: none;">
        <div class="recording-status">
          <div class="recording-dot" id="recording-dot"></div>
          <span style="color: #ff4444; font-size: 11px;">录制中</span>
          <span class="info-value time" id="record-duration" style="margin-left: auto; font-size: 12px;">0.0s / 60s</span>
        </div>
      </div>
      
      <div class="replay-controls">
        <div class="control-label">
          <span>轨迹回放</span>
          <span class="control-value" id="replay-status">无录制</span>
        </div>
        
        <div class="replay-buttons">
          <button class="btn primary" id="btn-start-replay" disabled>▶ 播放</button>
          <button class="btn danger" id="btn-stop-replay" disabled>■ 停止</button>
        </div>
        
        <div class="control-label" style="margin-top: 4px;">
          <span>回放速度</span>
        </div>
        <div class="speed-buttons" id="speed-buttons">
          <button class="speed-btn" data-speed="0.5">0.5x</button>
          <button class="speed-btn active" data-speed="1">1x</button>
          <button class="speed-btn" data-speed="2">2x</button>
        </div>
        
        <div class="progress-bar">
          <div class="progress-fill" id="replay-progress" style="width: 0%"></div>
        </div>
      </div>
      
      <div class="hint">
        红色子弹会造成碰撞<br/>
        碰撞后有1秒无敌时间
      </div>
    `;

    this.survivalTimeEl = this.rightPanel.querySelector('#survival-time');
    this.collisionCountEl = this.rightPanel.querySelector('#collision-count');
    this.recordDurationEl = this.rightPanel.querySelector('#record-duration');
    this.recordingDot = this.rightPanel.querySelector('#recording-dot');
    this.replayProgressEl = this.rightPanel.querySelector('#replay-progress');
    this.replaySpeedEl = this.rightPanel.querySelector('#replay-status');

    this.setupRightPanelListeners();
  }

  private setupRightPanelListeners(): void {
    const startReplayBtn = this.rightPanel.querySelector('#btn-start-replay') as HTMLButtonElement;
    const stopReplayBtn = this.rightPanel.querySelector('#btn-stop-replay') as HTMLButtonElement;
    const speedButtons = this.rightPanel.querySelectorAll('.speed-btn');

    startReplayBtn.addEventListener('click', () => {
      this.callbacks.onStartReplay();
    });

    stopReplayBtn.addEventListener('click', () => {
      this.callbacks.onStopReplay();
    });

    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        speedButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseFloat(btn.getAttribute('data-speed')!);
        this.replaySpeed = speed;
        this.callbacks.onReplaySpeedChange(speed);
      });
    });
  }

  updateInfo(
    survivalTime: number,
    collisionCount: number,
    isRecording: boolean,
    recordDuration: number,
    isReplaying: boolean,
    replayProgress: number,
    hasRecording: boolean
  ): void {
    if (this.survivalTimeEl) {
      this.survivalTimeEl.textContent = `${survivalTime.toFixed(1)}s`;
    }

    if (this.collisionCountEl) {
      this.collisionCountEl.textContent = collisionCount.toString();
    }

    const recordingContainer = this.rightPanel.querySelector('#recording-container') as HTMLElement;
    if (isRecording) {
      recordingContainer.style.display = 'block';
      if (this.recordDurationEl) {
        this.recordDurationEl.textContent = `${recordDuration.toFixed(1)}s / 60s`;
      }
    } else {
      recordingContainer.style.display = 'none';
    }

    const replayStatus = this.rightPanel.querySelector('#replay-status');
    const startBtn = this.rightPanel.querySelector('#btn-start-replay') as HTMLButtonElement;
    const stopBtn = this.rightPanel.querySelector('#btn-stop-replay') as HTMLButtonElement;

    if (isReplaying) {
      if (replayStatus) replayStatus.textContent = `播放中 ${this.replaySpeed}x`;
      startBtn.disabled = true;
      stopBtn.disabled = false;
    } else if (hasRecording) {
      if (replayStatus) replayStatus.textContent = '已录制';
      startBtn.disabled = false;
      stopBtn.disabled = true;
    } else {
      if (replayStatus) replayStatus.textContent = '无录制';
      startBtn.disabled = true;
      stopBtn.disabled = true;
    }

    if (this.replayProgressEl) {
      this.replayProgressEl.style.width = `${replayProgress * 100}%`;
    }
  }

  destroy(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
  }
}
