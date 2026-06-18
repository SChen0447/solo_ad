import { Particle, ParticleType, Rule, PARTICLE_TYPES } from './particle';
import {
  RuleMatrix,
  createDefaultRuleMatrix,
  cloneRuleMatrix,
  computeForces,
  indexToType
} from './ruleEngine';
import {
  initUI,
  updateStats,
  renderRuleMatrix,
  showToast,
  UIHandlers
} from './ui';

const MAX_PARTICLES = 5000;
const PERF_MODE_THRESHOLD = 2000;
const FPS_WARN_THRESHOLD = 30;
const FOLLOW_DISABLE_THRESHOLD = 5000;

interface SceneConfigV1 {
  version: 1;
  rules: string[][];
  particles: Array<{
    type: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }>;
}

class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;

  private particles: Particle[] = [];
  private ruleMatrix: RuleMatrix;

  private rafId: number = 0;
  private lastFrameTime: number = 0;
  private fpsSmoothed: number = 60;
  private framesInSecond: number = 0;
  private fpsAccumulator: number = 0;

  private perfMode: boolean = false;
  private fpsLow: boolean = false;
  private lastStatsUpdate: number = 0;
  private readonly statsUpdateInterval: number = 250;

  constructor() {
    this.ruleMatrix = createDefaultRuleMatrix();

    const handlers: UIHandlers = {
      onPlaceParticle: (x, y, type) => this.placeParticle(x, y, type),
      onRuleChange: (s, t, rule) => this.setRule(s, t, rule),
      onClearAll: () => this.clearAll(),
      onResetRules: () => this.resetRules(),
      onSaveConfig: () => this.saveConfig(),
      onLoadConfig: (json) => this.loadConfig(json)
    };

    const uiData = initUI(handlers);
    this.canvas = uiData.canvas;

    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => this._resize());
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this._loop);
  }

  private readonly _loop = (now: number): void => {
    const dt = Math.min(48, now - this.lastFrameTime);
    this.lastFrameTime = now;

    this.framesInSecond++;
    this.fpsAccumulator += dt;
    if (this.fpsAccumulator >= 1000) {
      const instFps = (this.framesInSecond * 1000) / this.fpsAccumulator;
      this.fpsSmoothed = this.fpsSmoothed * 0.6 + instFps * 0.4;
      this.framesInSecond = 0;
      this.fpsAccumulator = 0;
    }

    const activeCount = this.particles.filter(p => !p.dying).length;
    const totalCount = this.particles.length;

    this.perfMode = totalCount > PERF_MODE_THRESHOLD;
    this.fpsLow = this.fpsSmoothed < FPS_WARN_THRESHOLD;
    const followEnabled = totalCount < FOLLOW_DISABLE_THRESHOLD;

    this._update(dt, now, followEnabled);
    this._render(now);

    if (now - this.lastStatsUpdate > this.statsUpdateInterval) {
      this.lastStatsUpdate = now;
      let avgSpeed = 0;
      if (activeCount > 0) {
        let sum = 0;
        for (let i = 0; i < this.particles.length; i++) {
          const p = this.particles[i];
          if (p.dying) continue;
          sum += p.getSpeed();
        }
        avgSpeed = sum / Math.max(1, activeCount);
      }
      updateStats(totalCount, this.fpsSmoothed, avgSpeed, this.perfMode, this.fpsLow);
    }

    void activeCount;
    this.rafId = requestAnimationFrame(this._loop);
  };

  private _update(dt: number, now: number, followEnabled: boolean): void {
    const bounds = { w: this.width, h: this.height };

    if (this.particles.length > 0) {
      const forces = computeForces(this.particles, this.ruleMatrix, bounds, followEnabled);
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const f = forces[i];
        p.update(dt, f.fx, f.fy, bounds, now);
      }
    }

    if (this.particles.some(p => p.isDead(now))) {
      this.particles = this.particles.filter(p => !p.isDead(now));
    }
  }

  private _render(now: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.perfMode) {
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = 'rgba(10, 10, 26, 0.32)';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const showTrail = !this.perfMode && this.particles.length <= PERF_MODE_THRESHOLD;
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx, this.perfMode, now, showTrail);
    }
  }

  private _resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.width = w;
    this.height = h;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public placeParticle(x: number, y: number, type: ParticleType): void {
    if (this.particles.length >= MAX_PARTICLES) {
      showToast(`已达到最大粒子数 (${MAX_PARTICLES})`, true);
      return;
    }
    const p = new Particle(type, x, y, performance.now());
    this.particles.push(p);
  }

  public setRule(subject: number, target: number, rule: Rule): void {
    if (!this.ruleMatrix[subject]) return;
    this.ruleMatrix[subject][target] = rule;
  }

  public clearAll(): void {
    const now = performance.now();
    if (this.particles.length === 0) {
      showToast('场景中没有粒子');
      return;
    }
    let dying = 0;
    for (const p of this.particles) {
      if (!p.dying) {
        p.startDying(now);
        dying++;
      }
    }
    showToast(`清除 ${dying} 个粒子...`);
  }

  public resetRules(): void {
    this.ruleMatrix = createDefaultRuleMatrix();
    for (const p of this.particles) {
      if (!p.dying) {
        p.vx *= 0.1;
        p.vy *= 0.1;
      }
    }
    renderRuleMatrix(this.ruleMatrix);
  }

  public saveConfig(): string {
    const cfg: SceneConfigV1 = {
      version: 1,
      rules: cloneRuleMatrix(this.ruleMatrix) as unknown as string[][],
      particles: this.particles
        .filter(p => !p.dying)
        .map(p => ({
          type: p.type,
          x: Math.round(p.x * 100) / 100,
          y: Math.round(p.y * 100) / 100,
          vx: Math.round(p.vx * 100) / 100,
          vy: Math.round(p.vy * 100) / 100
        }))
    };
    return JSON.stringify(cfg);
  }

  public loadConfig(json: string): boolean {
    try {
      const data = JSON.parse(json) as SceneConfigV1;
      if (!data || data.version !== 1 || !Array.isArray(data.rules) || !Array.isArray(data.particles)) {
        return false;
      }
      const n = PARTICLE_TYPES.length;
      if (data.rules.length !== n) return false;
      for (let i = 0; i < n; i++) {
        if (!Array.isArray(data.rules[i]) || data.rules[i].length !== n) return false;
        for (let j = 0; j < n; j++) {
          const r = data.rules[i][j];
          if (r !== 'attract' && r !== 'repel' && r !== 'follow' && r !== 'ignore') return false;
        }
      }
      this.ruleMatrix = data.rules as unknown as RuleMatrix;
      renderRuleMatrix(this.ruleMatrix);

      const now = performance.now();
      this.particles = [];
      for (const entry of data.particles) {
        if (!entry) continue;
        const typeIdx = PARTICLE_TYPES.indexOf(entry.type as ParticleType);
        if (typeIdx < 0) continue;
        const type = indexToType(typeIdx);
        const x = Math.max(0, Math.min(this.width, Number(entry.x) || 0));
        const y = Math.max(0, Math.min(this.height, Number(entry.y) || 0));
        const p = new Particle(type, x, y, now);
        p.vx = Number(entry.vx) || 0;
        p.vy = Number(entry.vy) || 0;
        this.particles.push(p);
      }
      return true;
    } catch (e) {
      console.warn('loadConfig error:', e);
      return false;
    }
  }

  public destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

let game: Game | null = null;

function boot(): void {
  try {
    game = new Game();
    game.start();
  } catch (e) {
    console.error('Game boot failed:', e);
    document.body.innerHTML =
      '<div style="color:#ff6b6b;padding:40px;font-family:monospace;">' +
      '游戏启动失败: ' + (e as Error).message +
      '</div>';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
