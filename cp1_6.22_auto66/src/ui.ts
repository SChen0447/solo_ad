// ui.ts - 界面渲染模块
// 负责绘制Canvas上所有视觉元素：录音机机身、按键、磁带盘、走带指示器、录音指示灯、波形显示区域
// 监听键盘事件（空格=播放/暂停，R=录音，←=倒带，→=快进），映射为对 recorder.ts 的调用
// 数据流向：接收键盘事件 -> 调用 recorder.ts -> recorder.ts 触发状态变化 -> ui.ts 渲染下一帧

import { TapeRecorder, RecorderState } from './recorder';
import {
  drawWoodTexture,
  drawRecorderBody,
  drawMetalButton,
  drawTapeReel,
  drawTapeBetweenReels,
  drawIndicatorLight,
  drawWaveformDisplay,
  KeyButton,
  ReelState
} from './visuals';

interface PressedKeys {
  space: boolean;
  r: boolean;
  left: boolean;
  right: boolean;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const REEL_RADIUS = 50;
const REEL_BASE_SPEED = 2 * Math.PI * 1.5;

export class RecorderUI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private recorder: TapeRecorder;

  private buttons: Record<string, KeyButton> = {};
  private leftReel: ReelState;
  private rightReel: ReelState;

  private pressedKeys: PressedKeys = {
    space: false,
    r: false,
    left: false,
    right: false
  };

  private keyHoldTimers: Record<string, number> = {};
  private lastFrameTime = 0;
  private rafId: number | null = null;
  private currentState: RecorderState = 'idle';
  private errorMessage: string = '';
  private errorTimer = 0;
  private stateTransitionStart = 0;
  private previousState: RecorderState = 'idle';

  private bodyX = 70;
  private bodyY = 60;
  private bodyW = 500;
  private bodyH = 370;

  constructor(canvas: HTMLCanvasElement, recorder: TapeRecorder) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
    this.recorder = recorder;

    this.leftReel = {
      x: this.bodyX + 140,
      y: this.bodyY + 130,
      radius: REEL_RADIUS,
      rotation: 0,
      speed: 0
    };

    this.rightReel = {
      x: this.bodyX + 360,
      y: this.bodyY + 130,
      radius: REEL_RADIUS,
      rotation: 0,
      speed: 0
    };

    this.initButtons();
    this.bindEvents();
    this.currentState = recorder.getState();
  }

  private initButtons(): void {
    const btnY = this.bodyY + 300;
    const btnSize = 56;
    const gap = 30;
    const totalW = btnSize * 4 + gap * 3;
    const startX = this.bodyX + (this.bodyW - totalW) / 2;

    this.buttons['play'] = {
      x: startX,
      y: btnY,
      width: btnSize,
      height: btnSize,
      label: '▶',
      pressed: false
    };

    this.buttons['record'] = {
      x: startX + btnSize + gap,
      y: btnY,
      width: btnSize,
      height: btnSize,
      label: '●',
      pressed: false
    };

    this.buttons['rewind'] = {
      x: startX + (btnSize + gap) * 2,
      y: btnY,
      width: btnSize,
      height: btnSize,
      label: '◀◀',
      pressed: false
    };

    this.buttons['fastForward'] = {
      x: startX + (btnSize + gap) * 3,
      y: btnY,
      width: btnSize,
      height: btnSize,
      label: '▶▶',
      pressed: false
    };
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;

    const key = e.key.toLowerCase();

    if (key === ' ' || key === 'spacebar') {
      e.preventDefault();
      this.pressedKeys.space = true;
      this.buttons['play'].pressed = true;
      this.recorder.togglePlayPause();
    } else if (key === 'r') {
      e.preventDefault();
      this.pressedKeys.r = true;
      this.buttons['record'].pressed = true;
      if (this.currentState !== 'recording') {
        this.recorder.startRecord();
      } else {
        this.recorder.stop();
      }
    } else if (key === 'arrowleft') {
      e.preventDefault();
      this.pressedKeys.left = true;
      this.buttons['rewind'].pressed = true;
      this.recorder.startRewind();
      this.startHoldTimer('left', () => {
        if (this.pressedKeys.left) this.recorder.startRewind();
      });
    } else if (key === 'arrowright') {
      e.preventDefault();
      this.pressedKeys.right = true;
      this.buttons['fastForward'].pressed = true;
      this.recorder.startFastForward();
      this.startHoldTimer('right', () => {
        if (this.pressedKeys.right) this.recorder.startFastForward();
      });
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();

    if (key === ' ' || key === 'spacebar') {
      this.pressedKeys.space = false;
      this.buttons['play'].pressed = false;
    } else if (key === 'r') {
      this.pressedKeys.r = false;
      this.buttons['record'].pressed = false;
    } else if (key === 'arrowleft') {
      this.pressedKeys.left = false;
      this.buttons['rewind'].pressed = false;
      this.stopHoldTimer('left');
      if (this.currentState === 'rewinding') {
        this.recorder.stop();
      }
    } else if (key === 'arrowright') {
      this.pressedKeys.right = false;
      this.buttons['fastForward'].pressed = false;
      this.stopHoldTimer('right');
      if (this.currentState === 'fastForward') {
        this.recorder.stop();
      }
    }
  }

  private startHoldTimer(key: string, action: () => void): void {
    this.stopHoldTimer(key);
    this.keyHoldTimers[key] = window.setInterval(() => {
      action();
    }, 120);
  }

  private stopHoldTimer(key: string): void {
    if (this.keyHoldTimers[key]) {
      clearInterval(this.keyHoldTimers[key]);
      delete this.keyHoldTimers[key];
    }
  }

  setState(state: RecorderState): void {
    if (this.currentState !== state) {
      this.previousState = this.currentState;
      this.stateTransitionStart = performance.now();
    }
    this.currentState = state;

    switch (state) {
      case 'playing':
        this.buttons['play'].label = '❚❚';
        break;
      case 'recording':
        this.buttons['record'].pressed = true;
        this.buttons['play'].label = '▶';
        break;
      case 'fastForward':
        this.buttons['fastForward'].pressed = true;
        this.buttons['play'].label = '▶';
        break;
      case 'rewinding':
        this.buttons['rewind'].pressed = true;
        this.buttons['play'].label = '▶';
        break;
      case 'idle':
      default:
        this.buttons['play'].label = '▶';
        if (!this.pressedKeys.r) this.buttons['record'].pressed = false;
        if (!this.pressedKeys.left) this.buttons['rewind'].pressed = false;
        if (!this.pressedKeys.right) this.buttons['fastForward'].pressed = false;
        break;
    }
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.errorTimer = performance.now();
  }

  start(): void {
    const render = (now: number) => {
      const dt = this.lastFrameTime ? Math.min(0.05, (now - this.lastFrameTime) / 1000) : 0.016;
      this.lastFrameTime = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(render);
    };
    this.rafId = requestAnimationFrame(render);
  }

  private update(dt: number): void {
    let reelSpeed = 0;

    switch (this.currentState) {
      case 'playing':
        reelSpeed = REEL_BASE_SPEED;
        break;
      case 'recording':
        reelSpeed = REEL_BASE_SPEED * 0.9;
        break;
      case 'fastForward':
        reelSpeed = REEL_BASE_SPEED * 2;
        break;
      case 'rewinding':
        reelSpeed = -REEL_BASE_SPEED * 2;
        break;
      case 'idle':
      default:
        reelSpeed = 0;
        break;
    }

    const transitionProgress = Math.min(1, (performance.now() - this.stateTransitionStart) / 200);
    const eased = this.easeOutQuad(transitionProgress);
    const targetLeftSpeed = reelSpeed;
    const targetRightSpeed = reelSpeed > 0 ? reelSpeed * 1.05 : -Math.abs(reelSpeed) * 0.95;

    this.leftReel.speed = this.interpolate(this.leftReel.speed, targetLeftSpeed, eased);
    this.rightReel.speed = this.interpolate(this.rightReel.speed, targetRightSpeed, eased);

    this.leftReel.rotation += this.leftReel.speed * dt;
    this.rightReel.rotation += this.rightReel.speed * dt;
  }

  private interpolate(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private render(): void {
    const ctx = this.ctx;

    drawWoodTexture(ctx, CANVAS_WIDTH, CANVAS_HEIGHT, 12345);

    ctx.save();
    ctx.translate(0, 0);
    drawRecorderBody(ctx, this.bodyX, this.bodyY, this.bodyW, this.bodyH);
    ctx.restore();

    this.drawTitleLabel();

    const tapeY = this.bodyY + 130;
    const tapeTop = tapeY - 3;
    drawTapeBetweenReels(
      ctx,
      this.leftReel.x + this.leftReel.radius * 0.35,
      this.rightReel.x - this.rightReel.radius * 0.35,
      tapeTop,
      6
    );

    drawTapeReel(ctx, this.leftReel);
    drawTapeReel(ctx, this.rightReel);

    this.drawTapeWindow();

    const lightX = this.bodyX + this.bodyW - 35;
    const lightY = this.bodyY + 30;
    const lightRadius = 7;

    if (this.currentState === 'recording') {
      drawIndicatorLight(ctx, lightX, lightY, lightRadius, '#e53935', true, true);
    } else if (this.currentState === 'playing') {
      drawIndicatorLight(ctx, lightX, lightY, lightRadius, '#66bb6a', true, false);
    } else {
      drawIndicatorLight(ctx, lightX, lightY, lightRadius, '#888', false, false);
    }

    this.drawStatusLabel();

    const waveformX = this.bodyX + (this.bodyW - 280) / 2;
    const waveformY = this.bodyY + 210;
    const waveform = this.recorder.getWaveform();
    const playPos = this.recorder.getPlayPosition();

    let waveMode: 'scroll' | 'scan' | 'record' | 'static' = 'static';
    if (this.currentState === 'recording') waveMode = 'record';
    else if (this.currentState === 'playing') waveMode = 'scroll';
    else if (this.currentState === 'fastForward' || this.currentState === 'rewinding') waveMode = 'scan';

    drawWaveformDisplay(ctx, waveformX, waveformY, 280, 50, waveform, playPos, waveMode);

    drawMetalButton(ctx, this.buttons['play']);
    drawMetalButton(ctx, this.buttons['record']);
    drawMetalButton(ctx, this.buttons['rewind']);
    drawMetalButton(ctx, this.buttons['fastForward']);

    this.drawKeyLabels();
    this.drawTimeDisplay();
    this.drawErrorMessage();
  }

  private drawTitleLabel(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#4e342e';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❖ PAPER TAPE ❖', this.bodyX + this.bodyW / 2, this.bodyY + 30);
    ctx.restore();
  }

  private drawStatusLabel(): void {
    const ctx = this.ctx;
    const x = this.bodyX + 45;
    const y = this.bodyY + 30;

    let text = '';
    let color = '#5d4037';

    switch (this.currentState) {
      case 'idle':
        text = '待机';
        color = '#6d4c41';
        break;
      case 'playing':
        text = '播放中';
        color = '#2e7d32';
        break;
      case 'recording':
        text = '录音中';
        color = '#c62828';
        break;
      case 'fastForward':
        text = '快进';
        color = '#e65100';
        break;
      case 'rewinding':
        text = '倒带';
        color = '#1565c0';
        break;
    }

    ctx.save();
    ctx.fillStyle = color;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`[ ${text} ]`, x, y);
    ctx.restore();
  }

  private drawTapeWindow(): void {
    const ctx = this.ctx;
    const wx = this.bodyX + 60;
    const wy = this.bodyY + 65;
    const ww = this.bodyW - 120;
    const wh = 125;

    ctx.save();

    const winGrad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    winGrad.addColorStop(0, 'rgba(62, 39, 35, 0.92)');
    winGrad.addColorStop(1, 'rgba(33, 21, 16, 0.95)');
    roundRectFill(ctx, wx, wy, ww, wh, 8);
    ctx.fillStyle = winGrad;
    ctx.fill();

    ctx.strokeStyle = '#2d1810';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    roundRectStroke(ctx, wx, wy, ww, wh, 8);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.18;
    const innerGlow = ctx.createRadialGradient(
      wx + ww / 2, wy + wh / 2, 10,
      wx + ww / 2, wy + wh / 2, ww * 0.6
    );
    innerGlow.addColorStop(0, '#ffcc80');
    innerGlow.addColorStop(1, 'rgba(255,204,128,0)');
    ctx.fillStyle = innerGlow;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.restore();

    ctx.restore();
  }

  private drawKeyLabels(): void {
    const ctx = this.ctx;
    const btnY = this.bodyY + 300;
    const btnSize = 56;
    const gap = 30;
    const totalW = btnSize * 4 + gap * 3;
    const startX = this.bodyX + (this.bodyW - totalW) / 2;
    const labelY = btnY + btnSize + 20;

    ctx.save();
    ctx.fillStyle = '#5d4037';
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.fillText('空格', startX + btnSize / 2, labelY);
    ctx.fillText('R 键', startX + (btnSize + gap) + btnSize / 2, labelY);
    ctx.fillText('← 键', startX + (btnSize + gap) * 2 + btnSize / 2, labelY);
    ctx.fillText('→ 键', startX + (btnSize + gap) * 3 + btnSize / 2, labelY);
    ctx.restore();
  }

  private drawTimeDisplay(): void {
    const ctx = this.ctx;
    const waveformX = this.bodyX + (this.bodyW - 280) / 2;
    const waveformY = this.bodyY + 210;
    const playPos = this.recorder.getPlayPositionSeconds();
    const totalDur = this.recorder.getRecordedDuration();

    const formatTime = (t: number): string => {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    ctx.save();
    ctx.fillStyle = '#6d4c41';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatTime(playPos), waveformX + 6, waveformY - 10);
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(Math.max(playPos, totalDur)), waveformX + 280 - 6, waveformY - 10);
    ctx.restore();
  }

  private drawErrorMessage(): void {
    if (!this.errorMessage) return;
    const elapsed = performance.now() - this.errorTimer;
    if (elapsed > 3000) {
      this.errorMessage = '';
      return;
    }

    const ctx = this.ctx;
    const alpha = 1 - Math.max(0, (elapsed - 2200) / 800);

    ctx.save();
    ctx.globalAlpha = alpha;

    const msg = this.errorMessage;
    ctx.font = 'bold 14px Georgia, serif';
    const metrics = ctx.measureText(msg);
    const padding = 14;
    const w = metrics.width + padding * 2;
    const h = 36;
    const x = (CANVAS_WIDTH - w) / 2;
    const y = 14;

    ctx.fillStyle = 'rgba(62, 39, 35, 0.95)';
    roundRectFill(ctx, x, y, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = '#e53935';
    ctx.lineWidth = 2;
    roundRectStroke(ctx, x, y, w, h, 6);
    ctx.stroke();

    ctx.fillStyle = '#ffcdd2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, CANVAS_WIDTH / 2, y + h / 2 + 1);

    ctx.restore();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    Object.keys(this.keyHoldTimers).forEach((k) => this.stopHoldTimer(k));
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

function roundRectFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function roundRectStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  roundRectFill(ctx, x, y, w, h, r);
}
