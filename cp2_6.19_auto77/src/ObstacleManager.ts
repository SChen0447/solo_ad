export type ObstacleType = 'spike' | 'wall' | 'bar';
export type CoinType = 'normal' | 'beat';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  spawnTime: number;
  warningProgress: number;
  active: boolean;
  passed: boolean;
}

export interface Coin {
  id: number;
  type: CoinType;
  x: number;
  y: number;
  radius: number;
  spawnTime: number;
  collected: boolean;
  beatCoin: boolean;
  beatIndex: number;
}

export interface ScorePopup {
  id: number;
  value: number;
  x: number;
  y: number;
  spawnTime: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface WarningCircle {
  id: number;
  x: number;
  y: number;
  spawnTime: number;
  duration: number;
  color: string;
}

export interface PlayerHitResult {
  gameOver: boolean;
  collectedCoin: Coin | null;
  hitObstacle: Obstacle | null;
}

let _nextId = 1;
const getNextId = (): number => _nextId++;

export class ObstacleManager {
  public obstacles: Obstacle[] = [];
  public coins: Coin[] = [];
  public scorePopups: ScorePopup[] = [];
  public particles: Particle[] = [];
  public warningCircles: WarningCircle[] = [];

  private groundY: number;
  private lastBeatIndex = -1;
  private baseSpeed = 300;
  private currentSpeed = 300;
  private laneY: number;

  private maxParticles = 50;

  constructor(groundY: number, laneY: number) {
    this.groundY = groundY;
    this.laneY = laneY;
  }

  public setMaxParticles(n: number): void {
    this.maxParticles = n;
  }

  public setSpeed(s: number): void {
    this.currentSpeed = s;
  }

  public getSpeed(): number {
    return this.currentSpeed;
  }

  public setGroundY(y: number): void {
    this.groundY = y;
  }

  public setLaneY(y: number): void {
    this.laneY = y;
  }

  public reset(): void {
    this.obstacles = [];
    this.coins = [];
    this.scorePopups = [];
    this.particles = [];
    this.warningCircles = [];
    this.lastBeatIndex = -1;
    this.currentSpeed = this.baseSpeed;
  }

  public onPreBeat(_beatIndex: number, _time: number): void {
  }

  public onBeat(beatIndex: number, _time: number): void {
    if (beatIndex <= this.lastBeatIndex) return;
    this.lastBeatIndex = beatIndex;

    const canvasWidth = 1200;
    const spawnX = canvasWidth + 80;

    const difficulty = Math.min(1, beatIndex / 60);

    const obstacleChance = 0.55 + difficulty * 0.2;
    const beatCoinChance = 0.15;
    const normalCoinChance = 0.3;

    const coinYPositions: { type: ObstacleType; weight: number }[] = [
      { type: 'spike', weight: 0.4 },
      { type: 'wall', weight: 0.35 },
      { type: 'bar', weight: 0.25 }
    ];

    const r = Math.random();

    if (r < obstacleChance) {
      const rand = Math.random();
      let cumulative = 0;
      let selectedType: ObstacleType = 'spike';
      for (const entry of coinYPositions) {
        cumulative += entry.weight;
        if (rand < cumulative) {
          selectedType = entry.type;
          break;
        }
      }
      this.spawnObstacle(selectedType, spawnX);
      this.spawnWarningCircle(spawnX, selectedType);
    } else if (r < obstacleChance + beatCoinChance) {
      this.spawnCoin('beat', spawnX, beatIndex);
      this.spawnWarningCircle(spawnX, 'coin');
    } else if (r < obstacleChance + beatCoinChance + normalCoinChance) {
      this.spawnCoin('normal', spawnX, beatIndex);
      this.spawnWarningCircle(spawnX, 'coin');
    }

    if (Math.random() < 0.2) {
      this.spawnCoin('normal', spawnX + 100, beatIndex);
    }
  }

  private spawnWarningCircle(x: number, kind: 'spike' | 'wall' | 'bar' | 'coin'): void {
    let y = this.groundY - 30;
    let color = '#ff3333';
    if (kind === 'coin') {
      y = this.groundY - 60;
      color = '#ffaa00';
    } else if (kind === 'bar') {
      y = this.groundY - 90;
    } else if (kind === 'wall') {
      y = this.groundY - 45;
    }

    this.warningCircles.push({
      id: getNextId(),
      x,
      y,
      spawnTime: performance.now() / 1000,
      duration: 0.3,
      color
    });
  }

  private spawnObstacle(type: ObstacleType, x: number): void {
    let y = 0;
    let w = 0;
    let h = 0;

    switch (type) {
      case 'spike':
        w = 40;
        h = 40;
        y = this.groundY - h;
        break;
      case 'wall':
        w = 50;
        h = 60;
        y = this.groundY - h;
        break;
      case 'bar':
        w = 70;
        h = 20;
        y = this.groundY - 90;
        break;
    }

    this.obstacles.push({
      id: getNextId(),
      type,
      x,
      y,
      width: w,
      height: h,
      spawnTime: performance.now() / 1000,
      warningProgress: 0,
      active: true,
      passed: false
    });
  }

  private spawnCoin(type: CoinType, x: number, beatIndex: number): void {
    const y = this.groundY - 70;
    this.coins.push({
      id: getNextId(),
      type,
      x,
      y,
      radius: type === 'beat' ? 18 : 14,
      spawnTime: performance.now() / 1000,
      collected: false,
      beatCoin: type === 'beat',
      beatIndex
    });
  }

  public spawnScorePopup(value: number, x: number, y: number): void {
    this.scorePopups.push({
      id: getNextId(),
      value,
      x,
      y,
      spawnTime: performance.now() / 1000
    });
  }

  public spawnParticles(x: number, y: number, color: string, count: number): void {
    const actualCount = Math.min(count, this.maxParticles - this.particles.length);
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        id: getNextId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.6,
        maxLife: 0.6,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  public update(dt: number, playerHitbox: { x: number; y: number; w: number; h: number }, now: number): PlayerHitResult {
    const speed = this.currentSpeed;
    let result: PlayerHitResult = {
      gameOver: false,
      collectedCoin: null,
      hitObstacle: null
    };

    for (const obs of this.obstacles) {
      obs.x -= speed * dt;
      if (obs.active && !obs.passed && obs.x + obs.width < playerHitbox.x) {
        obs.passed = true;
      }
      if (obs.active && this.rectIntersect(playerHitbox, { x: obs.x, y: obs.y, w: obs.width, h: obs.height })) {
        obs.active = false;
        if (obs.type === 'spike') {
          result.gameOver = true;
          result.hitObstacle = obs;
        } else if (obs.type === 'wall') {
          if (playerHitbox.y + playerHitbox.h > obs.y) {
            result.gameOver = true;
            result.hitObstacle = obs;
          }
        } else if (obs.type === 'bar') {
          if (playerHitbox.y < obs.y + obs.height) {
            result.gameOver = true;
            result.hitObstacle = obs;
          }
        }
      }
    }

    for (const coin of this.coins) {
      coin.x -= speed * dt;
      if (!coin.collected) {
        const dx = (playerHitbox.x + playerHitbox.w / 2) - coin.x;
        const dy = (playerHitbox.y + playerHitbox.h / 2) - coin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < coin.radius + Math.min(playerHitbox.w, playerHitbox.h) / 2) {
          coin.collected = true;
          result.collectedCoin = coin;
          const value = coin.type === 'beat' ? 50 : 10;
          this.spawnScorePopup(value, coin.x, coin.y);
          this.spawnParticles(coin.x, coin.y, coin.type === 'beat' ? '#aa55ff' : '#ffdd00', coin.type === 'beat' ? 20 : 10);
        }
      }
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
    }

    for (const pop of this.scorePopups) {
      pop.y -= 40 * dt;
    }

    const cutoffX = -200;
    this.obstacles = this.obstacles.filter((o) => o.x > cutoffX);
    this.coins = this.coins.filter((c) => c.x > cutoffX);
    this.particles = this.particles.filter((p) => p.life > 0);
    this.scorePopups = this.scorePopups.filter((p) => now - p.spawnTime < 0.5);
    this.warningCircles = this.warningCircles.filter((w) => now - w.spawnTime < w.duration + 0.1);

    return result;
  }

  private rectIntersect(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number }
  ): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  public getDifficultyFactor(): number {
    return Math.min(1, this.lastBeatIndex / 60);
  }
}
