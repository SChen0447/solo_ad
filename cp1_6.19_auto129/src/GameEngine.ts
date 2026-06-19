import {
  GROUND_Y_RATIO, LEVEL_LENGTH, BEAT_POINT_SIZE, TOTAL_BEAT_POINTS,
  GameState, GameData, ScoreGrade, RippleEffect, ScreenShake
} from './Types';
import { rectIntersect, clamp, lerp } from './utils';
import { Player } from './Player';
import { Level } from './Level';
import { UIManager } from './UIManager';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  groundY: number;

  state: GameState;
  player: Player;
  level: Level;
  ui: UIManager;

  cameraX: number;
  gameData: GameData;
  ripples: RippleEffect[];
  shake: ScreenShake;

  audioCtx: AudioContext | null;
  lastFrame: number;
  accumulator: number;
  fixedStep: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = 0;
    this.height = 0;
    this.groundY = 0;

    this.state = 'MENU';
    this.player = null as unknown as Player;
    this.level = null as unknown as Level;
    this.ui = new UIManager();

    this.cameraX = 0;
    this.gameData = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      multiplier: 1,
      progress: 0,
      grade: 'D'
    };
    this.ripples = [];
    this.shake = {
      active: false,
      duration: 0,
      maxDuration: 0,
      amplitude: 0,
      x: 0,
      y: 0
    };

    this.audioCtx = null;
    this.lastFrame = performance.now();
    this.accumulator = 0;
    this.fixedStep = 1000 / 60;

    this.resize();
    this.initWorld();
    this.bindEvents();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.groundY = this.height * GROUND_Y_RATIO;
  }

  private initWorld(): void {
    const startX = 200;
    this.player = new Player(startX, this.groundY - 100);
    this.level = new Level(LEVEL_LENGTH, this.groundY);
    this.cameraX = 0;
    this.gameData = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      multiplier: 1,
      progress: 0,
      grade: 'D'
    };
    this.ripples = [];
    this.shake = {
      active: false,
      duration: 0,
      maxDuration: 300,
      amplitude: 12,
      x: 0,
      y: 0
    };
    this.ui.hideResult();
    this.ui.setMultiplier(1);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      if (this.level) {
        this.level.groundY = this.groundY;
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === 'PLAYING' && !this.player.jumpPressed) {
          this.player.jumpPressed = true;
          this.player.handleJump();
        }
      }
      if (e.code === 'Enter') {
        e.preventDefault();
        if (this.state === 'MENU') {
          this.startGame();
        } else if (this.state === 'FINISHED') {
          this.restartGame();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.player.jumpPressed = false;
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.ui.setMouse(e.clientX - rect.left, e.clientY - rect.top);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.ui.setMouse(mx, my);

      if (this.state === 'MENU' && this.ui.isStartButtonHovered()) {
        this.startGame();
      } else if (this.state === 'FINISHED' && this.ui.isRestartButtonClicked(this.width, this.height)) {
        this.restartGame();
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.state === 'PLAYING') {
        this.player.handleJump();
      } else if (this.state === 'MENU') {
        this.startGame();
      } else if (this.state === 'FINISHED') {
        this.restartGame();
      }
    }, { passive: false });
  }

  private ensureAudio(): AudioContext {
    if (!this.audioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AC();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playBeatSound(): void {
    try {
      const ac = this.ensureAudio();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.8;

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ac.currentTime + 0.05);
      osc.frequency.exponentialRampToValueAtTime(660, ac.currentTime + 0.12);

      gain.gain.setValueAtTime(0.18, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);

      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.16);
    } catch (_e) { /* noop */ }
  }

  playHitSound(): void {
    try {
      const ac = this.ensureAudio();
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ac.currentTime + 0.25);

      gain.gain.setValueAtTime(0.3, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.32);
    } catch (_e) { /* noop */ }
  }

  private startGame(): void {
    this.initWorld();
    this.state = 'PLAYING';
  }

  private restartGame(): void {
    this.initWorld();
    this.state = 'PLAYING';
  }

  private addRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 5,
      maxRadius: 80,
      alpha: 1,
      life: 1
    });
  }

  private addShake(): void {
    this.shake.active = true;
    this.shake.duration = 300;
    this.shake.maxDuration = 300;
    this.shake.amplitude = 14;
  }

  private calcGrade(): ScoreGrade {
    const maxScore = TOTAL_BEAT_POINTS * 1000 * 5;
    const ratio = clamp(this.gameData.score / maxScore, 0, 1);
    if (ratio >= 0.92) return 'S';
    if (ratio >= 0.80) return 'A';
    if (ratio >= 0.65) return 'B';
    if (ratio >= 0.45) return 'C';
    return 'D';
  }

  private checkCollisions(): void {
    const playerRect = this.player.getRect();

    for (const bp of this.level.beatPoints) {
      if (bp.hit) continue;
      const br = {
        x: bp.x - 2,
        y: bp.y - 2,
        width: BEAT_POINT_SIZE + 4,
        height: BEAT_POINT_SIZE + 4
      };
      if (rectIntersect(playerRect, br) && this.player.vy > 0) {
        bp.hit = true;
        this.gameData.combo++;
        if (this.gameData.combo > this.gameData.maxCombo) {
          this.gameData.maxCombo = this.gameData.combo;
        }
        if (this.gameData.combo % 10 === 0 && this.gameData.combo >= 10) {
          const newLevel = Math.min(5, 1 + Math.floor(this.gameData.combo / 10));
          if (newLevel !== this.gameData.multiplier) {
            this.gameData.multiplier = newLevel;
            this.ui.setMultiplier(newLevel);
          }
          this.ui.triggerComboPulse();
        } else if (this.gameData.combo >= 10) {
          this.ui.triggerComboPulse();
        }
        const base = 100;
        this.gameData.score += Math.floor(base * this.gameData.multiplier);

        const cx = bp.x + BEAT_POINT_SIZE / 2;
        const cy = bp.y + BEAT_POINT_SIZE / 2;
        this.addRipple(cx, cy);
        this.level.spawnHitParticles(cx, cy);
        this.playBeatSound();
        this.player.vy = -9;
      }
    }

    for (const sp of this.level.spikes) {
      if (rectIntersect(playerRect, sp)) {
        this.gameData.combo = 0;
        this.gameData.multiplier = 1;
        this.ui.setMultiplier(1);
        this.addShake();
        this.playHitSound();
        const center = this.player.getCenter();
        this.level.spawnHitSpikeParticles(center.x, center.y);

        const safe = this.level.getNearestSafePoint(this.player.x);
        this.player.setRespawn(safe.x, safe.y - 60);
        this.player.respawn();
        break;
      }
    }
  }

  private updateGame(dt: number): void {
    const scaledDt = dt / this.fixedStep;

    this.level.update(scaledDt, this.width, this.height);
    this.player.update(scaledDt, this.groundY);
    this.ui.update(scaledDt);

    this.checkCollisions();

    const targetCam = clamp(this.player.x - this.width * 0.3, 0, this.level.width - this.width);
    this.cameraX = lerp(this.cameraX, targetCam, 0.08 * scaledDt);

    this.gameData.progress = clamp(this.player.x / this.level.width, 0, 1);

    this.ripples = this.ripples.filter(r => {
      r.radius += 3 * scaledDt;
      r.life -= 0.025 * scaledDt;
      r.alpha = Math.max(0, r.life);
      return r.life > 0 && r.radius < r.maxRadius;
    });

    if (this.shake.active) {
      this.shake.duration -= dt;
      const t = 1 - this.shake.duration / this.shake.maxDuration;
      const decayAmplitude = this.shake.amplitude * Math.pow(1 - t, 1.5);
      this.shake.x = (Math.random() - 0.5) * decayAmplitude * 2;
      this.shake.y = (Math.random() - 0.5) * decayAmplitude * 2;
      if (this.shake.duration <= 0) {
        this.shake.active = false;
        this.shake.x = 0;
        this.shake.y = 0;
      }
    }

    if (this.player.x >= this.level.width - 50) {
      this.finishGame();
    }
  }

  private finishGame(): void {
    if (this.state === 'FINISHED') return;
    this.state = 'FINISHED';
    this.gameData.grade = this.calcGrade();
    this.ui.showResult(this.gameData);
  }

  private renderRipples(): void {
    const ctx = this.ctx;
    for (const r of this.ripples) {
      const dx = r.x - this.cameraX;
      ctx.save();
      ctx.globalAlpha = r.alpha * 0.8;
      ctx.beginPath();
      ctx.arc(dx, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 15;
      ctx.stroke();
      if (r.radius > 20) {
        ctx.beginPath();
        ctx.arc(dx, r.y, r.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.shake.active) {
      ctx.translate(this.shake.x, this.shake.y);
    }

    if (this.level) {
      this.level.render(ctx, this.width, this.height, this.cameraX);
    }

    this.renderRipples();

    if (this.player) {
      this.player.render(ctx, this.cameraX);
    }

    ctx.restore();

    this.ui.render(ctx, this.gameData, this.state, this.width, this.height);
  }

  loop(now: number): void {
    const delta = now - this.lastFrame;
    this.lastFrame = now;
    const clampedDelta = Math.min(delta, 100);

    if (this.state === 'PLAYING') {
      this.accumulator += clampedDelta;
      while (this.accumulator >= this.fixedStep) {
        this.updateGame(this.fixedStep);
        this.accumulator -= this.fixedStep;
      }
    } else {
      this.ui.update(clampedDelta / this.fixedStep);
      if (this.level) {
        this.level.update(clampedDelta / this.fixedStep, this.width, this.height);
      }
    }

    this.render();
  }

  getGameData(): GameData {
    return this.gameData;
  }

  getState(): GameState {
    return this.state;
  }
}
