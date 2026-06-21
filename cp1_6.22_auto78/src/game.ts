import type { Direction } from './input';

export interface Penguin {
  x: number;
  y: number;
  width: number;
  height: number;
  facingLeft: boolean;
  swingTimer: number;
  jumpOffset: number;
  jumpTimer: number;
  isJumping: boolean;
  onIceFloeId: number | null;
}

export interface IceFloe {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  sinkOffset: number;
  sinkTimer: number;
  isSinking: boolean;
  sinkCount: number;
  speedX: number;
  opacity: number;
  hasFish: boolean;
}

export interface Fish {
  id: number;
  iceFloeId: number;
  x: number;
  y: number;
  scale: number;
  collectTimer: number;
  isCollected: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export type GameStatus = 'playing' | 'gameover' | 'victory';

export class Game {
  public readonly GAME_WIDTH = 800;
  public readonly GAME_HEIGHT = 600;
  public readonly PENGUIN_SPEED = 4;
  public readonly TARGET_SCORE = 10;
  public readonly MAX_ICE_FLOES = 8;
  public readonly ICE_SPAWN_INTERVAL = 5000;
  public readonly MAX_ENERGY = 15;
  public readonly WAVE_SPEED = 1.5 / 60;

  public penguin: Penguin;
  public iceFloes: IceFloe[];
  public fishes: Fish[];
  public particles: Particle[];
  public score: number;
  public level: number;
  public energy: number;
  public gameStatus: GameStatus;
  public wavePhase: number;

  private iceSpawnTimer: number;
  private nextIceFloeId: number;
  private nextFishId: number;
  private steppedIceFloes: Set<number>;

  constructor() {
    this.penguin = this.createPenguin();
    this.iceFloes = [];
    this.fishes = [];
    this.particles = [];
    this.score = 0;
    this.level = 1;
    this.energy = this.MAX_ENERGY;
    this.gameStatus = 'playing';
    this.wavePhase = 0;
    this.iceSpawnTimer = 0;
    this.nextIceFloeId = 1;
    this.nextFishId = 1;
    this.steppedIceFloes = new Set();
    this.initInitialIceFloes();
  }

  private createPenguin(): Penguin {
    return {
      x: 385,
      y: 275,
      width: 30,
      height: 50,
      facingLeft: false,
      swingTimer: 0,
      jumpOffset: 0,
      jumpTimer: 0,
      isJumping: false,
      onIceFloeId: null,
    };
  }

  private initInitialIceFloes(): void {
    const floe1 = this.createIceFloe(300, 300);
    this.iceFloes.push(floe1);
    const floe2 = this.createIceFloe(500, 220);
    this.iceFloes.push(floe2);
    const floe3 = this.createIceFloe(150, 400);
    this.iceFloes.push(floe3);
    for (const floe of this.iceFloes) {
      if (Math.random() > 0.3) {
        this.addFishToFloe(floe);
      }
    }
  }

  private createIceFloe(x: number, y: number): IceFloe {
    return {
      id: this.nextIceFloeId++,
      x,
      y,
      width: 120,
      height: 60,
      sinkOffset: 0,
      sinkTimer: 0,
      isSinking: false,
      sinkCount: 0,
      speedX: 0.3,
      opacity: 1,
      hasFish: false,
    };
  }

  private addFishToFloe(floe: IceFloe): void {
    if (floe.hasFish) return;
    floe.hasFish = true;
    this.fishes.push({
      id: this.nextFishId++,
      iceFloeId: floe.id,
      x: floe.x + floe.width / 2,
      y: floe.y + floe.height / 2 - 5,
      scale: 1,
      collectTimer: 0,
      isCollected: false,
    });
  }

  public update(deltaTime: number, direction: Direction, clampPos: (x: number, y: number) => { x: number; y: number }): void {
    if (this.gameStatus !== 'playing') return;

    this.wavePhase += this.WAVE_SPEED;
    this.updatePenguin(deltaTime, direction, clampPos);
    this.updateIceFloes(deltaTime);
    this.updateFishes(deltaTime);
    this.updateParticles(deltaTime);
    this.spawnIceFloes(deltaTime);
    this.checkCollisions();
    this.checkGameConditions();
  }

  private updatePenguin(deltaTime: number, direction: Direction, clampPos: (x: number, y: number) => { x: number; y: number }): void {
    const moveX = direction.x * this.PENGUIN_SPEED;
    const moveY = direction.y * this.PENGUIN_SPEED;

    if (direction.x !== 0) {
      this.penguin.facingLeft = direction.x < 0;
    }

    if (direction.x !== 0 || direction.y !== 0) {
      this.penguin.swingTimer += deltaTime;
      if (this.penguin.swingTimer >= 300) {
        this.penguin.swingTimer = 0;
      }
    }

    const newX = this.penguin.x + moveX;
    const newY = this.penguin.y + moveY;
    const clamped = clampPos(newX, newY);
    this.penguin.x = clamped.x;
    this.penguin.y = clamped.y;

    if (this.penguin.isJumping) {
      this.penguin.jumpTimer += deltaTime;
      const jumpDuration = 300;
      const t = Math.min(1, this.penguin.jumpTimer / jumpDuration);
      this.penguin.jumpOffset = Math.sin(t * Math.PI) * 15;
      if (this.penguin.jumpTimer >= jumpDuration) {
        this.penguin.isJumping = false;
        this.penguin.jumpTimer = 0;
        this.penguin.jumpOffset = 0;
      }
    }
  }

  private updateIceFloes(deltaTime: number): void {
    for (let i = this.iceFloes.length - 1; i >= 0; i--) {
      const floe = this.iceFloes[i];
      floe.x -= floe.speedX;

      if (floe.isSinking) {
        floe.sinkTimer += deltaTime;
        const sinkDuration = 400;
        const t = floe.sinkTimer / sinkDuration;

        if (t < 0.5) {
          const progress = t * 2;
          floe.sinkOffset = 10 * progress;
          floe.opacity = 1 - 0.5 * progress;
        } else if (t < 1) {
          const progress = (t - 0.5) * 2;
          floe.sinkOffset = 10 * (1 - progress);
          floe.opacity = 0.5 + 0.5 * progress;
        } else {
          floe.sinkOffset = 0;
          floe.opacity = 1;
          floe.isSinking = false;
          floe.sinkTimer = 0;
        }
      }

      if (floe.x + floe.width < 0 || floe.sinkCount >= 3) {
        this.iceFloes.splice(i, 1);
        this.removeFishesForFloe(floe.id);
        this.steppedIceFloes.delete(floe.id);
      }
    }
  }

  private removeFishesForFloe(floeId: number): void {
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      if (this.fishes[i].iceFloeId === floeId) {
        this.fishes.splice(i, 1);
      }
    }
  }

  private updateFishes(deltaTime: number): void {
    for (let i = this.fishes.length - 1; i >= 0; i--) {
      const fish = this.fishes[i];
      const floe = this.iceFloes.find(f => f.id === fish.iceFloeId);
      if (floe) {
        fish.x = floe.x + floe.width / 2;
        fish.y = floe.y + floe.height / 2 - 5 + floe.sinkOffset;
      }

      if (fish.isCollected) {
        fish.collectTimer += deltaTime;
        fish.scale = Math.max(0, 1 - fish.collectTimer / 500);
        if (fish.collectTimer >= 500) {
          this.fishes.splice(i, 1);
        }
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnIceFloes(deltaTime: number): void {
    this.iceSpawnTimer += deltaTime;
    if (this.iceSpawnTimer >= this.ICE_SPAWN_INTERVAL && this.iceFloes.length < this.MAX_ICE_FLOES) {
      this.iceSpawnTimer = 0;
      const y = 200 + Math.random() * 300;
      const floe = this.createIceFloe(this.GAME_WIDTH + 60, y);
      this.iceFloes.push(floe);
      if (Math.random() > 0.3) {
        this.addFishToFloe(floe);
      }
    }
  }

  private checkCollisions(): void {
    this.penguin.onIceFloeId = null;

    for (const floe of this.iceFloes) {
      if (this.isPenguinOnIce(floe)) {
        this.penguin.onIceFloeId = floe.id;

        if (!this.steppedIceFloes.has(floe.id)) {
          this.steppedIceFloes.add(floe.id);
          this.triggerIceSink(floe);
          this.triggerPenguinJump();
          this.energy = Math.max(0, this.energy - 1);
          floe.sinkCount++;

          setTimeout(() => {
            this.steppedIceFloes.delete(floe.id);
          }, 500);
        }
        break;
      }
    }

    for (const fish of this.fishes) {
      if (!fish.isCollected && this.isPenguinOnFish(fish)) {
        this.collectFish(fish);
      }
    }
  }

  private isPenguinOnIce(floe: IceFloe): boolean {
    const px = this.penguin.x + this.penguin.width / 2;
    const py = this.penguin.y + this.penguin.height;
    const floeCenterX = floe.x + floe.width / 2;
    const floeCenterY = floe.y + floe.height / 2 + floe.sinkOffset;
    const rx = floe.width / 2;
    const ry = floe.height / 2;

    const dx = (px - floeCenterX) / rx;
    const dy = (py - floeCenterY) / ry;
    return (dx * dx + dy * dy <= 1) && py >= floe.y + floe.sinkOffset;
  }

  private isPenguinOnFish(fish: Fish): boolean {
    const px = this.penguin.x + this.penguin.width / 2;
    const py = this.penguin.y + this.penguin.height / 2;
    const distance = Math.sqrt((px - fish.x) ** 2 + (py - fish.y) ** 2);
    return distance < 30;
  }

  private triggerIceSink(floe: IceFloe): void {
    floe.isSinking = true;
    floe.sinkTimer = 0;
  }

  private triggerPenguinJump(): void {
    this.penguin.isJumping = true;
    this.penguin.jumpTimer = 0;
    this.penguin.jumpOffset = 0;
  }

  private collectFish(fish: Fish): void {
    fish.isCollected = true;
    fish.collectTimer = 0;
    this.score++;
    const floe = this.iceFloes.find(f => f.id === fish.iceFloeId);
    if (floe) {
      floe.hasFish = false;
    }
    this.spawnCollectParticles(fish.x, fish.y);
  }

  private spawnCollectParticles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const speed = 0.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500,
        maxLife: 500,
      });
    }
  }

  private checkGameConditions(): void {
    if (this.energy <= 0) {
      this.gameStatus = 'gameover';
    }
    if (this.score >= this.TARGET_SCORE) {
      this.gameStatus = 'victory';
    }
  }

  public reset(): void {
    this.penguin = this.createPenguin();
    this.iceFloes = [];
    this.fishes = [];
    this.particles = [];
    this.score = 0;
    this.level = 1;
    this.energy = this.MAX_ENERGY;
    this.gameStatus = 'playing';
    this.wavePhase = 0;
    this.iceSpawnTimer = 0;
    this.steppedIceFloes = new Set();
    this.initInitialIceFloes();
  }

  public nextLevel(): void {
    this.level++;
    this.score = 0;
    this.energy = this.MAX_ENERGY;
    this.penguin = this.createPenguin();
    this.iceFloes = [];
    this.fishes = [];
    this.particles = [];
    this.gameStatus = 'playing';
    this.steppedIceFloes = new Set();
    this.initInitialIceFloes();
  }
}
