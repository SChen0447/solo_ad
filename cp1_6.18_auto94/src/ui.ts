import {
  CellType,
  CELL_COLORS,
  CELL_NAMES,
  CELL_DESCRIPTIONS,
  GameMode
} from './types.js';

interface ToolItemData {
  type: CellType;
  icon: string;
}

export class UIManager {
  private gameMode: GameMode = 'editor';
  private activeTool: CellType = CellType.Normal;
  private onToolSelect?: (type: CellType) => void;
  private onIntensityChange?: (v: number) => void;
  private onParamChange?: (param: string, value: number) => void;
  private onStartTest?: () => void;
  private onStopTest?: () => void;
  private onClearLevel?: () => void;
  private onRetry?: () => void;
  private onBackToEditor?: () => void;
  private onContextAction?: (action: string, col: number, row: number) => void;
  private menuOpen: boolean = false;
  private contextCol: number = -1;
  private contextRow: number = -1;

  constructor(
    callbacks: {
      onToolSelect?: (type: CellType) => void;
      onIntensityChange?: (v: number) => void;
      onParamChange?: (param: string, value: number) => void;
      onStartTest?: () => void;
      onStopTest?: () => void;
      onClearLevel?: () => void;
      onRetry?: () => void;
      onBackToEditor?: () => void;
      onContextAction?: (action: string, col: number, row: number) => void;
    }
  ) {
    this.onToolSelect = callbacks.onToolSelect;
    this.onIntensityChange = callbacks.onIntensityChange;
    this.onParamChange = callbacks.onParamChange;
    this.onStartTest = callbacks.onStartTest;
    this.onStopTest = callbacks.onStopTest;
    this.onClearLevel = callbacks.onClearLevel;
    this.onRetry = callbacks.onRetry;
    this.onBackToEditor = callbacks.onBackToEditor;
    this.onContextAction = callbacks.onContextAction;

    this.initToolbar();
    this.initParamControls();
    this.initActionButtons();
    this.initHamburgerMenu();
    this.initContextMenu();
    this.initVictoryButtons();
  }

  getGameMode(): GameMode {
    return this.gameMode;
  }

  setGameMode(mode: GameMode): void {
    this.gameMode = mode;
    this.updateModeUI();
  }

  getActiveTool(): CellType {
    return this.activeTool;
  }

  private initToolbar(): void {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    const tools: ToolItemData[] = [
      { type: CellType.Start, icon: '▶' },
      { type: CellType.Goal, icon: '★' },
      { type: CellType.Normal, icon: '□' },
      { type: CellType.Accelerator, icon: '»' },
      { type: CellType.Decelerator, icon: '≡' },
      { type: CellType.Bouncer, icon: '⌒' },
      { type: CellType.Portal, icon: '◎' },
      { type: CellType.MovingPlatform, icon: '▬' },
      { type: CellType.Wall, icon: '▦' },
      { type: CellType.Empty, icon: '✕' }
    ];

    toolbar.innerHTML = '';

    tools.forEach(tool => {
      const item = document.createElement('div');
      item.className = 'tool-item';
      item.dataset.type = tool.type;
      if (tool.type === this.activeTool) {
        item.classList.add('active');
      }

      const colors = CELL_COLORS[tool.type];

      const iconEl = document.createElement('div');
      iconEl.className = 'tool-icon';
      iconEl.textContent = tool.icon;
      iconEl.style.background = colors.fill;
      iconEl.style.color = colors.glow;
      iconEl.style.border = `1px solid ${colors.border}`;
      iconEl.style.boxShadow = `0 0 8px ${colors.glow}40`;

      const labelEl = document.createElement('div');
      labelEl.className = 'tool-label';
      labelEl.textContent = CELL_NAMES[tool.type];

      item.appendChild(iconEl);
      item.appendChild(labelEl);
      toolbar.appendChild(item);

      item.addEventListener('click', () => {
        this.selectTool(tool.type);
      });

      item.addEventListener('mouseenter', (e) => {
        this.showTooltip(e, CELL_NAMES[tool.type], CELL_DESCRIPTIONS[tool.type]);
      });
      item.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  private selectTool(type: CellType): void {
    this.activeTool = type;
    document.querySelectorAll('.tool-item').forEach(el => {
      el.classList.toggle('active', el.dataset.type === type);
    });
    this.onToolSelect?.(type);
  }

  private initParamControls(): void {
    const sliderConfigs = [
      { id: 'gravity', param: 'gravity', min: 0.1, max: 3, curveFn: this.drawLinearCurve.bind(this) },
      { id: 'friction', param: 'friction', min: 0, max: 1, curveFn: this.drawInverseCurve.bind(this) },
      { id: 'minsteps', param: 'minSteps', min: 1, max: 100, curveFn: this.drawLinearCurve.bind(this) }
    ];

    sliderConfigs.forEach(cfg => {
      const slider = document.getElementById(`${cfg.id}-slider`) as HTMLInputElement | null;
      const input = document.getElementById(`${cfg.id}-input`) as HTMLInputElement | null;
      const curveCanvas = document.getElementById(`${cfg.id}-curve`) as HTMLCanvasElement | null;

      if (!slider || !input || !curveCanvas) return;

      cfg.curveFn(curveCanvas, parseFloat(slider.value), cfg.min, cfg.max);

      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        input.value = v.toString();
        cfg.curveFn(curveCanvas, v, cfg.min, cfg.max);
        this.onParamChange?.(cfg.param, v);
      });

      input.addEventListener('change', () => {
        let v = parseFloat(input.value);
        if (isNaN(v)) v = parseFloat(slider.value);
        v = Math.max(cfg.min, Math.min(cfg.max, v));
        input.value = v.toString();
        slider.value = v.toString();
        cfg.curveFn(curveCanvas, v, cfg.min, cfg.max);
        this.onParamChange?.(cfg.param, v);
      });
    });

    const intensityInput = document.createElement('div');
    intensityInput.style.cssText = 'margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(100,255,218,0.1);';
    intensityInput.innerHTML = `
      <div style="font-size:12px; color:#8892b0; letter-spacing:1.5px; margin-bottom:8px;">格子强度</div>
      <div style="display:flex; gap:6px;">
        <button data-level="1" class="intensity-btn" style="flex:1; padding:6px; background:rgba(100,255,218,0.08); color:#a8b2d1; border:1px solid rgba(100,255,218,0.2); border-radius:6px; cursor:pointer; font-size:12px; transition:all 0.2s;">1x</button>
        <button data-level="2" class="intensity-btn active" style="flex:1; padding:6px; background:rgba(100,255,218,0.15); color:#64ffda; border:1px solid rgba(100,255,218,0.5); border-radius:6px; cursor:pointer; font-size:12px; transition:all 0.2s;">2x</button>
        <button data-level="3" class="intensity-btn" style="flex:1; padding:6px; background:rgba(100,255,218,0.08); color:#a8b2d1; border:1px solid rgba(100,255,218,0.2); border-radius:6px; cursor:pointer; font-size:12px; transition:all 0.2s;">3x</button>
      </div>
    `;
    const panelBody = document.querySelector('.panel-body');
    if (panelBody) {
      panelBody.appendChild(intensityInput);
      intensityInput.querySelectorAll('.intensity-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const level = parseInt((btn as HTMLElement).dataset.level || '1');
          intensityInput.querySelectorAll('.intensity-btn').forEach(b => {
            const el = b as HTMLElement;
            const active = (el.dataset.level || '1') === String(level);
            el.style.background = active ? 'rgba(100,255,218,0.15)' : 'rgba(100,255,218,0.08)';
            el.style.color = active ? '#64ffda' : '#a8b2d1';
            el.style.borderColor = active ? 'rgba(100,255,218,0.5)' : 'rgba(100,255,218,0.2)';
            if (active) el.classList.add('active');
            else el.classList.remove('active');
          });
          this.onIntensityChange?.(level);
        });
      });
    }
  }

  private drawLinearCurve(canvas: HTMLCanvasElement, value: number, min: number, max: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const t = (value - min) / (max - min);

    ctx.strokeStyle = 'rgba(100, 255, 218, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = (h - 1) * i / 4;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    ctx.strokeStyle = '#64ffda';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - 1);
    ctx.lineTo(w * t, h - 1 - (h - 4) * t);
    ctx.stroke();

    ctx.fillStyle = '#b829f0';
    ctx.beginPath();
    ctx.arc(w * t, h - 1 - (h - 4) * t, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a192f';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawInverseCurve(canvas: HTMLCanvasElement, value: number, min: number, max: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const t = (value - min) / (max - min);
    const yT = 1 - t;

    ctx.strokeStyle = 'rgba(100, 255, 218, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = (h - 1) * i / 4;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    ctx.strokeStyle = '#ff5064';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    for (let x = 0; x <= w * t; x++) {
      const localT = w > 0 ? x / w : 0;
      const y = 2 + (h - 4) * localT;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#b829f0';
    ctx.beginPath();
    ctx.arc(w * t, 2 + (h - 4) * t, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a192f';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private initActionButtons(): void {
    const testBtn = document.getElementById('test-btn');
    const stopBtn = document.getElementById('stop-btn');
    const clearBtn = document.getElementById('clear-btn');

    testBtn?.addEventListener('click', () => {
      this.setGameMode('testing');
      this.onStartTest?.();
    });

    stopBtn?.addEventListener('click', () => {
      this.setGameMode('editor');
      this.onStopTest?.();
    });

    clearBtn?.addEventListener('click', () => {
      if (confirm('确定要清空当前关卡吗？')) {
        this.onClearLevel?.();
      }
    });
  }

  private initHamburgerMenu(): void {
    const btn = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const panel = document.getElementById('panel');

    btn?.addEventListener('click', () => {
      this.menuOpen = !this.menuOpen;
      btn.classList.toggle('active', this.menuOpen);
      sidebar?.classList.toggle('show', this.menuOpen);
      panel?.classList.toggle('show', this.menuOpen);
    });
  }

  private initContextMenu(): void {
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    menu.querySelectorAll('.context-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = (item as HTMLElement).dataset.action;
        if (action && this.contextCol >= 0 && this.contextRow >= 0) {
          this.onContextAction?.(action, this.contextCol, this.contextRow);
        }
        this.hideContextMenu();
      });
    });

    document.addEventListener('click', () => this.hideContextMenu());
  }

  showContextMenu(x: number, y: number, col: number, row: number): void {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    this.contextCol = col;
    this.contextRow = row;

    const rect = document.body.getBoundingClientRect();
    let left = x;
    let top = y;

    if (left + 150 > rect.width) left = rect.width - 160;
    if (top + 100 > rect.height) top = rect.height - 110;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.classList.remove('hidden');
    requestAnimationFrame(() => menu.classList.add('show'));
  }

  hideContextMenu(): void {
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    menu.classList.remove('show');
    setTimeout(() => menu.classList.add('hidden'), 200);
    this.contextCol = -1;
    this.contextRow = -1;
  }

  private initVictoryButtons(): void {
    const retryBtn = document.getElementById('retry-btn');
    const backBtn = document.getElementById('back-btn');

    retryBtn?.addEventListener('click', () => {
      this.hideVictory();
      this.onRetry?.();
    });

    backBtn?.addEventListener('click', () => {
      this.hideVictory();
      this.setGameMode('editor');
      this.onBackToEditor?.();
    });
  }

  private updateModeUI(): void {
    const testBtn = document.getElementById('test-btn');
    const stopBtn = document.getElementById('stop-btn');
    const hud = document.getElementById('hud');
    const sidebar = document.getElementById('sidebar');
    const panel = document.getElementById('panel');

    if (this.gameMode === 'testing') {
      testBtn?.classList.add('hidden');
      stopBtn?.classList.remove('hidden');
      hud?.classList.remove('hidden');
      sidebar?.classList.remove('show');
      panel?.classList.remove('show');
      if (this.menuOpen) {
        const hamburger = document.getElementById('hamburger-btn');
        hamburger?.classList.remove('active');
        this.menuOpen = false;
      }
    } else {
      testBtn?.classList.remove('hidden');
      stopBtn?.classList.add('hidden');
      hud?.classList.add('hidden');
    }
  }

  updateHUD(time: number, steps: number): void {
    const timerEl = document.getElementById('hud-timer');
    const stepsEl = document.getElementById('hud-steps');
    if (timerEl) timerEl.textContent = this.formatTime(time);
    if (stepsEl) stepsEl.textContent = steps.toString();
  }

  showVictory(time: number, steps: number, target: number): void {
    const overlay = document.getElementById('victory-overlay');
    const timeEl = document.getElementById('result-time');
    const stepsEl = document.getElementById('result-steps');
    const targetEl = document.getElementById('result-target');
    const starsEl = document.getElementById('result-stars');

    if (timeEl) timeEl.textContent = this.formatTime(time);
    if (stepsEl) stepsEl.textContent = steps.toString();
    if (targetEl) targetEl.textContent = target.toString();

    if (starsEl) {
      const ratio = steps / Math.max(1, target);
      let stars = 1;
      if (ratio <= 1.0) stars = 3;
      else if (ratio <= 1.5) stars = 2;
      else stars = 1;
      starsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    }

    overlay?.classList.remove('hidden');
    requestAnimationFrame(() => {
      overlay?.classList.add('show');
    });
  }

  hideVictory(): void {
    const overlay = document.getElementById('victory-overlay');
    overlay?.classList.remove('show');
    setTimeout(() => overlay?.classList.add('hidden'), 300);
  }

  flashEdge(): void {
    const flash = document.getElementById('edge-flash');
    if (!flash) return;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 250);
  }

  private showTooltip(e: MouseEvent, title: string, description: string): void {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;
    tooltip.innerHTML = `<strong>${title}</strong>${description}`;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let left = rect.right + 12;
    let top = rect.top;

    const bodyRect = document.body.getBoundingClientRect();
    if (left + 240 > bodyRect.width) {
      left = rect.left - 252;
    }
    if (top + 100 > bodyRect.height) {
      top = bodyRect.height - 110;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.classList.remove('hidden');
    requestAnimationFrame(() => tooltip.classList.add('show'));
  }

  private hideTooltip(): void {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;
    tooltip.classList.remove('show');
    setTimeout(() => tooltip.classList.add('hidden'), 150);
  }

  private formatTime(ms: number): string {
    const totalSec = ms / 1000;
    const minutes = Math.floor(totalSec / 60);
    const seconds = Math.floor(totalSec % 60);
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }
}
