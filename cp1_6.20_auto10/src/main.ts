import { BeatEngine, type Difficulty, type BeatAnalysisResult } from './beatEngine';
import { DotRenderer, type BeatPoint, type DotState } from './dotRenderer';
import { UIController, type JudgeType } from './uiController';

type GameState = 'idle' | 'loading' | 'ready' | 'countdown' | 'playing' | 'paused' | 'finished';

const COUNTDOWN_SECONDS = 3;
const PERFECT_THRESHOLD = 0.35;
const GOOD_THRESHOLD = 0.7;
const MISS_THRESHOLD = 1.15;

const PERFECT_SCORE = 1000;
const GOOD_SCORE = 500;
const COMBO_BONUS_PER = 10;
const MAX_COMBO_BONUS = 500;

export class RhythmGameApp {
  private readonly canvas: HTMLCanvasElement;
  private readonly beatEngine: BeatEngine;
  private readonly dotRenderer: DotRenderer;
  private readonly ui: UIController;

  private state: GameState = 'idle';
  private beatResult: BeatAnalysisResult | null = null;
  private beatPoints: BeatPoint[] = [];
  private judgedBeatIndices: Set<number> = new Set();

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private perfectCount = 0;
  private goodCount = 0;
  private missCount = 0;

  private countdownStart = 0;
  private lastFrameTime = 0;
  private animFrameId = 0;
  private fpsCounter = 0;
  private fpsTimeAccum = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element #game-canvas not found');
    }

    this.beatEngine = new BeatEngine();
    this.dotRenderer = new DotRenderer(this.canvas);

    this.ui = new UIController({
      onAudioUpload: this.handleAudioUpload.bind(this),
      onDifficultyChange: this.handleDifficultyChange.bind(this),
      onStart: this.handleStart.bind(this),
      onPause: this.handlePause.bind(this),
      onResume: this.handleResume.bind(this),
      onQuit: this.handleQuit.bind(this),
      onRetry: this.handleRetry.bind(this),
      onHome: this.handleHome.bind(this)
    });

    this.bindGlobalListeners();
    this.setGameState('idle');
    this.ui.setScreen('start');
    this.ui.setStartButtonEnabled(false);
    this.dotRenderer.clear();
  }

  private bindGlobalListeners(): void {
    const resizeHandler = (): void => {
      this.dotRenderer.resize();
      if (this.beatResult) {
        this.beatPoints = this.dotRenderer.generatePath(
          this.beatResult.beats,
          this.beatResult.duration
        );
      }
    };

    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', resizeHandler);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') {
        this.handlePause();
      }
    });

    const preventDefault = (e: Event): void => {
      if (e.target === this.canvas) {
        e.preventDefault();
      }
    };
    this.canvas.addEventListener('contextmenu', preventDefault);
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  private setGameState(state: GameState): void {
    this.state = state;
  }

  private async handleAudioUpload(file: File): Promise<void> {
    this.setGameState('loading');
    this.ui.setStartButtonEnabled(false);

    try {
      const startTime = performance.now();
      const arrayBuffer = await this.beatEngine.loadAudioFile(file);
      await this.beatEngine.decodeAudio(arrayBuffer);

      const diff = this.ui.getDifficulty();
      this.beatResult = this.beatEngine.analyzeBeats(diff);

      if (this.beatResult.beats.length === 0) {
        alert('未能识别到音频节拍，请尝试其他音频文件或调整难度。');
        this.setGameState('idle');
        this.ui.setStartButtonEnabled(false);
        return;
      }

      this.beatPoints = this.dotRenderer.generatePath(
        this.beatResult.beats,
        this.beatResult.duration
      );

      const elapsed = performance.now() - startTime;
      console.info(`[RhythmGame] 节拍解析完成: ${this.beatResult.beats.length} beats, BPM ~${this.beatResult.bpm}, 耗时 ${elapsed.toFixed(1)}ms`);

      this.resetScore();
      this.setGameState('ready');
      this.ui.setStartButtonEnabled(true);
    } catch (err) {
      console.error('[RhythmGame] 音频解析失败:', err);
      alert('音频解析失败，请确保上传的是有效的 MP3 文件。');
      this.setGameState('idle');
      this.ui.setStartButtonEnabled(false);
    }
  }

  private async handleDifficultyChange(difficulty: Difficulty): Promise<void> {
    if (!this.beatEngine.duration || this.state === 'idle') {
      this.ui.setDifficulty(difficulty);
      return;
    }

    this.ui.setDifficulty(difficulty);

    if (this.beatEngine.duration > 0) {
      this.setGameState('loading');
      this.ui.setStartButtonEnabled(false);

      await Promise.resolve();
      this.beatResult = this.beatEngine.analyzeBeats(difficulty);
      this.beatPoints = this.dotRenderer.generatePath(
        this.beatResult.beats,
        this.beatResult.duration
      );

      this.resetScore();
      this.setGameState('ready');
      this.ui.setStartButtonEnabled(true);
    }
  }

  private handleStart(): void {
    if (this.state !== 'ready' && this.state !== 'idle') return;
    if (!this.beatResult) return;

    this.resetScore();
    this.judgedBeatIndices.clear();
    this.countdownStart = performance.now();
    this.setGameState('countdown');

    this.ui.setScreen('game');
    this.ui.updateScore(0);
    this.ui.updateCombo(0);
    this.ui.updateTime(this.beatResult.duration);
  }

  private handlePause(): void {
    if (this.state !== 'playing') return;

    this.beatEngine.pause();
    this.setGameState('paused');
    this.ui.setScreen('pause');
  }

  private handleResume(): void {
    if (this.state !== 'paused') return;

    this.setGameState('playing');
    this.ui.setScreen('game');
    this.beatEngine.start();
    this.lastFrameTime = performance.now();
  }

  private handleQuit(): void {
    this.endGameSession(true);
    this.ui.setScreen('start');
    this.ui.setStartButtonEnabled(true);
  }

  private handleRetry(): void {
    if (!this.beatResult) return;

    this.beatEngine.reset();
    this.resetScore();
    this.judgedBeatIndices.clear();

    this.beatPoints = this.dotRenderer.generatePath(
      this.beatResult.beats,
      this.beatResult.duration
    );

    this.countdownStart = performance.now();
    this.setGameState('countdown');
    this.ui.setScreen('game');
    this.ui.updateScore(0);
    this.ui.updateCombo(0);
    this.ui.updateTime(this.beatResult.duration);
  }

  private handleHome(): void {
    this.endGameSession(true);
    this.ui.setScreen('start');
    this.ui.setStartButtonEnabled(true);
  }

  private resetScore(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
  }

  private endGameSession(silent: boolean): void {
    this.beatEngine.stop();

    if (!silent && this.beatResult) {
      const totalBeats = this.beatResult.beats.length;
      const hitTotal = this.perfectCount + this.goodCount;
      const hitRate = totalBeats > 0 ? (hitTotal / totalBeats) * 100 : 0;

      this.ui.showResult({
        score: this.score,
        maxCombo: this.maxCombo,
        hitRate,
        perfectCount: this.perfectCount,
        goodCount: this.goodCount,
        missCount: this.missCount
      });

      this.ui.setScreen('result');
    }

    this.setGameState(silent ? 'ready' : 'finished');
  }

  private judgeBeat(beatIndex: number, dot: DotState, currentTime: number): void {
    if (this.judgedBeatIndices.has(beatIndex)) return;

    const beat = this.beatPoints[beatIndex];
    if (!beat) return;

    const timeOffset = Math.abs(currentTime - beat.time);
    const window = this.dotRenderer.metrics.dotSize * 3.2;

    const { normalizedDistance } = this.dotRenderer.computeHitScore(
      dot.x,
      dot.y,
      this.dotRenderer.cursor.active
    );

    const combined = Math.max(normalizedDistance, timeOffset / 0.35);
    const timeMissWindow = 0.28;

    let judge: JudgeType;
    if (timeOffset > timeMissWindow && combined > MISS_THRESHOLD) {
      judge = 'miss';
    } else if (combined <= PERFECT_THRESHOLD) {
      judge = 'perfect';
    } else if (combined <= GOOD_THRESHOLD) {
      judge = 'good';
    } else {
      judge = 'miss';
    }

    this.applyJudge(judge, beatIndex, dot.x, dot.y, window);
  }

  private applyJudge(
    judge: JudgeType,
    beatIndex: number,
    popupX: number,
    popupY: number,
    _windowSize: number
  ): void {
    this.judgedBeatIndices.add(beatIndex);

    let scoreDelta = 0;
    switch (judge) {
      case 'perfect':
        this.combo++;
        this.perfectCount++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        scoreDelta = PERFECT_SCORE + Math.min(this.combo * COMBO_BONUS_PER, MAX_COMBO_BONUS);
        this.ui.playHitSound('perfect');
        break;
      case 'good':
        this.combo++;
        this.goodCount++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        scoreDelta = GOOD_SCORE + Math.min(this.combo * COMBO_BONUS_PER, MAX_COMBO_BONUS);
        this.ui.playHitSound('good');
        break;
      case 'miss':
        this.combo = 0;
        this.missCount++;
        this.ui.playMissSound();
        break;
    }

    this.score += scoreDelta;
    this.ui.updateScore(this.score);
    this.ui.updateCombo(this.combo);
    this.ui.showJudgePopup(judge, popupX, popupY);
  }

  private gameLoop = (now: number): void => {
    this.animFrameId = requestAnimationFrame(this.gameLoop);

    const dt = Math.min(now - this.lastFrameTime, 100);
    this.lastFrameTime = now;

    this.fpsCounter++;
    this.fpsTimeAccum += dt;
    if (this.fpsTimeAccum >= 1000) {
      this.fpsTimeAccum -= 1000;
      this.fpsCounter = 0;
    }

    switch (this.state) {
      case 'countdown':
        this.updateCountdown(now);
        this.renderCountdown(now);
        break;
      case 'playing':
        this.updatePlaying(now, dt);
        break;
      case 'paused':
        this.renderPaused(now);
        break;
      case 'ready':
      case 'idle':
      case 'finished':
      case 'loading':
        this.renderIdle(now);
        break;
    }
  };

  private updateCountdown(now: number): void {
    const elapsed = (now - this.countdownStart) / 1000;
    const remaining = COUNTDOWN_SECONDS - elapsed;

    if (remaining <= 0) {
      this.setGameState('playing');
      this.beatEngine.start();
      this.lastFrameTime = now;
    }
  }

  private renderCountdown(now: number): void {
    const elapsed = (now - this.countdownStart) / 1000;
    const animTime = -COUNTDOWN_SECONDS + elapsed;

    const previewDot = this.dotRenderer.computeDotPosition(animTime);
    this.dotRenderer.render(now / 1000, previewDot, animTime);

    const ctx = (this.canvas.getContext('2d') as CanvasRenderingContext2D);
    const cx = this.canvas.clientWidth / 2;
    const cy = this.canvas.clientHeight / 2;
    const remaining = COUNTDOWN_SECONDS - elapsed;
    const displayNum = Math.max(1, Math.ceil(remaining));
    const numT = 1 - (remaining - (displayNum - 1));

    ctx.save();
    ctx.translate(cx, cy);
    const scale = 1 + numT * 0.3;
    const alpha = 1 - numT;
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 140px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const grad = ctx.createLinearGradient(0, -70, 0, 70);
    grad.addColorStop(0, '#ffe066');
    grad.addColorStop(1, '#7c4dff');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(255, 224, 102, 0.6)';
    ctx.shadowBlur = 32;
    ctx.fillText(displayNum.toString(), 0, 0);
    ctx.restore();

    if (this.beatResult) {
      this.ui.updateTime(this.beatResult.duration);
    }
  }

  private updatePlaying(now: number, _dt: number): void {
    if (!this.beatResult) return;

    const currentTime = this.beatEngine.playbackTime;
    const duration = this.beatResult.duration;
    const remaining = Math.max(0, duration - currentTime);

    const dot = this.dotRenderer.computeDotPosition(currentTime);
    this.dotRenderer.render(now / 1000, dot, currentTime);

    for (let i = 0; i < this.beatPoints.length; i++) {
      if (this.judgedBeatIndices.has(i)) continue;

      const beat = this.beatPoints[i];
      const timeDiff = currentTime - beat.time;

      if (timeDiff > 0.25) {
        this.judgeBeat(i, dot, currentTime);
      } else if (Math.abs(timeDiff) <= 0.025) {
        this.judgeBeat(i, dot, currentTime);
      }
    }

    this.ui.updateTime(remaining);

    if (remaining <= 0 || currentTime >= duration - 0.05) {
      this.endGameSession(false);
    }
  }

  private renderPaused(now: number): void {
    if (!this.beatResult) {
      this.renderIdle(now);
      return;
    }
    const currentTime = this.beatEngine.playbackTime;
    const dot = this.dotRenderer.computeDotPosition(currentTime);
    this.dotRenderer.render(now / 1000, dot, currentTime);
  }

  private renderIdle(now: number): void {
    this.dotRenderer.render(now / 1000, {
      x: this.canvas.clientWidth / 2,
      y: this.canvas.clientHeight / 2,
      targetIndex: 0,
      prevIndex: 0
    }, 0);

    const ctx = (this.canvas.getContext('2d') as CanvasRenderingContext2D);
    const t = now / 1000;
    const cx = this.canvas.clientWidth / 2;
    const cy = this.canvas.clientHeight / 2;

    for (let i = 0; i < 3; i++) {
      const radius = 80 + i * 50 + Math.sin(t * 1.2 + i) * 12;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 224, 102, ${0.04 + 0.03 * Math.sin(t * 2 + i * 0.8)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    this.beatEngine.dispose();
    this.ui.dispose();
  }
}

declare global {
  interface Window {
    __rhythmGame?: RhythmGameApp;
  }
}

const boot = (): void => {
  try {
    const app = new RhythmGameApp();
    window.__rhythmGame = app;
    app.start();
  } catch (err) {
    console.error('[RhythmGame] 初始化失败:', err);
    const msg = document.createElement('div');
    msg.style.cssText = `
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(10, 17, 40, 0.95); color: #ff8a80; font-family: sans-serif;
      padding: 24px; text-align: center; z-index: 9999;
    `;
    msg.textContent = `初始化失败: ${(err as Error).message}`;
    document.body.appendChild(msg);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
