import { GameState, Particle, randomTrailColor } from './types';

export interface KeysState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export class Player {
  private keys: KeysState = { up: false, down: false, left: false, right: false };
  private canvasWidth: number;
  private canvasHeight: number;
  private particles: Particle[] = [];
  private trailAccumulator: number = 0;
  private readonly MAX_PARTICLES = 200;
  private readonly PLAYER_RADIUS = 12;
  private readonly BASE_SPEED = 280;
  private readonly SPEED_GROWTH_PER_SEC = 8;
  private readonly MAX_SPEED_MULT = 3.0;
  private readonly TRAIL_EMIT_INTERVAL = 0.016;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public initState(): GameState['player'] {
    return {
      x: this.canvasWidth * 0.2,
      y: this.canvasHeight * 0.5,
      radius: this.PLAYER_RADIUS,
      speed: this.BASE_SPEED,
      baseSpeed: this.BASE_SPEED,
      speedMultiplier: 1.0,
      isSlowed: false,
      slowTimer: 0,
      slowDuration: 1.0,
      flashCount: 0,
      flashTimer: 0,
      flashInterval: 0.2,
      isVisible: true,
      borderAlpha: 0
    };
  }

  public setKeys(keys: KeysState): void {
    this.keys = { ...keys };
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public clearParticles(): void {
    this.particles = [];
  }

  public update(
    dt: number,
    playerState: GameState['player'],
    totalTime: number,
    scrollSpeed: number
  ): void {
    const moveSpeed = 350 * dt;

    if (this.keys.left) {
      playerState.x -= moveSpeed;
    }
    if (this.keys.right) {
      playerState.x += moveSpeed;
    }
    if (this.keys.up) {
      playerState.y -= moveSpeed;
    }
    if (this.keys.down) {
      playerState.y += moveSpeed;
    }

    const margin = 30;
    playerState.x = Math.max(margin, Math.min(this.canvasWidth - margin, playerState.x));
    playerState.y = Math.max(margin + 60, Math.min(this.canvasHeight - margin - 30, playerState.y));

    const growthMult = 1.0 + Math.min(totalTime * this.SPEED_GROWTH_PER_SEC / this.BASE_SPEED, this.MAX_SPEED_MULT - 1.0);
    playerState.speedMultiplier = growthMult;
    const slowMult = playerState.isSlowed ? 0.5 : 1.0;
    playerState.speed = playerState.baseSpeed * growthMult * slowMult;

    if (playerState.isSlowed) {
      playerState.slowTimer -= dt;
      playerState.borderAlpha = Math.max(0, Math.min(0.5, playerState.slowTimer / playerState.slowDuration * 0.5));
      if (playerState.slowTimer <= 0) {
        playerState.isSlowed = false;
        playerState.borderAlpha = 0;
        playerState.flashCount = 0;
        playerState.isVisible = true;
      } else {
        playerState.flashTimer -= dt;
        if (playerState.flashTimer <= 0) {
          playerState.isVisible = !playerState.isVisible;
          playerState.flashCount++;
          playerState.flashTimer = playerState.flashInterval;
        }
      }
    } else {
      playerState.isVisible = true;
      playerState.borderAlpha = 0;
    }

    this.trailAccumulator += dt;
    const isMoving = this.keys.up || this.keys.down || this.keys.left || this.keys.right;
    if (this.trailAccumulator >= this.TRAIL_EMIT_INTERVAL) {
      this.trailAccumulator = 0;
      if (isMoving || Math.random() < 0.5) {
        this.emitTrailParticle(playerState, scrollSpeed);
      }
    }

    this.updateParticles(dt);
  }

  private emitTrailParticle(playerState: GameState['player'], scrollSpeed: number): void {
    if (this.particles.length >= this.MAX_PARTICLES) {
      this.particles.shift();
    }
    const size = 5 + Math.random() * 5;
    this.particles.push({
      x: playerState.x + (Math.random() - 0.5) * 8,
      y: playerState.y + (Math.random() - 0.5) * 8,
      vx: -scrollSpeed * (0.3 + Math.random() * 0.4) + (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 30,
      size,
      color: randomTrailColor(),
      life: 0.5,
      maxLife: 0.5
    });
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  public triggerHit(playerState: GameState['player']): void {
    if (!playerState.isSlowed) {
      playerState.isSlowed = true;
      playerState.slowTimer = playerState.slowDuration;
      playerState.flashCount = 0;
      playerState.flashTimer = 0;
      playerState.isVisible = false;
      playerState.borderAlpha = 0.5;
    }
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
