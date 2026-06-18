import type { Ball, Particle, MissEffect, ScorePopup } from './renders';
import type { BeatPoint } from './audio';
import type { SwordDirection } from './input';

export enum GameState {
  MENU = 'menu',
  LOADING = 'loading',
  PLAYING = 'playing',
  GAME_OVER = 'game_over'
}

const COLOR_CONFIGS = [
  { color: '#ff3366', direction: 'right' },
  { color: '#ff9933', direction: 'left' },
  { color: '#ffee33', direction: 'down' },
  { color: '#33ff66', direction: 'up' },
  { color: '#33ffcc', direction: 'right' },
  { color: '#3399ff', direction: 'left' },
  { color: '#9933ff', direction: 'down' },
  { color: '#ff33cc', direction: 'up' },
  { color: '#ff6699', direction: 'right' },
  { color: '#66ffcc', direction: 'left' }
];

export class GameManager {
  private canvas: HTMLCanvasElement;
  private state: GameState = GameState.MENU;
  private balls: Ball[] = [];
  private particles: Particle[] = [];
  private missEffects: MissEffect[] = [];
  private scorePopups: ScorePopup[] = [];
  private beatPoints: BeatPoint[] = [];
  private nextBeatIndex: number = 0;
  private score: number = 0;
  private combo: number = 0;
  private missCount: number = 0;
  private maxMissCount: number = 5;
  private bpm: number = 120;
  private ballIdCounter: number = 0;
  private maxBalls: number = 20;
  private currentTime: number = 0;
  private lastFrameTime: number = 0;
  private gameStartTime: number = 0;
  private pulseIntensity: number = 0;
  private lastPulseTime: number = -1;
  private scoreAnimation: number = 0;
  private comboAnimation: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  getState(): GameState {
    return this.state;
  }

  setState(state: GameState): void {
    this.state = state;
  }

  setBeatPoints(beatPoints: BeatPoint[], bpm: number): void {
    this.beatPoints = beatPoints;
    this.bpm = bpm;
    this.nextBeatIndex = 0;
  }

  start(): void {
    this.state = GameState.PLAYING;
    this.balls = [];
    this.particles = [];
    this.missEffects = [];
    this.scorePopups = [];
    this.score = 0;
    this.combo = 0;
    this.missCount = 0;
    this.nextBeatIndex = 0;
    this.gameStartTime = performance.now();
    this.lastFrameTime = this.gameStartTime;
    this.currentTime = 0;
  }

  reset(): void {
    this.balls = [];
    this.particles = [];
    this.missEffects = [];
    this.scorePopups = [];
    this.score = 0;
    this.combo = 0;
    this.missCount = 0;
    this.nextBeatIndex = 0;
    this.currentTime = 0;
  }

  update(deltaTime: number, audioTime: number, swordDirection: SwordDirection, swordSegment: { x1: number; y1: number; x2: number; y2: number } | null): void {
    const now = performance.now();
    this.currentTime = audioTime;

    this.pulseIntensity = Math.max(0, this.pulseIntensity - deltaTime * 3);
    this.scoreAnimation = Math.max(0, this.scoreAnimation - deltaTime * 4);
    this.comboAnimation = Math.max(0, this.comboAnimation - deltaTime * 4);

    if (this.state === GameState.PLAYING) {
      this.spawnBallsForCurrentBeat();
      this.updateBalls(deltaTime);
      this.checkCollisions(swordDirection, swordSegment);
      this.checkMisses();
      this.checkGameOver();
    }

    this.updateParticles(deltaTime);
    this.cleanupEffects(now);

    this.lastFrameTime = now;
  }

  private spawnBallsForCurrentBeat(): void {
    const spawnAheadTime = this.getFlightDuration();
    
    while (
      this.nextBeatIndex < this.beatPoints.length &&
      this.beatPoints[this.nextBeatIndex].time <= this.currentTime + spawnAheadTime &&
      this.balls.length < this.maxBalls
    ) {
      const beat = this.beatPoints[this.nextBeatIndex];
      const timeOffset = beat.time - this.currentTime;
      
      if (timeOffset > 0) {
        this.spawnBall(beat.time, beat.strength);
      }
      this.nextBeatIndex++;
    }
  }

  private getFlightDuration(): number {
    const baseDuration = 2.5;
    const bpmFactor = Math.min(2, Math.max(0.5, 120 / this.bpm));
    return baseDuration * bpmFactor;
  }

  private spawnBall(beatTime: number, _strength: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    const colorConfig = COLOR_CONFIGS[Math.floor(Math.random() * COLOR_CONFIGS.length)];
    const startX = Math.random() * (width - 100) + 50;
    const startY = -50;
    const targetX = Math.random() * (width - 200) + 100;
    const targetY = height - 100;
    
    const duration = this.getFlightDuration() * 1000;
    const startTime = performance.now() + (beatTime - this.currentTime) * 1000 - duration;

    const ball: Ball = {
      id: this.ballIdCounter++,
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      startTime,
      duration,
      radius: 30,
      color: colorConfig.color,
      requiredDirection: colorConfig.direction,
      sliced: false,
      sliceTime: 0
    };

    this.balls.push(ball);
  }

  private updateBalls(_deltaTime: number): void {
    const now = performance.now();

    for (const ball of this.balls) {
      if (ball.sliced) continue;

      const elapsed = now - ball.startTime;
      const progress = Math.min(1, elapsed / ball.duration);

      ball.x = this.lerp(ball.startX, ball.targetX, progress);
      
      const peakHeight = Math.min(ball.startY, ball.targetY) - 150;
      ball.y = this.quadraticBezier(ball.startY, peakHeight, ball.targetY, progress);
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private quadraticBezier(p0: number, p1: number, p2: number, t: number): number {
    const mt = 1 - t;
    return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
  }

  private checkCollisions(swordDirection: SwordDirection, swordSegment: { x1: number; y1: number; x2: number; y2: number } | null): void {
    if (!swordSegment) return;

    for (const ball of this.balls) {
      if (ball.sliced) continue;

      const distance = this.pointToSegmentDistance(
        ball.x, ball.y,
        swordSegment.x1, swordSegment.y1,
        swordSegment.x2, swordSegment.y2
      );

      const hitThreshold = ball.radius * 0.8;
      
      if (distance < hitThreshold) {
        const directionMatch = swordDirection.direction === ball.requiredDirection || swordDirection.direction === 'none';
        
        if (directionMatch && swordDirection.speed > 0.1) {
          this.sliceBall(ball, swordDirection.direction);
        }
      }
    }
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
  }

  private sliceBall(ball: Ball, direction: string): void {
    ball.sliced = true;
    ball.sliceTime = performance.now();
    ball.sliceDirection = direction;

    this.combo++;
    const points = this.calculateScore(this.combo);
    this.score += points;

    this.scoreAnimation = 1;
    this.comboAnimation = 1;
    void performance.now();

    this.scorePopups.push({
      x: ball.x,
      y: ball.y,
      score: points,
      time: performance.now()
    });

    this.createSliceParticles(ball.x, ball.y, ball.color);

    this.triggerPulse();
  }

  calculateScore(combo: number): number {
    if (combo >= 4) return 200;
    if (combo === 3) return 150;
    if (combo === 2) return 120;
    return 100;
  }

  private createSliceParticles(x: number, y: number, color: string): void {
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = Math.random() * 5 + 3;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1000,
        maxLife: 1000,
        color,
        size: Math.random() * 5 + 3
      });
    }
  }

  private triggerPulse(): void {
    this.pulseIntensity = 1;
    this.lastPulseTime = performance.now();
  }

  checkPulseForBeat(currentAudioTime: number): void {
    if (this.lastPulseTime >= 0) return;

    for (const beat of this.beatPoints) {
      const timeDiff = Math.abs(beat.time - currentAudioTime);
      if (timeDiff < 0.05) {
        this.pulseIntensity = beat.strength;
        break;
      }
    }
  }

  private checkMisses(): void {
    const now = performance.now();
    const height = this.canvas.height;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      
      if (ball.sliced) {
        if (now - ball.sliceTime > 500) {
          this.balls.splice(i, 1);
        }
        continue;
      }

      const elapsed = now - ball.startTime;
      if (elapsed >= ball.duration) {
        this.missEffects.push({
          x: ball.x,
          y: Math.min(ball.y, height - 50),
          time: now
        });

        this.balls.splice(i, 1);
        this.missCount++;
        this.combo = 0;
      }
    }
  }

  private checkGameOver(): void {
    if (this.missCount >= this.maxMissCount) {
      this.state = GameState.GAME_OVER;
    }
  }

  private updateParticles(deltaTime: number): void {
    const dt = deltaTime * 1000;
    const gravity = 0.01;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.x += p.vx;
      p.y += p.vy;
      p.vy += gravity * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private cleanupEffects(now: number): void {
    this.missEffects = this.missEffects.filter(e => now - e.time < 800);
    this.scorePopups = this.scorePopups.filter(p => now - p.time < 1000);
  }

  gameOver(): void {
    this.state = GameState.GAME_OVER;
  }

  getBalls(): Ball[] {
    return this.balls;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getMissEffects(): MissEffect[] {
    return this.missEffects;
  }

  getScorePopups(): ScorePopup[] {
    return this.scorePopups;
  }

  getScore(): number {
    return this.score;
  }

  getCombo(): number {
    return this.combo;
  }

  getMissCount(): number {
    return this.missCount;
  }

  getPulseIntensity(): number {
    return this.pulseIntensity;
  }

  getScoreAnimation(): number {
    return this.scoreAnimation;
  }

  getComboAnimation(): number {
    return this.comboAnimation;
  }

  getBPM(): number {
    return this.bpm;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  isAudioEnded(audioDuration: number): boolean {
    return this.currentTime >= audioDuration - 0.1;
  }
}
