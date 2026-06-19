import { MusicAnalyzer, BeatEvent } from './MusicAnalyzer';
import { ObstacleGenerator, Obstacle } from './ObstacleGenerator';
import { ScoreManager, HitQuality, GameResult, ScoreState } from './ScoreManager';

export type PlayerState = 'running' | 'jumping' | 'sliding';

export interface Player {
  y: number;
  vy: number;
  state: PlayerState;
  scaleX: number;
  scaleY: number;
  scaleTimer: number;
  scaleDuration: number;
  targetScaleX: number;
  targetScaleY: number;
  baseScaleX: number;
  baseScaleY: number;
}

export type GameState = 'idle' | 'playing' | 'paused' | 'ended';

export interface EngineFrameState {
  gameState: GameState;
  player: Player;
  obstacles: Obstacle[];
  score: ScoreState;
  currentTime: number;
  currentBeat: BeatEvent | null;
  lastBeat: BeatEvent | null;
  flash: number;
  flashColor: string;
  screenShake: number;
  comboPulse: number;
  result: GameResult | null;
  perfectFlash: number;
  crashFlash: number;
  crashParticles: CrashParticle[];
}

export interface CrashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

type StateListener = (state: EngineFrameState) => void;

const GRAVITY = -30;
const JUMP_VELOCITY = 11;
const GROUND_Y = 0;
const LOW_OBSTACLE_HEIGHT = 0.6;
const HIGH_OBSTACLE_HEIGHT = 0.5;
const HIGH_OBSTACLE_Y = 1.2;
const PLAYER_HEIGHT = 1.0;
const PLAYER_WIDTH = 0.6;
const PERFECT_WINDOW = 150;
const HIT_WINDOW = 350;

export class GameEngine {
  private music: MusicAnalyzer;
  private obstacles: ObstacleGenerator;
  private score: ScoreManager;
  private rafId: number = 0;
  private lastFrameTime: number = 0;
  private listeners: Set<StateListener> = new Set();
  private player: Player;
  private gameState: GameState = 'idle';
  private currentTime: number = 0;
  private lastBeat: BeatEvent | null = null;
  private currentBeat: BeatEvent | null = null;
  private beatUnsubscribe: (() => void) | null = null;
  private endUnsubscribe: (() => void) | null = null;
  private flash: number = 0;
  private flashColor: string = '#ffffff';
  private screenShake: number = 0;
  private comboPulse: number = 0;
  private perfectFlash: number = 0;
  private crashFlash: number = 0;
  private crashParticles: CrashParticle[] = [];
  private processedBeats: Set<number> = new Set();
  private result: GameResult | null = null;
  private keysDown: Set<string> = new Set();
  private beatInputWindow: Map<number, { used: boolean; expected: 'jump' | 'slide' | null }> = new Map();

  constructor() {
    this.music = new MusicAnalyzer();
    this.obstacles = new ObstacleGenerator();
    this.score = new ScoreManager();
    this.player = this.createInitialPlayer();
  }

  private createInitialPlayer(): Player {
    return {
      y: GROUND_Y,
      vy: 0,
      state: 'running',
      scaleX: 1,
      scaleY: 1,
      scaleTimer: 0,
      scaleDuration: 0,
      targetScaleX: 1,
      targetScaleY: 1,
      baseScaleX: 1,
      baseScaleY: 1,
    };
  }

  async init(): Promise<void> {
    await this.music.load();
    this.obstacles.setBeatTimes(this.music.getBeatTimes());
    this.beatUnsubscribe = this.music.onBeat((beat) => this.handleBeat(beat));
    this.endUnsubscribe = this.music.onEnd(() => this.endGame());
  }

  getMusic(): MusicAnalyzer {
    return this.music;
  }

  getScoreManager(): ScoreManager {
    return this.score;
  }

  getState(): GameState {
    return this.gameState;
  }

  onFrame(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(): void {
    if (this.gameState === 'playing') return;
    this.reset();
    this.gameState = 'playing';
    this.music.play();
    this.lastFrameTime = performance.now();
    this.loop();
  }

  pause(): void {
    if (this.gameState !== 'playing') return;
    this.gameState = 'paused';
    this.music.pause();
    cancelAnimationFrame(this.rafId);
  }

  resume(): void {
    if (this.gameState !== 'paused') return;
    this.gameState = 'playing';
    this.music.play();
    this.lastFrameTime = performance.now();
    this.loop();
  }

  reset(): void {
    cancelAnimationFrame(this.rafId);
    this.player = this.createInitialPlayer();
    this.score.reset();
    this.obstacles.reset();
    this.currentTime = 0;
    this.lastBeat = null;
    this.currentBeat = null;
    this.flash = 0;
    this.screenShake = 0;
    this.comboPulse = 0;
    this.perfectFlash = 0;
    this.crashFlash = 0;
    this.crashParticles = [];
    this.processedBeats.clear();
    this.beatInputWindow.clear();
    this.result = null;
    this.gameState = 'idle';
  }

  private endGame(): void {
    if (this.gameState === 'ended') return;
    this.gameState = 'ended';
    this.result = this.score.getResult();
    this.score.saveBest();
    cancelAnimationFrame(this.rafId);
  }

  private handleBeat(beat: BeatEvent): void {
    this.lastBeat = this.currentBeat;
    this.currentBeat = beat;
    this.flash = 0.25;
    if (beat.isStrong) {
      this.screenShake = 0.1;
    }
    const obsList = this.obstacles.getObstacles();
    const obstacle = obsList.find((o) => o.beatIndex === beat.index);
    this.beatInputWindow.set(beat.index, {
      used: false,
      expected: obstacle ? (obstacle.type === 'low' ? 'jump' : 'slide') : null,
    });
  }

  handleKeyDown(key: string): void {
    if (this.gameState !== 'playing') return;
    if (this.keysDown.has(key)) return;
    this.keysDown.add(key);
    if (key === ' ') {
      this.performJump();
    } else if (key.toLowerCase() === 's') {
      this.performSlide();
    }
  }

  handleKeyUp(key: string): void {
    this.keysDown.delete(key);
    if (key.toLowerCase() === 's') {
      this.endSlide();
    }
  }

  private performJump(): void {
    if (this.player.state === 'sliding') this.endSlide();
    if (this.player.y > GROUND_Y + 0.05) return;
    this.player.state = 'jumping';
    this.player.vy = JUMP_VELOCITY;
    this.player.scaleY = 1.3;
    this.player.scaleX = 0.85;
    this.player.targetScaleY = 1;
    this.player.targetScaleX = 1;
    this.player.scaleDuration = 0.15;
    this.player.scaleTimer = 0;
    this.evaluateAction('jump');
  }

  private performSlide(): void {
    if (this.player.state === 'sliding') return;
    this.player.state = 'sliding';
    this.player.scaleX = 1.5;
    this.player.scaleY = 0.6;
    this.player.targetScaleX = 1;
    this.player.targetScaleY = 1;
    this.player.scaleDuration = 0.2;
    this.player.scaleTimer = 0;
    this.evaluateAction('slide');
  }

  private endSlide(): void {
    if (this.player.state !== 'sliding') return;
    this.player.state = 'running';
    this.player.scaleX = 1;
    this.player.scaleY = 1;
  }

  private evaluateAction(action: 'jump' | 'slide'): void {
    const currentTime = this.currentTime;
    const beatInfo = this.music.isNearBeat(currentTime, HIT_WINDOW);
    if (!beatInfo.near || !beatInfo.beat) return;
    const beatIdx = beatInfo.beat.index;
    const window = this.beatInputWindow.get(beatIdx);
    if (!window || window.used) return;
    window.used = true;
    const obstacle = this.obstacles.getObstacles().find((o) => o.beatIndex === beatIdx);
    if (!obstacle) return;
    const expected = obstacle.type === 'low' ? 'jump' : 'slide';
    if (action !== expected) return;
    obstacle.passed = true;
    if (this.processedBeats.has(beatIdx)) return;
    this.processedBeats.add(beatIdx);
    const isPerfect = beatInfo.diff <= PERFECT_WINDOW;
    const quality: HitQuality = isPerfect ? 'perfect' : 'normal';
    this.score.registerHit(quality);
    this.comboPulse = 0.3;
    if (isPerfect) {
      this.perfectFlash = 0.5;
    }
  }

  private checkCollision(obstacle: Obstacle): boolean {
    const playerBottom = this.player.y;
    const playerTop = this.player.y + PLAYER_HEIGHT * this.player.scaleY;
    const playerLeft = 3;
    const playerRight = 3 + PLAYER_WIDTH * this.player.scaleX;
    const obsX = 3 - (this.currentTime - obstacle.position) * 8;
    if (obsX + 0.6 < playerLeft || obsX > playerRight) return false;
    if (obstacle.type === 'low') {
      const obsBottom = GROUND_Y;
      const obsTop = LOW_OBSTACLE_HEIGHT;
      return playerBottom < obsTop && playerTop > obsBottom;
    } else {
      const obsBottom = HIGH_OBSTACLE_Y - HIGH_OBSTACLE_HEIGHT / 2;
      const obsTop = HIGH_OBSTACLE_Y + HIGH_OBSTACLE_HEIGHT / 2;
      return playerBottom < obsTop && playerTop > obsBottom;
    }
  }

  private spawnCrashParticles(): void {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.crashParticles.push({
        x: 3,
        y: this.player.y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 2,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
        color: ['#ff3355', '#ff8844', '#ffcc44'][Math.floor(Math.random() * 3)],
        size: 4 + Math.random() * 6,
      });
    }
  }

  private loop = (): void => {
    if (this.gameState !== 'playing') return;
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.033);
    this.lastFrameTime = now;
    this.update(dt);
    this.emit();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.currentTime = this.music.getCurrentTime();
    this.obstacles.update(this.currentTime);
    this.player.vy += GRAVITY * dt;
    this.player.y += this.player.vy * dt;
    if (this.player.y <= GROUND_Y) {
      this.player.y = GROUND_Y;
      this.player.vy = 0;
      if (this.player.state === 'jumping') {
        this.player.state = 'running';
      }
    }
    if (this.player.scaleDuration > 0) {
      this.player.scaleTimer += dt;
      const t = Math.min(this.player.scaleTimer / this.player.scaleDuration, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);
      this.player.scaleX = this.easeScale(this.player.scaleX, this.player.targetScaleX, easeOut);
      this.player.scaleY = this.easeScale(this.player.scaleY, this.player.targetScaleY, easeOut);
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2);
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 2);
    if (this.comboPulse > 0) this.comboPulse = Math.max(0, this.comboPulse - dt);
    if (this.perfectFlash > 0) this.perfectFlash = Math.max(0, this.perfectFlash - dt * 2);
    if (this.crashFlash > 0) this.crashFlash = Math.max(0, this.crashFlash - dt * 1.5);
    this.crashParticles = this.crashParticles.filter((p) => {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 8 * dt;
      return p.life < p.maxLife;
    });
    const obsList = this.obstacles.getObstacles();
    for (const obstacle of obsList) {
      if (obstacle.hit || obstacle.passed) continue;
      if (this.checkCollision(obstacle)) {
        obstacle.hit = true;
        this.score.breakCombo();
        this.crashFlash = 0.8;
        this.spawnCrashParticles();
        this.endGame();
        return;
      }
      const timeSince = this.currentTime - obstacle.position;
      if (!obstacle.passed && timeSince > 0.4) {
        obstacle.passed = true;
        if (!this.processedBeats.has(obstacle.beatIndex)) {
          this.processedBeats.add(obstacle.beatIndex);
          this.score.registerHit('miss');
        }
      }
    }
  }

  private easeScale(current: number, target: number, t: number): number {
    return current + (target - current) * t;
  }

  private emit(): void {
    const state: EngineFrameState = {
      gameState: this.gameState,
      player: { ...this.player },
      obstacles: this.obstacles.getObstacles().map((o) => ({ ...o })),
      score: this.score.getState(),
      currentTime: this.currentTime,
      currentBeat: this.currentBeat,
      lastBeat: this.lastBeat,
      flash: this.flash,
      flashColor: this.flashColor,
      screenShake: this.screenShake,
      comboPulse: this.comboPulse,
      result: this.result,
      perfectFlash: this.perfectFlash,
      crashFlash: this.crashFlash,
      crashParticles: this.crashParticles.map((p) => ({ ...p })),
    };
    this.listeners.forEach((l) => l(state));
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    if (this.beatUnsubscribe) this.beatUnsubscribe();
    if (this.endUnsubscribe) this.endUnsubscribe();
    this.music.destroy();
    this.obstacles.destroy();
    this.score.destroy();
    this.listeners.clear();
    this.keysDown.clear();
    this.processedBeats.clear();
    this.beatInputWindow.clear();
    this.crashParticles = [];
  }
}
