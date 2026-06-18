import type { NoteData, Ripple, Particle, LevelData, NoteColor } from './types';
import { NOTE_FILL, NOTE_GLOW } from './types';
import { NoteEngine, type JudgmentResult } from './NoteEngine';
import { ScoreBoard } from './ScoreBoard';
import { AudioEngine } from './AudioEngine';
import { useGameStore } from './store';

export interface AppCallbacks {
  onReady?: () => void;
}

export class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private noteEngine: NoteEngine;
  private scoreBoard: ScoreBoard;
  private audioEngine: AudioEngine;

  private rafId: number | null = null;
  private lastFrame: number = 0;
  private startTime: number = 0;
  private countdownStart: number = 0;
  private fpsAccum: number = 0;
  private fpsFrames: number = 0;
  private fpsTimer: number = 0;

  private level: LevelData;
  private ripples: Ripple[] = [];
  private particles: Particle[] = [];
  private rippleId: number = 0;
  private particleId: number = 0;
  private missFlashAlpha: number = 0;
  private judgmentPopups: Array<{ text: string; x: number; y: number; alpha: number; startTime: number; color: string; scale: number }> = [];

  private dpr: number = 1;
  private hoverResetBtn: boolean = false;
  private hoverStartBtn: boolean = false;

  constructor(canvas: HTMLCanvasElement, level: LevelData) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
    this.level = level;
    this.noteEngine = new NoteEngine();
    this.scoreBoard = new ScoreBoard(canvas);
    this.audioEngine = new AudioEngine();
    this.init();
  }

  private init(): void {
    this.resize();
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    useGameStore.setState({ phase: 'idle', levelDuration: this.level.duration });
  }

  private resize = (): void => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.noteEngine.setViewport(w, h);
    this.noteEngine.setLevelDuration(this.level.duration);
  };

  start(): void {
    if (this.rafId !== null) return;
    this.resetLevelState();
    useGameStore.setState({ phase: 'countdown', countdownValue: 3 });
    this.countdownStart = performance.now();
    this.lastFrame = performance.now();
    this.loop();
  }

  private resetLevelState(): void {
    for (const n of this.level.notes) {
      n.hit = false;
      n.judged = false;
    }
    this.ripples = [];
    this.particles = [];
    this.judgmentPopups = [];
    this.missFlashAlpha = 0;
    useGameStore.getState().resetScore();
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    this.updateFPS(dt, now);
    this.updatePhase(dt, now);
    this.updateEffects(dt, now);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private updateFPS(dt: number, now: number): void {
    this.fpsAccum += dt;
    this.fpsFrames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      const fps = this.fpsFrames / this.fpsAccum;
      useGameStore.getState().setFps(fps);
      const target = fps < 45 ? 50 : 100;
      if (target !== useGameStore.getState().particleCount) {
        useGameStore.getState().setParticleCount(target);
      }
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      this.fpsTimer = 0;
    }
  }

  private updatePhase(dt: number, now: number): void {
    const state = useGameStore.getState();
    if (state.phase === 'countdown') {
      const elapsed = (now - this.countdownStart) / 1000;
      const remaining = 3 - elapsed;
      if (remaining <= 0) {
        useGameStore.setState({ phase: 'playing', countdownValue: 0 });
        this.startTime = now;
      } else {
        const v = Math.ceil(remaining);
        if (v !== state.countdownValue) {
          useGameStore.setState({ countdownValue: v });
        }
      }
    } else if (state.phase === 'playing') {
      const currentTime = now - this.startTime;
      useGameStore.getState().setCurrentTime(currentTime);
      this.checkAutoMiss(currentTime);
      if (currentTime >= this.level.duration + 2000) {
        useGameStore.setState({ phase: 'finished' });
      }
    }
  }

  private checkAutoMiss(currentTime: number): void {
    for (const n of this.level.notes) {
      if (this.noteEngine.checkAutoMiss(n, currentTime)) {
        n.judged = true;
        n.hit = false;
        useGameStore.getState().addMiss();
        this.spawnMissEffect(this.noteEngine.getJudgeX(), this.noteEngine.getTrackY());
        this.audioEngine.playMiss();
        this.addPopup('MISS', this.noteEngine.getJudgeX(), this.noteEngine.getTrackY() - 60, '#888888');
        this.missFlashAlpha = 0.5;
      }
    }
  }

  private updateEffects(dt: number, now: number): void {
    this.ripples = this.ripples.filter(r => {
      const t = (now - r.startTime) / 1000;
      const dur = r.type === 'perfect' ? 0.8 : 0.6;
      const p = Math.min(1, t / dur);
      r.radius = r.maxRadius * p;
      r.alpha = 1 - p;
      return p < 1;
    });

    const maxParticles = useGameStore.getState().particleCount;
    this.particles = this.particles.slice(0, maxParticles).filter(p => {
      const t = (now - p.startTime) / 1000;
      if (t > 0.9) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.alpha = Math.max(0, 1 - t / 0.9);
      return true;
    });

    this.judgmentPopups = this.judgmentPopups.filter(pop => {
      const t = (now - pop.startTime) / 1000;
      if (t > 0.9) return false;
      pop.y -= 60 * dt;
      pop.alpha = Math.max(0, 1 - t / 0.9);
      pop.scale = 1 + 0.15 * Math.sin(t * Math.PI * 2);
      return true;
    });

    if (this.missFlashAlpha > 0) {
      this.missFlashAlpha = Math.max(0, this.missFlashAlpha - dt * 2);
    }
  }

  private onPointerDown = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const state = useGameStore.getState();

    if (state.phase === 'idle' || state.phase === 'finished') {
      if (this.hitStartBtn(x, y)) {
        this.start();
        return;
      }
    }

    if (state.phase === 'playing' || state.phase === 'idle' || state.phase === 'finished') {
      if (this.hitResetBtn(x, y)) {
        this.resetLevelState();
        useGameStore.setState({ phase: 'idle', countdownValue: 3 });
        return;
      }
    }

    if (state.phase !== 'playing') return;

    const currentTime = performance.now() - this.startTime;
    const note = this.noteEngine.findClosestNote(this.level.notes, x, y, currentTime);

    if (note) {
      this.processHit(note, x, y, currentTime);
    } else {
      this.processEmptyClick(x, y);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.hoverResetBtn = this.hitResetBtn(x, y);
    this.hoverStartBtn = this.hitStartBtn(x, y);
  };

  private hitResetBtn(x: number, y: number): boolean {
    const s = Math.max(0.75, this.canvas.width / this.dpr / 1920);
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    const bw = 140 * s;
    const bh = 48 * s;
    const bx = W - bw - 24 * s;
    const by = 24 * s;
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  }

  private hitStartBtn(x: number, y: number): boolean {
    const s = Math.max(0.75, this.canvas.width / this.dpr / 1920);
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    const bw = 200 * s;
    const bh = 64 * s;
    const bx = (W - bw) / 2;
    const by = H * 0.62;
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  }

  private processHit(note: NoteData, clickX: number, clickY: number, clickTime: number): void {
    note.judged = true;
    note.hit = true;
    const result: JudgmentResult = this.noteEngine.judgeHit(note, clickTime);

    if (result.judgment === 'perfect') {
      useGameStore.getState().addPerfect();
      this.spawnRipples(clickX, clickY, result, 'perfect');
      this.addPopup('PERFECT', clickX, clickY - 50, result.color);
    } else if (result.judgment === 'good') {
      useGameStore.getState().addGood();
      this.spawnRipples(clickX, clickY, result, 'good');
      this.addPopup('GOOD', clickX, clickY - 50, result.color);
    } else {
      useGameStore.getState().addMiss();
      note.hit = false;
      this.spawnMissEffect(clickX, clickY);
      this.addPopup('MISS', clickX, clickY - 50, '#888888');
      this.missFlashAlpha = 0.5;
    }

    this.audioEngine.trigger(note.color, result.judgment);
  }

  private processEmptyClick(x: number, y: number): void {
    this.missFlashAlpha = 0.15;
  }

  private spawnRipples(x: number, y: number, res: JudgmentResult, type: 'perfect' | 'good'): void {
    const count = res.rippleCount;
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      this.ripples.push({
        id: this.rippleId++,
        x,
        y,
        type,
        radius: 0,
        maxRadius: res.rippleRadius * (1 - i * 0.15),
        alpha: 1,
        startTime: now - i * 80
      });
    }
  }

  private spawnMissEffect(x: number, y: number): void {
    const now = performance.now();
    const count = 24;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 120 + Math.random() * 180;
      this.particles.push({
        id: this.particleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        alpha: 1,
        size: 3 + Math.random() * 5,
        startTime: now
      });
    }
  }

  private addPopup(text: string, x: number, y: number, color: string): void {
    this.judgmentPopups.push({
      text,
      x,
      y,
      alpha: 1,
      startTime: performance.now(),
      color,
      scale: 1
    });
  }

  private render(): void {
    const state = useGameStore.getState();
    this.renderBackground();
    this.renderTrack();
    this.renderJudgeZone();
    if (state.phase === 'playing' || state.phase === 'countdown' || state.phase === 'finished') {
      this.renderNotes(state.currentTime);
    }
    this.renderRipples();
    this.renderParticles();
    this.renderMissFlash();
    this.renderPopups();
    this.scoreBoard.render(1 / 60);
    this.renderControls(state.phase);
    if (state.phase === 'countdown') {
      this.renderCountdown();
    }
    if (state.phase === 'finished') {
      this.renderFinished();
    }
    this.renderFPS(state.fps);
  }

  private renderBackground(): void {
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * 0.8);
    grad.addColorStop(0, '#0d1b3e');
    grad.addColorStop(0.5, '#060d22');
    grad.addColorStop(1, '#02040a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = 'rgba(60, 120, 200, 0.06)';
    ctx.lineWidth = 1;
    const grid = 50;
    for (let x = 0; x < W; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderTrack(): void {
    const ctx = this.ctx;
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    const cx = W / 2;
    const cy = this.noteEngine.getTrackY();
    const trackH = this.noteEngine.getTrackHeight();
    const halfH = trackH / 2;
    const s = Math.max(0.75, W / 1920);

    const grad = ctx.createLinearGradient(0, cy - halfH, 0, cy + halfH);
    grad.addColorStop(0, 'rgba(60, 160, 255, 0)');
    grad.addColorStop(0.3, 'rgba(60, 160, 255, 0.18)');
    grad.addColorStop(0.5, 'rgba(100, 200, 255, 0.3)');
    grad.addColorStop(0.7, 'rgba(60, 160, 255, 0.18)');
    grad.addColorStop(1, 'rgba(60, 160, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, cy - halfH, W, trackH);

    ctx.strokeStyle = 'rgba(120, 200, 255, 0.35)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(0, cy - halfH + 1);
    ctx.lineTo(W, cy - halfH + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, cy + halfH - 1);
    ctx.lineTo(W, cy + halfH - 1);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(150, 220, 255, 0.5)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
  }

  private renderJudgeZone(): void {
    const ctx = this.ctx;
    const W = this.canvas.width / this.dpr;
    const cy = this.noteEngine.getTrackY();
    const trackH = this.noteEngine.getTrackHeight();
    const jx = this.noteEngine.getJudgeX();
    const jw = this.noteEngine.getJudgeZoneWidth();
    const halfW = jw / 2;
    const s = Math.max(0.75, W / 1920);

    const grad = ctx.createLinearGradient(jx - halfW, 0, jx + halfW, 0);
    grad.addColorStop(0, 'rgba(100, 220, 255, 0)');
    grad.addColorStop(0.45, 'rgba(100, 220, 255, 0.25)');
    grad.addColorStop(0.5, 'rgba(180, 240, 255, 0.55)');
    grad.addColorStop(0.55, 'rgba(100, 220, 255, 0.25)');
    grad.addColorStop(1, 'rgba(100, 220, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(jx - halfW, cy - trackH / 2 - 20 * s, jw, trackH + 40 * s);

    ctx.save();
    ctx.shadowColor = 'rgba(100, 220, 255, 0.7)';
    ctx.shadowBlur = 20 * s;
    ctx.strokeStyle = 'rgba(200, 245, 255, 0.9)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(jx, cy - trackH / 2 - 20 * s);
    ctx.lineTo(jx, cy + trackH / 2 + 20 * s);
    ctx.stroke();
    ctx.restore();
  }

  private renderNotes(currentTime: number): void {
    const ctx = this.ctx;
    const W = this.canvas.width / this.dpr;
    const cy = this.noteEngine.getTrackY();
    const radius = this.noteEngine.getNoteRadius();
    const s = Math.max(0.75, W / 1920);

    for (const n of this.level.notes) {
      if (n.judged && n.hit) continue;
      const x = this.noteEngine.getNoteX(n, currentTime);
      if (x < -radius * 2 || x > W + radius * 2) continue;

      const inZone = this.noteEngine.isInJudgeZone(n, currentTime);
      const color: NoteColor = n.color;

      ctx.save();
      if (inZone) {
        ctx.shadowColor = NOTE_GLOW[color];
        ctx.shadowBlur = 25 * s;
      } else {
        ctx.shadowColor = NOTE_GLOW[color];
        ctx.shadowBlur = 10 * s;
      }

      const grad = ctx.createRadialGradient(x, cy, radius * 0.1, x, cy, radius);
      grad.addColorStop(0, this.lighten(NOTE_FILL[color], 0.4));
      grad.addColorStop(0.6, NOTE_FILL[color]);
      grad.addColorStop(1, this.darken(NOTE_FILL[color], 0.3));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      if (inZone) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.arc(x, cy, radius + 3 * s, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.arc(x, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(x - radius * 0.3, cy - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderRipples(): void {
    const ctx = this.ctx;
    const W = this.canvas.width / this.dpr;
    const s = Math.max(0.75, W / 1920);
    for (const r of this.ripples) {
      const color = r.type === 'perfect' ? '#ffd700' : '#4fc3f7';
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.alpha);
      ctx.strokeStyle = color;
      ctx.lineWidth = (r.type === 'perfect' ? 4 : 3) * s;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20 * s;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = '#a8a8a8';
      ctx.shadowColor = 'rgba(150, 150, 150, 0.5)';
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  private renderMissFlash(): void {
    if (this.missFlashAlpha <= 0) return;
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.missFlashAlpha * 0.3;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  private renderPopups(): void {
    const ctx = this.ctx;
    const W = this.canvas.width / this.dpr;
    const s = Math.max(0.75, W / 1920);
    for (const pop of this.judgmentPopups) {
      ctx.save();
      ctx.globalAlpha = pop.alpha;
      ctx.translate(pop.x, pop.y);
      ctx.scale(pop.scale, pop.scale);
      ctx.font = `700 ${28 * s}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = pop.color;
      ctx.shadowColor = pop.color;
      ctx.shadowBlur = 16 * s;
      ctx.fillText(pop.text, 0, 0);
      ctx.restore();
    }
  }

  private renderCountdown(): void {
    const ctx = this.ctx;
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    const s = Math.max(0.75, W / 1920);
    const state = useGameStore.getState();
    const v = state.countdownValue;
    const elapsed = (performance.now() - this.countdownStart) / 1000;
    const segStart = 3 - v;
    const t = (elapsed - segStart) / 1;
    const clampedT = Math.max(0, Math.min(1, t));
    const scale = 0.3 + clampedT * 1.2;
    const alpha = 1 - Math.pow(clampedT, 2);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.font = `900 ${200 * s}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(100, 220, 255, 0.9)';
    ctx.shadowBlur = 50 * s;
    ctx.fillText(v.toString(), 0, 0);
    ctx.restore();
  }

  private renderControls(phase: string): void {
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    const s = Math.max(0.75, W / 1920);
    const ctx = this.ctx;

    const rw = 140 * s, rh = 48 * s;
    const rx = W - rw - 24 * s, ry = 24 * s;
    this.drawButton(rx, ry, rw, rh, 'RESET', this.hoverResetBtn, s);

    if (phase === 'idle' || phase === 'finished') {
      const bw = 200 * s, bh = 64 * s;
      const bx = (W - bw) / 2, by = H * 0.62;
      this.drawButton(bx, by, bw, bh, phase === 'finished' ? 'REPLAY' : 'START', this.hoverStartBtn, s, true);
    }

    if (phase === 'idle') {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${42 * s}px 'Segoe UI', sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(100, 200, 255, 0.6)';
      ctx.shadowBlur = 20 * s;
      ctx.fillText('RHYTHM TRACK EDITOR', W / 2, H * 0.42);
      ctx.font = `${20 * s}px 'Segoe UI', sans-serif`;
      ctx.fillStyle = 'rgba(200, 220, 255, 0.85)';
      ctx.shadowBlur = 0;
      ctx.fillText('点击 START 开始游戏，在判定区点击音符获取高分', W / 2, H * 0.5);
      ctx.fillText('PERFECT ±150ms  +10    GOOD ±300ms  +5    MISS 不扣分', W / 2, H * 0.55);
      ctx.restore();
    }
  }

  private drawButton(x: number, y: number, w: number, h: number, label: string, hover: boolean, s: number, big: boolean = false): void {
    const ctx = this.ctx;
    const r = 12 * s;
    ctx.save();
    ctx.shadowColor = hover ? 'rgba(120, 220, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = hover ? 20 * s : 10 * s;
    ctx.fillStyle = hover ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = hover ? 'rgba(200, 240, 255, 0.9)' : 'rgba(200, 220, 255, 0.4)';
    ctx.lineWidth = (big ? 2 : 1.5) * s;
    this.roundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${(big ? 22 : 16) * s}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = hover ? '#ffffff' : 'rgba(220, 235, 255, 0.9)';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.restore();
  }

  private renderFinished(): void {
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    const s = Math.max(0.75, W / 1920);
    const ctx = this.ctx;
    const state = useGameStore.getState();

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const bw = 520 * s, bh = 380 * s;
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    const r = 20 * s;

    ctx.save();
    ctx.shadowColor = 'rgba(100, 220, 255, 0.3)';
    ctx.shadowBlur = 30 * s;
    ctx.fillStyle = 'rgba(15, 25, 50, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2 * s;
    this.roundRect(ctx, bx, by, bw, bh, r);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const acc = state.total > 0 ? (state.hits / state.total) * 100 : 100;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `600 ${36 * s}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(100, 220, 255, 0.6)';
    ctx.shadowBlur = 20 * s;
    ctx.fillText('RESULT', bx + bw / 2, by + 30 * s);
    ctx.shadowBlur = 0;
    ctx.font = `${20 * s}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(200, 220, 255, 0.9)';
    const items = [
      `Score:  ${state.score}`,
      `Perfect:  ${state.perfectCount}`,
      `Good:  ${state.goodCount}`,
      `Miss:  ${state.missCount}`,
      `Max Combo:  ${state.maxCombo}`,
      `Accuracy:  ${acc.toFixed(1)}%`
    ];
    items.forEach((t, i) => {
      ctx.fillText(t, bx + bw / 2, by + 100 * s + i * 38 * s);
    });
    ctx.restore();
  }

  private renderFPS(fps: number): void {
    const W = this.canvas.width / this.dpr;
    const s = Math.max(0.75, W / 1920);
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `${12 * s}px 'Consolas', monospace`;
    ctx.fillStyle = fps < 45 ? '#ff6b6b' : fps < 55 ? '#ffa502' : '#2ed573';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS ${fps.toFixed(0)}`, W - 24 * s, 80 * s);
    ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
    ctx.fillText(`Particles ${useGameStore.getState().particleCount}`, W - 24 * s, 98 * s);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private lighten(hex: string, amt: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.round(r + (255 - r) * amt)}, ${Math.round(g + (255 - g) * amt)}, ${Math.round(b + (255 - b) * amt)})`;
  }

  private darken(hex: string, amt: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.round(r * (1 - amt))}, ${Math.round(g * (1 - amt))}, ${Math.round(b * (1 - amt))})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    const n = h.length === 3
      ? h.split('').map(c => parseInt(c + c, 16))
      : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    return { r: n[0], g: n[1], b: n[2] };
  }
}
